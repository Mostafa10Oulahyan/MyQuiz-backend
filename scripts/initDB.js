const mysql = require('mysql2/promise');
require('dotenv').config();

// ══════════════════════════════════════════════════════════════
// initDB.js — Creates database schema + migrates existing tables
// ══════════════════════════════════════════════════════════════
// Safe to run multiple times:
//   • CREATE TABLE IF NOT EXISTS — creates new tables
//   • ALTER TABLE — adds missing columns to existing tables
//   • CREATE INDEX — skips duplicates
// ══════════════════════════════════════════════════════════════

async function initDB() {
    let connection;
    try {
        console.log('🔌 Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const dbName = process.env.DB_NAME || 'mostafa_quizdb';

        console.log(`📦 Creating database "${dbName}" if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.query(`USE \`${dbName}\`;`);

        // ──────────────────────────────────────────────
        // 1. USERS TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "users" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                username      VARCHAR(100) NOT NULL,
                email         VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role          ENUM('user', 'admin') DEFAULT 'user',
                avatar_url    LONGTEXT DEFAULT NULL,
                hint_points   INT DEFAULT 50,
                is_active     TINYINT(1) DEFAULT 1,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // ──────────────────────────────────────────────
        // 2. CATEGORIES TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "categories" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                name          VARCHAR(50) UNIQUE NOT NULL,
                display_name  VARCHAR(100) NOT NULL,
                group_name    ENUM('frontend', 'backend', 'database', 'framework') NOT NULL,
                icon          VARCHAR(100) DEFAULT NULL,
                color         VARCHAR(20) DEFAULT '#3b82f6',
                description   TEXT DEFAULT NULL,
                display_order INT DEFAULT 0,
                is_active     TINYINT(1) DEFAULT 1,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ──────────────────────────────────────────────
        // 3. QUESTIONS TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "questions" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                category_id     INT NOT NULL,
                question_text   TEXT NOT NULL,
                correct_answer  VARCHAR(255) NOT NULL,
                hint            TEXT DEFAULT NULL,
                hint_cost       INT DEFAULT 10,
                difficulty      ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
                is_active       TINYINT(1) DEFAULT 1,
                created_by      INT DEFAULT NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL
            );
        `);

        // ──────────────────────────────────────────────
        // 4. CHOICES TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "choices" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS choices (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL,
                choice_text TEXT NOT NULL,
                is_correct  TINYINT(1) DEFAULT 0,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            );
        `);

        // ──────────────────────────────────────────────
        // 5. USER SCORES TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "user_scores" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_scores (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                user_id         INT NOT NULL,
                category_id     INT NOT NULL,
                score           INT NOT NULL,
                total_questions INT NOT NULL,
                points          INT DEFAULT 0,
                time_spent      INT DEFAULT 0,
                completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_category (user_id, category_id),
                FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            );
        `);

        // ──────────────────────────────────────────────
        // 6. QUIZ ATTEMPTS TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "quiz_attempts" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                user_id         INT NOT NULL,
                category_id     INT NOT NULL,
                score           INT NOT NULL,
                total_questions INT NOT NULL,
                points          INT DEFAULT 0,
                time_spent      INT DEFAULT 0,
                attempted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            );
        `);

        // ──────────────────────────────────────────────
        // 7. HINT USAGE TABLE
        // ──────────────────────────────────────────────
        console.log('📋 Creating "hint_usage" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS hint_usage (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                user_id      INT NOT NULL,
                question_id  INT NOT NULL,
                points_spent INT NOT NULL,
                used_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            );
        `);

        // ══════════════════════════════════════════════════════════════
        // 8. MIGRATIONS — add missing columns to existing tables
        // ══════════════════════════════════════════════════════════════
        console.log('🔄 Running migrations (adding missing columns)...');

        const migrations = [
            // users: rename total_points → hint_points (or add if missing)
            { table: 'users', column: 'hint_points',   sql: "ALTER TABLE users ADD COLUMN hint_points INT DEFAULT 50" },
            // questions: add hint_cost
            { table: 'questions', column: 'hint_cost',  sql: "ALTER TABLE questions ADD COLUMN hint_cost INT DEFAULT 10 AFTER hint" },
            // user_scores: add total_questions
            { table: 'user_scores', column: 'total_questions', sql: "ALTER TABLE user_scores ADD COLUMN total_questions INT NOT NULL DEFAULT 10 AFTER score" },
            // user_scores: add completed_at
            { table: 'user_scores', column: 'completed_at', sql: "ALTER TABLE user_scores ADD COLUMN completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
        ];

        for (const mig of migrations) {
            try {
                // Check if column already exists
                const [cols] = await connection.query(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                    [dbName, mig.table, mig.column]
                );
                if (cols.length === 0) {
                    await connection.query(mig.sql);
                    console.log(`  ✅ Added ${mig.table}.${mig.column}`);
                }
            } catch (e) {
                console.warn(`  ⚠️  Migration ${mig.table}.${mig.column}: ${e.message}`);
            }
        }

        // Special migration: rename total_points → hint_points if old column exists
        try {
            const [oldCol] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_points'`,
                [dbName]
            );
            if (oldCol.length > 0) {
                await connection.query('ALTER TABLE users CHANGE total_points hint_points INT DEFAULT 50');
                console.log('  ✅ Renamed users.total_points → hint_points');
            }
        } catch (e) {
            console.warn(`  ⚠️  Rename total_points: ${e.message}`);
        }

        // ──────────────────────────────────────────────
        // 9. PERFORMANCE INDEXES
        // ──────────────────────────────────────────────
        console.log('🔍 Creating indexes...');
        const indexes = [
            { name: 'idx_questions_category',  table: 'questions',     column: 'category_id' },
            { name: 'idx_choices_question',    table: 'choices',       column: 'question_id' },
            { name: 'idx_user_scores_user',    table: 'user_scores',   column: 'user_id' },
            { name: 'idx_quiz_attempts_user',  table: 'quiz_attempts', column: 'user_id' },
            { name: 'idx_categories_group',    table: 'categories',    column: 'group_name' },
            { name: 'idx_hint_usage_user',     table: 'hint_usage',    column: 'user_id' },
            { name: 'idx_hint_usage_question', table: 'hint_usage',    column: 'question_id' },
        ];

        for (const idx of indexes) {
            try {
                await connection.query(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column})`);
            } catch (e) {
                if (e.code !== 'ER_DUP_KEYNAME') console.warn(`  ⚠️  Index ${idx.name}: ${e.message}`);
            }
        }

        console.log('✅ Database schema created successfully!');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

initDB();
