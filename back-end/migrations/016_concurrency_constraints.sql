-- =============================================
-- Concurrency & Performance Fix
-- Migration: 016_concurrency_constraints.sql
-- Date: 2026-02-01
-- Description: Add UNIQUE constraints to prevent duplicate entries
-- and improve concurrent insert handling
-- Compatible with MySQL 5.7+
-- =============================================

DELIMITER //

-- Helper procedure to add unique constraint if not exists
DROP PROCEDURE IF EXISTS add_unique_constraint_if_not_exists//
CREATE PROCEDURE add_unique_constraint_if_not_exists(
    IN p_table VARCHAR(64),
    IN p_constraint VARCHAR(64),
    IN p_columns VARCHAR(255)
)
BEGIN
    DECLARE constraint_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO constraint_exists
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND constraint_name = p_constraint;
    
    IF constraint_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD CONSTRAINT ', p_constraint, ' UNIQUE (', p_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

-- =============================================
-- Table: scores
-- ป้องกัน duplicate scores (same assignment + student + sub_item)
-- =============================================
-- Note: สำหรับ scores, sub_item_id อาจเป็น NULL
-- MySQL doesn't allow NULL in unique key directly, so we use functional approach
-- Instead, we'll handle this in application layer with upsert

-- CALL add_unique_constraint_if_not_exists('scores', 'uk_scores_assignment_student', 'assignment_id, student_id, sub_item_id');

-- =============================================
-- Table: attendance_records
-- ป้องกัน duplicate attendance records (same session + student)
-- =============================================
CALL add_unique_constraint_if_not_exists('attendance_records', 'uk_attendance_session_student', 'attendance_session_id, student_id');

-- =============================================
-- Table: course_section_students
-- ป้องกัน duplicate enrollment (same section + student)
-- =============================================
CALL add_unique_constraint_if_not_exists('course_section_students', 'uk_css_section_student', 'course_section_id, student_id');

-- =============================================
-- Table: course_tas
-- ป้องกัน duplicate TA assignment (same course + user)
-- =============================================
CALL add_unique_constraint_if_not_exists('course_tas', 'uk_course_tas_course_user', 'course_id, user_id');

-- =============================================
-- Table: course_instructors
-- ป้องกัน duplicate instructor assignment (same course + user)
-- =============================================
CALL add_unique_constraint_if_not_exists('course_instructors', 'uk_course_instructors_course_user', 'course_id, user_id');

-- =============================================
-- Table: student_group_members
-- ป้องกัน duplicate group membership (same group + student)
-- =============================================
CALL add_unique_constraint_if_not_exists('student_group_members', 'uk_sgm_group_student', 'group_id, student_id');

-- =============================================
-- Table: queue_bookings
-- ป้องกัน duplicate booking (same session + student)
-- =============================================
CALL add_unique_constraint_if_not_exists('queue_bookings', 'uk_queue_bookings_session_student', 'queue_session_id, student_id');

-- =============================================
-- Table: score_edit_requests
-- ป้องกัน duplicate pending requests (same score)
-- Note: Only one pending request per score allowed
-- This is handled in application layer since we need status = 'pending' condition
-- =============================================

-- Cleanup helper procedure
DROP PROCEDURE IF EXISTS add_unique_constraint_if_not_exists;

-- =============================================
-- NOTES:
-- These UNIQUE constraints help:
-- 1. Prevent duplicate inserts from concurrent requests
-- 2. Allow use of INSERT ... ON DUPLICATE KEY UPDATE
-- 3. Improve data integrity
-- 
-- For scores table with nullable sub_item_id:
-- We use findOrCreate/upsert in application layer instead of 
-- database constraint due to MySQL NULL handling in UNIQUE keys
-- =============================================
