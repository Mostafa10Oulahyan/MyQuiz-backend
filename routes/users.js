const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretquizkey';

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login (by email only)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'User not found' });
        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                avatar_url: user.avatar_url, 
                hint_points: user.hint_points,
                role: user.role
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// HINT SYSTEM — connected to hint_usage table
// ══════════════════════════════════════════════════════════════

// Update Hint Points (generic +/- endpoint)
router.put('/points', verifyToken, async (req, res) => {
    try {
        const { points_diff } = req.body;

        const [rows] = await pool.query('SELECT hint_points FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        let currentPoints = rows[0].hint_points;
        let newPoints = currentPoints + points_diff;
        if (newPoints < 0) newPoints = 0;

        await pool.query('UPDATE users SET hint_points = ? WHERE id = ?', [newPoints, req.user.id]);

        res.json({ message: 'Points updated', new_points: newPoints });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Use Hint — logs to hint_usage table & deducts from hint_points
router.post('/hint', verifyToken, async (req, res) => {
    try {
        const { question_id } = req.body;
        const userId = req.user.id;

        // 1. Get hint_cost from question
        const [questions] = await pool.query('SELECT hint_cost FROM questions WHERE id = ?', [question_id]);
        if (questions.length === 0) return res.status(404).json({ message: 'Question not found' });
        const hintCost = questions[0].hint_cost || 10;

        // 2. Check user has enough points
        const [users] = await pool.query('SELECT hint_points FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        if (users[0].hint_points < hintCost) {
            return res.status(400).json({ message: 'Not enough hint points', required: hintCost, available: users[0].hint_points });
        }

        // 3. Log to hint_usage
        await pool.query(
            'INSERT INTO hint_usage (user_id, question_id, points_spent) VALUES (?, ?, ?)',
            [userId, question_id, hintCost]
        );

        // 4. Deduct from user hint_points
        await pool.query('UPDATE users SET hint_points = hint_points - ? WHERE id = ?', [hintCost, userId]);

        const [updated] = await pool.query('SELECT hint_points FROM users WHERE id = ?', [userId]);

        res.json({
            message: 'Hint used',
            points_spent: hintCost,
            hint_points: updated[0].hint_points
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// SCORE — connected to user_scores + quiz_attempts tables
// ══════════════════════════════════════════════════════════════

router.post('/score', verifyToken, async (req, res) => {
    try {
        const { category_name, score, time_spent, total_questions } = req.body;
        const userId = req.user.id;
        const totalQ = total_questions || 10;

        // 1. Get Category
        const [categories] = await pool.query('SELECT id FROM categories WHERE name = ?', [category_name]);
        if (categories.length === 0) return res.status(400).json({ message: 'Category not found' });
        const categoryId = categories[0].id;

        const finalScore = (score / totalQ) * 10;
        const points_earned = score * 100;
        const time_added = parseInt(time_spent) || 0;

        // 2. Get previous best score for this category
        const [prevScore] = await pool.query(
            'SELECT points FROM user_scores WHERE user_id = ? AND category_id = ?',
            [userId, categoryId]
        );

        const old_points = prevScore.length > 0 ? prevScore[0].points : 0;
        const points_diff = Math.max(0, points_earned - old_points);

        // 3. Update/Insert User Scores (Keep Best) → user_scores table
        await pool.query(`
            INSERT INTO user_scores (user_id, category_id, score, total_questions, points, time_spent) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                score = IF(VALUES(score) > score, VALUES(score), score),
                total_questions = IF(VALUES(score) > score, VALUES(total_questions), total_questions),
                points = IF(VALUES(score) > score, VALUES(points), points),
                time_spent = IF(VALUES(score) > score, VALUES(time_spent), time_spent),
                completed_at = CURRENT_TIMESTAMP
        `, [userId, categoryId, finalScore, totalQ, points_earned, time_added]);

        // 4. Log the Attempt → quiz_attempts table
        await pool.query(`
            INSERT INTO quiz_attempts (user_id, category_id, score, total_questions, points, time_spent)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, categoryId, finalScore, totalQ, points_earned, time_added]);

        // 5. DO NOT update hint_points — it's only for hints (deducted via POST /hint)

        res.json({
            message: 'Score enregistré avec succès',
            points_earned,
            points_added: points_diff
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// PROFILE & STATS
// ══════════════════════════════════════════════════════════════

router.get('/stats', verifyToken, async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                IFNULL(SUM(points), 0) as total_points,
                IFNULL(MAX(score), 0) as best_score,
                COUNT(*) as total_quizzes
            FROM user_scores 
            WHERE user_id = ?
        `, [req.user.id]);

        const [hints] = await pool.query('SELECT hint_points FROM users WHERE id = ?', [req.user.id]);

        res.json({
            ...stats[0],
            hint_points: hints[0]?.hint_points || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/attempts', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                qa.*, 
                c.display_name as category_name,
                c.icon as category_icon,
                c.color as category_color
            FROM quiz_attempts qa
            JOIN categories c ON qa.category_id = c.id
            WHERE qa.user_id = ?
            ORDER BY qa.attempted_at DESC
            LIMIT 100
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { username, avatar_url } = req.body;

        if (username) {
            const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
            if (existing.length > 0) return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
        }

        await pool.query(
            'UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
            [username || null, avatar_url || null, req.user.id]
        );

        const [updated] = await pool.query('SELECT id, username, email, avatar_url, hint_points FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Profil mis à jour', user: updated[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// LEADERBOARD — reads from user_scores table
// ══════════════════════════════════════════════════════════════

router.get('/leaderboard', async (req, res) => {
    try {
        const { group } = req.query;
        let query;
        let params = [];

        if (group && group !== 'all') {
            query = `
                SELECT 
                    u.id, u.username, u.avatar_url,
                    us_group.total_pts as total_points,
                    us_group.max_score as best_score,
                    us_group.last_date as last_quiz_date,
                    ? as last_quiz_type
                FROM users u
                INNER JOIN (
                    SELECT us.user_id, SUM(us.points) as total_pts, MAX(us.score) as max_score, MAX(us.completed_at) as last_date
                    FROM user_scores us
                    JOIN categories c ON us.category_id = c.id
                    WHERE c.group_name = ?
                    GROUP BY us.user_id
                ) us_group ON u.id = us_group.user_id
                WHERE u.role != 'admin'
                ORDER BY total_points DESC
                LIMIT 50
            `;
            params = [group, group];
        } else {
            query = `
                SELECT 
                    u.id, u.username, u.avatar_url,
                    IFNULL(us_stats.total_pts, 0) as total_points,
                    IFNULL(us_stats.max_score, 0) as best_score,
                    us_stats.last_date as last_quiz_date,
                    (SELECT GROUP_CONCAT(DISTINCT c.name) 
                     FROM user_scores us2 
                     JOIN categories c ON us2.category_id = c.id 
                     WHERE us2.user_id = u.id) as played_categories
                FROM users u
                LEFT JOIN (
                    SELECT user_id, SUM(points) as total_pts, MAX(score) as max_score, MAX(completed_at) as last_date
                    FROM user_scores 
                    GROUP BY user_id
                ) us_stats ON u.id = us_stats.user_id
                WHERE u.role != 'admin'
                ORDER BY total_points DESC
                LIMIT 50
            `;
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /attempts/:userId — fetch public attempt history for the popup
router.get('/attempts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                qa.*, 
                c.display_name as category_name,
                c.icon as category_icon,
                c.color as category_color
            FROM quiz_attempts qa
            JOIN categories c ON qa.category_id = c.id
            WHERE qa.user_id = ?
            ORDER BY qa.attempted_at DESC
            LIMIT 20
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
