const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// @route   GET /api/categories
// @desc    Get all active categories for public display
router.get('/', async (req, res) => {
    try {
        const [categories] = await pool.query(`
            SELECT c.*, COUNT(q.id) as question_count 
            FROM categories c 
            LEFT JOIN questions q ON c.id = q.category_id 
            WHERE c.is_active = 1
            GROUP BY c.id 
            ORDER BY c.display_order
        `);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/categories/:name
// @desc    Get a single category by its name
router.get('/:name', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, COUNT(q.id) as question_count 
            FROM categories c 
            LEFT JOIN questions q ON c.id = q.category_id 
            WHERE LOWER(c.name) = ? AND c.is_active = 1
            GROUP BY c.id
        `, [req.params.name.toLowerCase()]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Category not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
