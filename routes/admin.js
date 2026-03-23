const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretquizkey';

// ──────────────────────────────────────────────────────────────
// Middleware: Verify JWT Token
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// Middleware: Verify Admin Role
// ──────────────────────────────────────────────────────────────
const verifyAdmin = async (req, res, next) => {
    try {
        const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ──────────────────────────────────────────────────────────────
// POST /api/admin/login
// ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(400).json({ message: 'User not found' });
        const user = users[0];

        if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────
// GET /api/admin/stats — Dashboard statistics
// ──────────────────────────────────────────────────────────────
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ totalCategories }]] = await pool.query('SELECT COUNT(*) as totalCategories FROM categories');
        const [[{ totalQuestions }]] = await pool.query('SELECT COUNT(*) as totalQuestions FROM questions');
        const [[{ totalAttempts }]] = await pool.query('SELECT COUNT(*) as totalAttempts FROM quiz_attempts');

        // Questions per category
        const [perCategory] = await pool.query(`
            SELECT c.name, c.display_name, c.color, COUNT(q.id) as question_count 
            FROM categories c 
            LEFT JOIN questions q ON c.id = q.category_id 
            GROUP BY c.id ORDER BY c.display_order
        `);

        res.json({ totalUsers, totalCategories, totalQuestions, totalAttempts, perCategory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────
// CATEGORIES CRUD
// ──────────────────────────────────────────────────────────────

// GET all categories
router.get('/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [categories] = await pool.query(`
            SELECT c.*, COUNT(q.id) as question_count 
            FROM categories c 
            LEFT JOIN questions q ON c.id = q.category_id 
            GROUP BY c.id ORDER BY c.display_order
        `);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create category
router.post('/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, display_name, group_name, icon, color, description, display_order } = req.body;
        const [result] = await pool.query(
            'INSERT INTO categories (name, display_name, group_name, icon, color, description, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, display_name, group_name, icon || null, color || '#3b82f6', description || null, display_order || 0]
        );
        res.status(201).json({ message: 'Category created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update category
router.put('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { display_name, group_name, icon, color, description, display_order, is_active } = req.body;
        await pool.query(
            'UPDATE categories SET display_name=?, group_name=?, icon=?, color=?, description=?, display_order=?, is_active=? WHERE id=?',
            [display_name, group_name, icon, color, description, display_order, is_active, req.params.id]
        );
        res.json({ message: 'Category updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE category
router.delete('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────
// QUESTIONS CRUD
// ──────────────────────────────────────────────────────────────

// GET all questions (with category info)
router.get('/questions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [questions] = await pool.query(`
            SELECT q.*, c.display_name as category_name, c.color as category_color
            FROM questions q 
            JOIN categories c ON q.category_id = c.id 
            ORDER BY q.category_id, q.id
        `);
        // Get choices for each question
        for (let q of questions) {
            const [choices] = await pool.query('SELECT id, choice_text, is_correct FROM choices WHERE question_id = ?', [q.id]);
            q.choices = choices;
        }
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single question
router.get('/questions/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [questions] = await pool.query('SELECT * FROM questions WHERE id = ?', [req.params.id]);
        if (questions.length === 0) return res.status(404).json({ message: 'Question not found' });
        const question = questions[0];
        const [choices] = await pool.query('SELECT id, choice_text, is_correct FROM choices WHERE question_id = ?', [question.id]);
        question.choices = choices;
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create question with choices
router.post('/questions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { category_id, question_text, correct_answer, hint, difficulty, choices } = req.body;
        const [result] = await pool.query(
            'INSERT INTO questions (category_id, question_text, correct_answer, hint, difficulty, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [category_id, question_text, correct_answer, hint || null, difficulty || 'medium', req.user.id]
        );
        const questionId = result.insertId;

        // Insert choices
        if (choices && choices.length > 0) {
            for (const choice of choices) {
                await pool.query(
                    'INSERT INTO choices (question_id, choice_text, is_correct) VALUES (?, ?, ?)',
                    [questionId, choice.text, choice.text === correct_answer ? 1 : 0]
                );
            }
        }
        res.status(201).json({ message: 'Question created', id: questionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update question
router.put('/questions/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { question_text, correct_answer, hint, difficulty, is_active, choices } = req.body;
        await pool.query(
            'UPDATE questions SET question_text=?, correct_answer=?, hint=?, difficulty=?, is_active=? WHERE id=?',
            [question_text, correct_answer, hint, difficulty, is_active, req.params.id]
        );

        // Replace choices if provided
        if (choices && choices.length > 0) {
            await pool.query('DELETE FROM choices WHERE question_id = ?', [req.params.id]);
            for (const choice of choices) {
                await pool.query(
                    'INSERT INTO choices (question_id, choice_text, is_correct) VALUES (?, ?, ?)',
                    [req.params.id, choice.text, choice.text === correct_answer ? 1 : 0]
                );
            }
        }
        res.json({ message: 'Question updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE question
router.delete('/questions/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
        res.json({ message: 'Question deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────
// USERS (Read-only for admin)
// ──────────────────────────────────────────────────────────────
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username, email, role, hint_points, full_time, is_active, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
