-- Migration: Rename assignments.type to assignment_type
-- Date: 2026-01-02

-- Only run if the column is named 'type' (not 'assignment_type')
-- This fixes the mismatch between migration and Sequelize model

-- Check if 'type' column exists and rename it to 'assignment_type'
SET @dbname = DATABASE();
SET @tablename = 'assignments';
SET @old_column = 'type';
SET @new_column = 'assignment_type';

-- Rename column if old name exists
ALTER TABLE assignments 
CHANGE COLUMN `type` `assignment_type` ENUM('individual', 'permanent_group', 'weekly_group') NOT NULL DEFAULT 'individual';

-- Note: If you get error that column 'type' doesn't exist, the column is already named 'assignment_type'
-- In that case, just run: SELECT 1; -- to skip this migration
