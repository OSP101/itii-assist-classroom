-- Migration: Add is_score_visible column to assignments table
-- Purpose: Allow instructors to hide scores from students (e.g., for internal grading only)

-- Add is_score_visible column (default TRUE - scores visible to students)
-- Check if column exists first to avoid error on re-run
SET @dbname = DATABASE();
SET @tablename = 'assignments';
SET @columnname = 'is_score_visible';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BOOLEAN DEFAULT TRUE')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
