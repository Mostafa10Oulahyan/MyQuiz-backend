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
                image_url     LONGTEXT DEFAULT NULL,
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
                title           VARCHAR(255) DEFAULT NULL,
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
                score           FLOAT NOT NULL,
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
                score           FLOAT NOT NULL,
                total_questions INT NOT NULL,
                points          INT DEFAULT 0,
                points_added    INT DEFAULT 0,
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
            { table: 'users', column: 'hint_points', sql: "ALTER TABLE users ADD COLUMN hint_points INT DEFAULT 50" },
            // questions: add hint_cost
            { table: 'questions', column: 'hint_cost', sql: "ALTER TABLE questions ADD COLUMN hint_cost INT DEFAULT 10 AFTER hint" },
            { table: 'user_scores', column: 'score', sql: "ALTER TABLE user_scores MODIFY COLUMN score FLOAT NOT NULL" },
            // user_scores: add total_questions
            { table: 'user_scores', column: 'total_questions', sql: "ALTER TABLE user_scores ADD COLUMN total_questions INT NOT NULL DEFAULT 10 AFTER score" },
            // user_scores: add completed_at
            { table: 'user_scores', column: 'completed_at', sql: "ALTER TABLE user_scores ADD COLUMN completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
            { table: 'quiz_attempts', column: 'points_added', sql: "ALTER TABLE quiz_attempts ADD COLUMN points_added INT DEFAULT 0 AFTER points" },
            { table: 'categories', column: 'image_url', sql: "ALTER TABLE categories ADD COLUMN image_url LONGTEXT DEFAULT NULL AFTER icon" },
            { table: 'questions', column: 'title', sql: "ALTER TABLE questions ADD COLUMN title VARCHAR(255) DEFAULT NULL AFTER category_id" },
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

        // Legacy Clean-up: remove total_points if hint_points exists
        try {
            const [oldCol] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_points'`,
                [dbName]
            );
            if (oldCol.length > 0) {
                // Check if hint_points also exists to avoid dropping the only points column
                const [newCol] = await connection.query(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hint_points'`,
                    [dbName]
                );
                if (newCol.length > 0) {
                    await connection.query('ALTER TABLE users DROP COLUMN total_points');
                    console.log('  ✅ Dropped legacy column users.total_points');
                } else {
                    await connection.query('ALTER TABLE users CHANGE total_points hint_points INT DEFAULT 50');
                    console.log('  ✅ Renamed users.total_points → hint_points');
                }
            }
        } catch (e) {
            console.warn(`  ⚠️  Cleaning total_points: ${e.message}`);
        }

        // Legacy Clean-up: remove full_time if it exists in users
        try {
            const [oldFullTime] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'full_time'`,
                [dbName]
            );
            if (oldFullTime.length > 0) {
                await connection.query('ALTER TABLE users DROP COLUMN full_time');
                console.log('  ✅ Dropped legacy column users.full_time');
            }
        } catch (e) {
            console.warn(`  ⚠️  Cleaning full_time: ${e.message}`);
        }

        // ──────────────────────────────────────────────
        // 10. STORED PROCEDURES
        // ──────────────────────────────────────────────
        console.log('📦 Creating stored procedures...');

        // Remove existing procedures to recreate them
        await connection.query('DROP PROCEDURE IF EXISTS use_hint;');
        await connection.query('DROP PROCEDURE IF EXISTS submit_quiz;');

        // Create use_hint
        await connection.query(`
            CREATE PROCEDURE use_hint(IN p_user_id INT, IN p_question_id INT)
            BEGIN
                DECLARE v_hint_cost   INT;
                DECLARE v_user_points INT;

                SELECT hint_cost INTO v_hint_cost FROM questions WHERE id = p_question_id;
                SELECT hint_points INTO v_user_points FROM users WHERE id = p_user_id;

                IF v_user_points < v_hint_cost THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough points to reveal this hint';
                ELSE
                    INSERT INTO hint_usage (user_id, question_id, points_spent)
                    VALUES (p_user_id, p_question_id, v_hint_cost);

                    UPDATE users SET hint_points = hint_points - v_hint_cost WHERE id = p_user_id;
                END IF;
            END
        `);

        // Create submit_quiz
        await connection.query(`
            CREATE PROCEDURE submit_quiz(
                IN p_user_id INT, IN p_category_id INT, IN p_score INT, 
                IN p_total_questions INT, IN p_time_spent INT
            )
            BEGIN
                DECLARE v_score FLOAT;
                DECLARE v_points INT;
                DECLARE v_old_points INT DEFAULT 0;
                DECLARE v_points_added INT DEFAULT 0;

                -- 1. Calculate new score/points
                SET v_score = (p_score * 10.0 / p_total_questions);
                SET v_points = p_score * 100;

                -- 2. Fetch existing best points for this category
                SELECT IFNULL(points, 0) INTO v_old_points 
                FROM user_scores 
                WHERE user_id = p_user_id AND category_id = p_category_id;

                -- 3. Calculate actual points added (gain)
                IF v_points > v_old_points THEN
                    SET v_points_added = v_points - v_old_points;
                ELSE
                    SET v_points_added = 0;
                END IF;

                -- 4. Record the attempt with the points gain
                INSERT INTO quiz_attempts (user_id, category_id, score, total_questions, points, points_added, time_spent)
                VALUES (p_user_id, p_category_id, v_score, p_total_questions, v_points, v_points_added, p_time_spent);

                -- 5. Update best score if improved
                INSERT INTO user_scores (user_id, category_id, score, total_questions, points, time_spent)
                VALUES (p_user_id, p_category_id, v_score, p_total_questions, v_points, p_time_spent)
                ON DUPLICATE KEY UPDATE
                    score = IF(VALUES(score) > score, VALUES(score), score),
                    total_questions = IF(VALUES(score) > score, VALUES(total_questions), total_questions),
                    points = IF(VALUES(score) > score, VALUES(points), points),
                    time_spent = IF(VALUES(score) > score, VALUES(time_spent), time_spent),
                    completed_at = IF(VALUES(score) > score, NOW(), completed_at);
            END
        `);

        // ──────────────────────────────────────────────
        // 11. PERFORMANCE INDEXES
        // ──────────────────────────────────────────────
        console.log('🔍 Creating indexes...');
        const indexes = [
            { name: 'idx_questions_category', table: 'questions', column: 'category_id' },
            { name: 'idx_choices_question', table: 'choices', column: 'question_id' },
            { name: 'idx_user_scores_user', table: 'user_scores', column: 'user_id' },
            { name: 'idx_quiz_attempts_user', table: 'quiz_attempts', column: 'user_id' },
            { name: 'idx_categories_group', table: 'categories', column: 'group_name' },
            { name: 'idx_hint_usage_user', table: 'hint_usage', column: 'user_id' },
            { name: 'idx_hint_usage_question', table: 'hint_usage', column: 'question_id' },
        ];

        for (const idx of indexes) {
            try {
                await connection.query(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column})`);
            } catch (e) {
                if (e.code !== 'ER_DUP_KEYNAME') console.warn(`  ⚠️  Index ${idx.name}: ${e.message}`);
            }
        }

        // ──────────────────────────────────────────────
        // 12. NEWSLETTER EMAILS TABLE
        // ──────────────────────────────────────────────
        console.log('📧 Creating "newsletter_emails" table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS newsletter_emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database schema and procedures created successfully!');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

initDB();
