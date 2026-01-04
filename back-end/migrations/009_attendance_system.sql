-- Migration: Update attendance tables for complete attendance system
-- Created: 2026-01-04
-- Description: เพิ่ม/แก้ไขตารางสำหรับระบบเช็คชื่อ

-- =====================================================
-- 1. Update attendance_sessions table
-- =====================================================

-- Add title column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_sessions' 
                   AND COLUMN_NAME = 'title');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_sessions ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT "Attendance" AFTER course_section_id',
    'SELECT "title column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add check_location column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_sessions' 
                   AND COLUMN_NAME = 'check_location');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_sessions ADD COLUMN check_location TINYINT(1) DEFAULT 0 AFTER session_type',
    'SELECT "check_location column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add late_threshold_minutes column if not exists  
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_sessions' 
                   AND COLUMN_NAME = 'late_threshold_minutes');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_sessions ADD COLUMN late_threshold_minutes INT DEFAULT 15 AFTER end_time',
    'SELECT "late_threshold_minutes column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify session_type enum to include 'online'
ALTER TABLE attendance_sessions 
MODIFY COLUMN session_type ENUM('lecture', 'lab', 'online') DEFAULT 'lecture';

-- =====================================================
-- 2. Update attendance_records table
-- =====================================================

-- Rename timestamp to check_in_time if needed (safer approach: add new column)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'check_in_time');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN check_in_time DATETIME NULL AFTER student_id',
    'SELECT "check_in_time column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add google_email column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'google_email');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN google_email VARCHAR(255) NULL AFTER status',
    'SELECT "google_email column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add google_id column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'google_id');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN google_id VARCHAR(255) NULL AFTER google_email',
    'SELECT "google_id column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add pin_verified column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'pin_verified');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN pin_verified TINYINT(1) DEFAULT 0 AFTER google_id',
    'SELECT "pin_verified column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add location_verified column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'location_verified');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN location_verified TINYINT(1) DEFAULT 0 AFTER pin_verified',
    'SELECT "location_verified column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add distance_meters column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'distance_meters');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN distance_meters INT NULL AFTER location_lng',
    'SELECT "distance_meters column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add created_at column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'attendance_records' 
                   AND COLUMN_NAME = 'created_at');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE attendance_records ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    'SELECT "created_at column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify status enum to include 'leave'
ALTER TABLE attendance_records 
MODIFY COLUMN status ENUM('present', 'late', 'leave', 'absent') DEFAULT 'absent';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);

SELECT 'Migration completed successfully!' AS status;
