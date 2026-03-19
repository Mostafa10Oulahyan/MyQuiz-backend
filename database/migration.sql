-- ============================================================
-- MyQuiz — Database Migration
-- ============================================================
-- Use this script if you already have the tables but are 
-- missing the 'points' columns.
-- ============================================================

USE `mostafa_quizdb`;

-- 1. Add points to user_scores if missing
ALTER TABLE `user_scores` 
ADD COLUMN IF NOT EXISTS `points` INT DEFAULT 0 AFTER `score`;

-- 2. Add points to quiz_attempts if missing
ALTER TABLE `quiz_attempts` 
ADD COLUMN IF NOT EXISTS `points` INT DEFAULT 0 AFTER `score`;

-- 3. (Optional) Initialize points based on existing scores (Score * 100)
UPDATE `user_scores` SET `points` = `score` * 100 WHERE `points` = 0;
UPDATE `quiz_attempts` SET `points` = `score` * 100 WHERE `points` = 0;

SELECT 'Migration complete! Points columns added and initialized.' AS result;
