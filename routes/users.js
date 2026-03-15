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

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
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
            user: { id: user.id, username: user.username, total_points: user.total_points, full_time: user.full_time } 
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
        
        // Upsert score (insert or update on duplicate)
        await pool.query(`
            INSERT INTO user_scores (user_id, category_id, score) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE score = VALUES(score), completed_at = CURRENT_TIMESTAMP
        `, [req.user.id, categoryId, score]);
        
        res.json({ message: 'Score saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
