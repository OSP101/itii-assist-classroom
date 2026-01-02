-- Migration: Fix scores table to match Sequelize model
-- Date: 2026-01-02

-- Add status column to scores table (if not exists)
ALTER TABLE scores 
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'graded') DEFAULT 'pending' AFTER graded_at;

-- Modify student_id to allow NULL (for group assignments)
ALTER TABLE scores 
MODIFY COLUMN student_id INT NULL;

-- Modify score to allow NULL (for pending status)
ALTER TABLE scores 
MODIFY COLUMN score DECIMAL(5,2) NULL;

-- Modify graded_by to allow NULL (for pending status)
ALTER TABLE scores 
MODIFY COLUMN graded_by INT NULL;

-- Drop unique constraint to allow updates (sub_item_id may not exist)
-- First check if the constraint exists, then drop it
-- ALTER TABLE scores DROP INDEX unique_score_per_student_per_item;

-- Add new unique constraint without sub_item_id if needed
-- ALTER TABLE scores ADD UNIQUE KEY unique_score (assignment_id, student_id);
