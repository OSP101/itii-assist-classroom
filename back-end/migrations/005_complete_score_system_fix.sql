-- Migration: Complete Score System Tables Fix
-- Date: 2026-01-02
-- Run this migration to ensure all score-related tables are correct

-- ============================================
-- 1. Fix assignments table - rename 'type' to 'assignment_type' if needed
-- ============================================
-- Check if we need to rename
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'assignments' 
AND COLUMN_NAME = 'type';

-- If 'type' column exists, rename it to 'assignment_type'
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE assignments CHANGE COLUMN `type` `assignment_type` ENUM(''individual'', ''permanent_group'', ''weekly_group'') NOT NULL DEFAULT ''individual''',
    'SELECT ''assignment_type column already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. Ensure scores table has all required columns
-- ============================================
-- Add status column if not exists
SELECT COUNT(*) INTO @status_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'scores' 
AND COLUMN_NAME = 'status';

SET @sql = IF(@status_exists = 0, 
    'ALTER TABLE scores ADD COLUMN status ENUM(''pending'', ''graded'') DEFAULT ''pending''',
    'SELECT ''status column already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make student_id nullable (for group assignments where we might not have individual students)
ALTER TABLE scores MODIFY COLUMN student_id BIGINT NULL;

-- Make score nullable (for pending status)
ALTER TABLE scores MODIFY COLUMN score DECIMAL(5,2) NULL;

-- Make graded_by nullable (for pending status)
ALTER TABLE scores MODIFY COLUMN graded_by BIGINT NULL;

-- Make graded_at nullable
ALTER TABLE scores MODIFY COLUMN graded_at DATETIME NULL;

-- ============================================
-- 3. Verify score_edit_requests table exists
-- ============================================
CREATE TABLE IF NOT EXISTS score_edit_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    score_id INT NOT NULL,
    old_score DECIMAL(5,2) NULL,
    new_score DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    requested_by BIGINT NOT NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    review_comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_edit_requests_score (score_id),
    INDEX idx_edit_requests_status (status),
    INDEX idx_edit_requests_requester (requested_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Show current table structure for verification
-- ============================================
-- DESCRIBE assignments;
-- DESCRIBE scores;
-- DESCRIBE score_edit_requests;

SELECT 'Migration completed successfully!' AS result;
