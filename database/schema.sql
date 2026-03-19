-- ============================================================
-- MyQuiz — Complete Database Schema
-- ============================================================
-- This file represents the FULL suggested schema for the
-- expanded MyQuiz platform, including:
--   • Admin role system
--   • New quiz categories (Python, Java, Node.js, Laravel, etc.)
--   • Difficulty levels for questions
--   • Category grouping (frontend / backend / database / framework)
-- ============================================================

-- 1. CREATE DATABASE
-- ============================================================
CREATE DATABASE IF NOT EXISTS `mostafa_quizdb`;
USE `mostafa_quizdb`;


-- ============================================================
-- 2. USERS TABLE
-- ============================================================
-- Added: `role` column for admin panel access
-- Added: `avatar_url` for future profile pictures
-- Added: `is_active` to soft-disable accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `username`      VARCHAR(100) NOT NULL,
    `email`         VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role`          ENUM('user', 'admin') DEFAULT 'user',
    `avatar_url`    VARCHAR(500) DEFAULT NULL,
    `total_points`  INT DEFAULT 50,
    `full_time`     INT DEFAULT 0,
    `is_active`     TINYINT(1) DEFAULT 1,
    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. CATEGORIES TABLE
-- ============================================================
-- Added: `group_name` to classify categories (frontend/backend/database/framework)
-- Added: `icon`, `color` for UI rendering
-- Added: `display_order` to control card ordering
-- Added: `is_active` so admin can enable/disable categories
-- ============================================================
CREATE TABLE IF NOT EXISTS `categories` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `name`          VARCHAR(50) UNIQUE NOT NULL,
    `display_name`  VARCHAR(100) NOT NULL,
    `group_name`    ENUM('frontend', 'backend', 'database', 'framework') NOT NULL,
    `icon`          VARCHAR(100) DEFAULT NULL,
    `color`         VARCHAR(20) DEFAULT '#3b82f6',
    `description`   TEXT DEFAULT NULL,
    `display_order` INT DEFAULT 0,
    `is_active`     TINYINT(1) DEFAULT 1,
    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. QUESTIONS TABLE
-- ============================================================
-- Added: `difficulty` (easy/medium/hard) for filtering
-- Added: `is_active` so admin can disable individual questions
-- Added: `created_by` to track which admin added it
-- ============================================================
CREATE TABLE IF NOT EXISTS `questions` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `category_id`     INT NOT NULL,
    `question_text`   TEXT NOT NULL,
    `correct_answer`  VARCHAR(255) NOT NULL,
    `hint`            TEXT DEFAULT NULL,
    `difficulty`      ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    `is_active`       TINYINT(1) DEFAULT 1,
    `created_by`      INT DEFAULT NULL,
    `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);


-- ============================================================
-- 5. CHOICES TABLE
-- ============================================================
-- Added: `is_correct` flag as an alternative way to mark the
--        correct answer (useful for admin panel editing)
-- ============================================================
CREATE TABLE IF NOT EXISTS `choices` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `question_id` INT NOT NULL,
    `choice_text` TEXT NOT NULL,
    `is_correct`  TINYINT(1) DEFAULT 0,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);


-- ============================================================
-- 6. USER SCORES TABLE
-- ============================================================
-- Tracks best score per user per category (upsert on duplicate)
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_scores` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`      INT NOT NULL,
    `category_id`  INT NOT NULL,
    `score`        INT NOT NULL,
    `points`       INT DEFAULT 0,
    `time_spent`   INT DEFAULT 0,
    `completed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_category` (`user_id`, `category_id`),
    FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)      ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)  ON DELETE CASCADE
);


-- ============================================================
-- 7. QUIZ ATTEMPTS TABLE (NEW)
-- ============================================================
-- Logs every quiz attempt (history), unlike user_scores which
-- keeps only the best. Useful for analytics and admin dashboard.
-- ============================================================
CREATE TABLE IF NOT EXISTS `quiz_attempts` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`      INT NOT NULL,
    `category_id`  INT NOT NULL,
    `score`           INT NOT NULL,
    `points`          INT DEFAULT 0,
    `total_questions` INT NOT NULL,
    `time_spent`      INT DEFAULT 0,
    `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)      ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)  ON DELETE CASCADE
);


-- ============================================================
-- 8. SEED DEFAULT CATEGORIES
-- ============================================================

-- Existing frontend categories
INSERT INTO `categories` (`name`, `display_name`, `group_name`, `icon`, `color`, `description`, `display_order`) VALUES
('html',       'HTML5',       'frontend',  'fa-brands fa-html5',     '#e34f26', 'Maîtrisez le HTML sémantique, l''accessibilité et les pratiques modernes de balisage.',     1),
('css',        'CSS3',        'frontend',  'fa-brands fa-css3-alt',  '#1572b6', 'Apprenez les techniques CSS avancées, les animations et le design responsive.',             2),
('javascript', 'JavaScript',  'frontend',  'fa-brands fa-js',        '#f7df1e', 'Plongez dans le JavaScript moderne, ES6+ et la manipulation du DOM.',                      3),
('react',      'React',       'frontend',  'fa-brands fa-react',     '#61dafb', 'Construisez des applications web modernes avec React et son écosystème.',                   4),
('bootstrap',  'Bootstrap',   'frontend',  'fa-brands fa-bootstrap', '#7952b3', 'Apprenez à créer des sites web responsifs avec le framework Bootstrap.',                    5)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- NEW backend categories
INSERT INTO `categories` (`name`, `display_name`, `group_name`, `icon`, `color`, `description`, `display_order`) VALUES
('python',     'Python',      'backend',   'fa-brands fa-python',    '#3776ab', 'Apprenez Python : syntaxe, structures de données, POO et scripting.',                      6),
('java',       'Java',        'backend',   'fa-brands fa-java',      '#007396', 'Maîtrisez Java : POO, collections, multithreading et design patterns.',                     7),
('nodejs',     'Node.js',     'backend',   'fa-brands fa-node-js',   '#339933', 'Développez des serveurs performants avec Node.js, Express et les API REST.',               8),
('php',        'PHP',         'backend',   'fa-brands fa-php',       '#777bb4', 'Apprenez le PHP moderne : syntaxe, PDO, sessions et sécurité web.',                         9),
('laravel',    'Laravel',     'framework', 'fa-brands fa-laravel',   '#ff2d20', 'Maîtrisez Laravel : Eloquent ORM, migrations, middleware et Blade templates.',              10)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- NEW database categories
INSERT INTO `categories` (`name`, `display_name`, `group_name`, `icon`, `color`, `description`, `display_order`) VALUES
('mysql',      'MySQL',       'database',  'fa-solid fa-database',   '#4479a1', 'Apprenez SQL, les jointures, l''indexation et l''optimisation des requêtes.',               11),
('mongodb',    'MongoDB',     'database',  'fa-solid fa-leaf',       '#47a248', 'Maîtrisez MongoDB : documents, agrégation, indexation et Mongoose.',                        12)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);


-- ============================================================
-- 9. SEED DEFAULT ADMIN USER (optional)
-- ============================================================
-- Password: admin123 (bcrypt hash — generate your own in production!)
-- You should replace this hash with a real bcrypt output.
-- ============================================================
-- INSERT INTO `users` (`username`, `email`, `password_hash`, `role`) VALUES
-- ('admin', 'admin@myquiz.com', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'admin');


-- ============================================================
-- USEFUL INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_questions_category  ON `questions`(`category_id`);
CREATE INDEX idx_choices_question    ON `choices`(`question_id`);
CREATE INDEX idx_user_scores_user    ON `user_scores`(`user_id`);
CREATE INDEX idx_quiz_attempts_user  ON `quiz_attempts`(`user_id`);
CREATE INDEX idx_categories_group    ON `categories`(`group_name`);
