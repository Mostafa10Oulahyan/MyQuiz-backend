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
        // Expected format: "Bearer <token>"
        const verified = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user exists
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
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
        
        // Find user by email
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'User not found' });
        const user = users[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        // Create token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            token, 
            user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url, total_points: user.total_points, full_time: user.full_time } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Points
router.put('/points', verifyToken, async (req, res) => {
    try {
        const { points_diff } = req.body; // Usually -10 for a hint or +X for something else
        
        // Get current points
        const [rows] = await pool.query('SELECT total_points FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        let currentPoints = rows[0].total_points;
        let newPoints = currentPoints + points_diff;
        if (newPoints < 0) newPoints = 0; // Prevent negative points
        
        await pool.query('UPDATE users SET total_points = ? WHERE id = ?', [newPoints, req.user.id]);
        
        res.json({ message: 'Points updated', new_points: newPoints });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Full Time
router.put('/time', verifyToken, async (req, res) => {
    try {
        const { time_added } = req.body;
        
        await pool.query('UPDATE users SET full_time = full_time + ? WHERE id = ?', [time_added, req.user.id]);
        
        res.json({ message: 'Time updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Score
router.post('/score', verifyToken, async (req, res) => {
    try {
        const { category_name, score } = req.body; // e.g., 'html', 'js'

        const [categories] = await pool.query('SELECT id FROM categories WHERE name = ?', [category_name]);
        if (categories.length === 0) return res.status(400).json({ message: 'Category not found' });
        const categoryId = categories[0].id;
        
        const points_earned = score * 100;
        
        // Upsert score (insert or update on duplicate)
        await pool.query(`
            INSERT INTO user_scores (user_id, category_id, score, points) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                score = GREATEST(score, VALUES(score)), 
                points = GREATEST(points, VALUES(points)),
                completed_at = CURRENT_TIMESTAMP
        `, [req.user.id, categoryId, score, points_earned]);

        // Log attempt
        await pool.query(`
            INSERT INTO quiz_attempts (user_id, category_id, score, points, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, categoryId, score, points_earned, 10]); // total_questions should ideally be dynamic too

        // Update user's total points
        await pool.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [points_earned, req.user.id]);
        
        const [updatedUser] = await pool.query('SELECT total_points FROM users WHERE id = ?', [req.user.id]);
        
        res.json({ 
            message: 'Score saved successfully', 
            points_earned, 
            total_points: updatedUser[0].total_points 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile (username, avatar_url)
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { username, avatar_url } = req.body;
        
        if (username) {
            // Check if username is taken by another user
            const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
            if (existing.length > 0) return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
        }
        
        await pool.query(
            'UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
            [username || null, avatar_url || null, req.user.id]
        );
        
        const [updated] = await pool.query('SELECT id, username, email, avatar_url, total_points, full_time FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Profil mis à jour', user: updated[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
