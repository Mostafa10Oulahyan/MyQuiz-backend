const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get questions by category name
router.get('/:category_name', async (req, res) => {
    try {
        const categoryName = req.params.category_name.toLowerCase();

        // 1. Get category ID
        const [categories] = await pool.query('SELECT id FROM categories WHERE name = ?', [categoryName]);
        if (categories.length === 0) return res.status(404).json({ message: 'Category not found' });
        
        const categoryId = categories[0].id;

        // 2. Get questions for this category
        const [questions] = await pool.query('SELECT id, question_text, correct_answer as correctAnswer, hint FROM questions WHERE category_id = ?', [categoryId]);
        
        if (questions.length === 0) return res.json([]);

        // 3. Get choices for each question
        for (let q of questions) {
            const [choices] = await pool.query('SELECT choice_text FROM choices WHERE question_id = ?', [q.id]);
            q.choices = choices.map(c => c.choice_text);
            // remove id if not needed, but useful internally
            delete q.id;
        }

        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
