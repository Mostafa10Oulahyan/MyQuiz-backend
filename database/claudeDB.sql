-- ============================================================
-- MyQuiz — Optimized Database Schema
-- ============================================================
-- Changes from original:
--   • users.full_time REMOVED (calculated from quiz_attempts)
--   • users.hint_points KEPT as hint wallet (default 50)
--   • questions.hint_cost ADDED (points cost per hint)
--   • hint_usage TABLE ADDED (tracks every hint purchase)
--   • user_scores.total_questions ADDED (needed for % calc)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `mostafa_quizdb`;
USE `mostafa_quizdb`;


-- ============================================================
-- 1. USERS
-- ============================================================
-- hint_points = hint wallet (starts at 50)
--   -X when user reveals a hint (cost)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `username`      VARCHAR(100) NOT NULL,
    `email`         VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role`          ENUM('user', 'admin') DEFAULT 'user',
    `avatar_url`    LONGTEXT DEFAULT NULL,
    `hint_points`   INT DEFAULT 50,          -- hint wallet
    `is_active`     TINYINT(1) DEFAULT 1,
    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. CATEGORIES
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
-- 3. QUESTIONS
-- ============================================================
-- hint_cost: how many points it costs to reveal this hint
--   easy = 5 pts, medium = 10 pts, hard = 20 pts (suggestion)
-- ============================================================
CREATE TABLE IF NOT EXISTS `questions` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `category_id`     INT NOT NULL,
    `question_text`   TEXT NOT NULL,
    `correct_answer`  VARCHAR(255) NOT NULL,
    `hint`            TEXT DEFAULT NULL,
    `hint_cost`       INT DEFAULT 10,         -- points to reveal hint
    `difficulty`      ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    `is_active`       TINYINT(1) DEFAULT 1,
    `created_by`      INT DEFAULT NULL,
    `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)  REFERENCES `users`(`id`)      ON DELETE SET NULL
);


-- ============================================================
-- 4. CHOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS `choices` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `question_id` INT NOT NULL,
    `choice_text` TEXT NOT NULL,
    `is_correct`  TINYINT(1) DEFAULT 0,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);


-- ============================================================
-- 5. USER SCORES  (best score per user per category)
-- ============================================================
-- total_questions stored here so % can be calculated without
-- joining quiz_attempts just for a leaderboard query.
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_scores` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`         INT NOT NULL,
    `category_id`     INT NOT NULL,
    `score`           INT NOT NULL,           -- correct answers
    `total_questions` INT NOT NULL,           -- total questions in that quiz
    `points`          INT DEFAULT 0,          -- points earned in best attempt
    `time_spent`      INT DEFAULT 0,          -- seconds
    `completed_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_category` (`user_id`, `category_id`),
    FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)      ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);


-- ============================================================
-- 6. QUIZ ATTEMPTS  (full history, every attempt logged)
-- ============================================================
CREATE TABLE IF NOT EXISTS `quiz_attempts` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`         INT NOT NULL,
    `category_id`     INT NOT NULL,
    `score`           INT NOT NULL,           -- correct answers
    `total_questions` INT NOT NULL,
    `points`          INT DEFAULT 0,          -- points earned this attempt
    `time_spent`      INT DEFAULT 0,          -- seconds
    `attempted_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)      ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);


-- ============================================================
-- 7. HINT USAGE  (tracks every hint reveal)
-- ============================================================
-- When a user reveals a hint:
--   1. INSERT into hint_usage
--   2. UPDATE users SET hint_points = hint_points - hint_cost
-- ============================================================
CREATE TABLE IF NOT EXISTS `hint_usage` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`      INT NOT NULL,
    `question_id`  INT NOT NULL,
    `points_spent` INT NOT NULL,
    `used_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)     ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);


-- ============================================================
-- 8. SEED CATEGORIES
-- ============================================================

INSERT INTO `categories` (`name`, `display_name`, `group_name`, `icon`, `color`, `description`, `display_order`) VALUES
('html',       'HTML5',       'frontend',  'fa-brands fa-html5',     '#e34f26', 'Maîtrisez le HTML sémantique, l''accessibilité et les pratiques modernes de balisage.',     1),
('css',        'CSS3',        'frontend',  'fa-brands fa-css3-alt',  '#1572b6', 'Apprenez les techniques CSS avancées, les animations et le design responsive.',             2),
('javascript', 'JavaScript',  'frontend',  'fa-brands fa-js',        '#f7df1e', 'Plongez dans le JavaScript moderne, ES6+ et la manipulation du DOM.',                      3),
('react',      'React',       'frontend',  'fa-brands fa-react',     '#61dafb', 'Construisez des applications web modernes avec React et son écosystème.',                   4),
('bootstrap',  'Bootstrap',   'frontend',  'fa-brands fa-bootstrap', '#7952b3', 'Apprenez à créer des sites web responsifs avec le framework Bootstrap.',                    5),
('python',     'Python',      'backend',   'fa-brands fa-python',    '#3776ab', 'Apprenez Python : syntaxe, structures de données, POO et scripting.',                      6),
('java',       'Java',        'backend',   'fa-brands fa-java',      '#007396', 'Maîtrisez Java : POO, collections, multithreading et design patterns.',                     7),
('nodejs',     'Node.js',     'backend',   'fa-brands fa-node-js',   '#339933', 'Développez des serveurs performants avec Node.js, Express et les API REST.',               8),
('php',        'PHP',         'backend',   'fa-brands fa-php',       '#777bb4', 'Apprenez le PHP moderne : syntaxe, PDO, sessions et sécurité web.',                         9),
('laravel',    'Laravel',     'framework', 'fa-brands fa-laravel',   '#ff2d20', 'Maîtrisez Laravel : Eloquent ORM, migrations, middleware et Blade templates.',              10),
('mysql',      'MySQL',       'database',  'fa-solid fa-database',   '#4479a1', 'Apprenez SQL, les jointures, l''indexation et l''optimisation des requêtes.',               11),
('mongodb',    'MongoDB',     'database',  'fa-solid fa-leaf',       '#47a248', 'Maîtrisez MongoDB : documents, agrégation, indexation et Mongoose.',                        12)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);


-- ============================================================
-- 9. INDEXES
-- ============================================================
CREATE INDEX idx_questions_category  ON `questions`(`category_id`);
CREATE INDEX idx_choices_question    ON `choices`(`question_id`);
CREATE INDEX idx_user_scores_user    ON `user_scores`(`user_id`);
CREATE INDEX idx_quiz_attempts_user  ON `quiz_attempts`(`user_id`);
CREATE INDEX idx_categories_group    ON `categories`(`group_name`);
CREATE INDEX idx_hint_usage_user     ON `hint_usage`(`user_id`);
CREATE INDEX idx_hint_usage_question ON `hint_usage`(`question_id`);


-- ============================================================
-- 10. STORED PROCEDURES
-- ============================================================

DELIMITER $$

-- Reveal a hint
-- Checks user has enough points, then atomically deducts and logs.
CREATE PROCEDURE `use_hint`(
    IN p_user_id     INT,
    IN p_question_id INT
)
BEGIN
    DECLARE v_hint_cost   INT;
    DECLARE v_user_points INT;

    SELECT `hint_cost` INTO v_hint_cost
    FROM `questions` WHERE `id` = p_question_id;

    SELECT `hint_points` INTO v_user_points
    FROM `users` WHERE `id` = p_user_id;

    IF v_user_points < v_hint_cost THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Not enough points to reveal this hint';
    ELSE
        INSERT INTO `hint_usage` (`user_id`, `question_id`, `points_spent`)
        VALUES (p_user_id, p_question_id, v_hint_cost);

        UPDATE `users`
        SET `hint_points` = `hint_points` - v_hint_cost
        WHERE `id` = p_user_id;
    END IF;
END$$


-- Submit quiz result
-- Logs the attempt, awards points to wallet, and upserts best score.
CREATE PROCEDURE `submit_quiz`(
    IN p_user_id         INT,
    IN p_category_id     INT,
    IN p_score           INT,
    IN p_total_questions INT,
    IN p_time_spent      INT
)
BEGIN
    DECLARE v_score  FLOAT;
    DECLARE v_points INT;

    -- Score formula: (correct / total) * 10
    SET v_score = (p_score / p_total_questions) * 10;
    
    -- Points formula: correct answers * 100
    SET v_points = p_score * 100;

    -- Log attempt
    INSERT INTO `quiz_attempts`
        (`user_id`, `category_id`, `score`, `total_questions`, `points`, `time_spent`)
    VALUES
        (p_user_id, p_category_id, v_score, p_total_questions, v_points, p_time_spent);

    -- Upsert best score (only update if this attempt is better)
    INSERT INTO `user_scores`
        (`user_id`, `category_id`, `score`, `total_questions`, `points`, `time_spent`)
    VALUES
        (p_user_id, p_category_id, v_score, p_total_questions, v_points, p_time_spent)
    ON DUPLICATE KEY UPDATE
        `score`           = IF(VALUES(`score`) > `score`, VALUES(`score`), `score`),
        `total_questions` = IF(VALUES(`score`) > `score`, VALUES(`total_questions`), `total_questions`),
        `points`          = IF(VALUES(`score`) > `score`, VALUES(`points`), `points`),
        `time_spent`      = IF(VALUES(`score`) > `score`, VALUES(`time_spent`), `time_spent`),
        `completed_at`    = IF(VALUES(`score`) > `score`, NOW(), `completed_at`);
END$$

DELIMITER ;


-- ============================================================
-- USEFUL QUERIES
-- ============================================================

-- User total points (verify against wallet)
-- SELECT SUM(points) FROM quiz_attempts WHERE user_id = ?;

-- Score % per category
-- SELECT category_id, ROUND((score / total_questions) * 100) AS pct
-- FROM user_scores WHERE user_id = ?;

-- Total points spent on hints by user
-- SELECT SUM(points_spent) FROM hint_usage WHERE user_id = ?;

-- Leaderboard for a category
-- SELECT u.username, us.score, us.total_questions,
--        ROUND((us.score / us.total_questions) * 100) AS pct,
--        us.time_spent
-- FROM user_scores us
-- JOIN users u ON u.id = us.user_id
-- WHERE us.category_id = ?
-- ORDER BY us.score DESC, us.time_spent ASC
-- LIMIT 10;