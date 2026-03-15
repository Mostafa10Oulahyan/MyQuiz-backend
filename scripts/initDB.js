const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
    let connection;
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('Creating database if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'quiz_db'}\`;`);
        await connection.query(`USE \`${process.env.DB_NAME || 'quiz_db'}\`;`);

        console.log('Creating tables...');
        // 1. Users
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                total_points INT DEFAULT 50,
                full_time INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Categories
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL
            );
        `);

        // Insert default categories
        await connection.query(`
            INSERT IGNORE INTO categories (name) VALUES 
            ('javascript'), ('html'), ('css'), ('react'), ('bootstrap');
        `);

        // 3. Questions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                question_text TEXT NOT NULL,
                correct_answer VARCHAR(255) NOT NULL,
                hint TEXT NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            );
        `);

        // 4. Choices
        await connection.query(`
            CREATE TABLE IF NOT EXISTS choices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL,
                choice_text TEXT NOT NULL,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            );
        `);

        // 5. User Scores
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_id INT NOT NULL,
                score INT NOT NULL,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                UNIQUE(user_id, category_id)
            );
        `);

        console.log('Database schema created successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

initDB();
