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

module.exports = router;
