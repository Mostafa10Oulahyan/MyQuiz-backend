const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
require('dotenv').config();

// DB Connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_db',
    port: process.env.DB_PORT || 3306
};

// POST /api/newsletter/subscribe
router.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'L\'adresse e-mail est requise.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Veuillez entrer une adresse e-mail valide.' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Check if already subscribed
        const [existing] = await connection.execute('SELECT id FROM newsletter_emails WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Vous êtes déjà abonné à notre newsletter !' });
        }

        // Insert new subscription
        await connection.execute('INSERT INTO newsletter_emails (email) VALUES (?)', [email]);

        res.status(201).json({ message: 'Merci de vous être abonné !' });
    } catch (error) {
        console.error('Newsletter error:', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de l\'abonnement.' });
    } finally {
        if (connection) await connection.end();
    }
});

module.exports = router;
