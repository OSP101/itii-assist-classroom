-- =============================================
-- Performance Optimization Indexes
-- Migration: 015_performance_indexes.sql
-- Date: 2026-02-01
-- Description: Add missing indexes to improve query performance
-- Compatible with MySQL 5.7+
-- =============================================

DELIMITER //

-- Helper procedure to safely create index if not exists
DROP PROCEDURE IF EXISTS create_index_if_not_exists//
CREATE PROCEDURE create_index_if_not_exists(
    IN p_table VARCHAR(64),
    IN p_index VARCHAR(64),
    IN p_columns VARCHAR(255)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', p_index, ' ON ', p_table, '(', p_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

-- =============================================
-- Table: scores
-- Most critical - queried heavily in score operations
-- =============================================
CALL create_index_if_not_exists('scores', 'idx_scores_assignment', 'assignment_id');
CALL create_index_if_not_exists('scores', 'idx_scores_student', 'student_id');
CALL create_index_if_not_exists('scores', 'idx_scores_group', 'group_id');
CALL create_index_if_not_exists('scores', 'idx_scores_graded_by', 'graded_by');
CALL create_index_if_not_exists('scores', 'idx_scores_status', 'status');
CALL create_index_if_not_exists('scores', 'idx_scores_sub_item', 'sub_item_id');
CALL create_index_if_not_exists('scores', 'idx_scores_assignment_student', 'assignment_id, student_id');
CALL create_index_if_not_exists('scores', 'idx_scores_assignment_group', 'assignment_id, group_id');

-- =============================================
-- Table: attendance_records
-- Critical for attendance checking and stats
-- =============================================
CALL create_index_if_not_exists('attendance_records', 'idx_att_records_session', 'attendance_session_id');
CALL create_index_if_not_exists('attendance_records', 'idx_att_records_student', 'student_id');
CALL create_index_if_not_exists('attendance_records', 'idx_att_records_status', 'status');
CALL create_index_if_not_exists('attendance_records', 'idx_att_records_session_student', 'attendance_session_id, student_id');
CALL create_index_if_not_exists('attendance_records', 'idx_att_records_session_status', 'attendance_session_id, status');

-- =============================================
-- Table: assignments
-- Queried frequently with course_id filter
-- =============================================
CALL create_index_if_not_exists('assignments', 'idx_assignments_course', 'course_id');
CALL create_index_if_not_exists('assignments', 'idx_assignments_type', 'assignment_type');
CALL create_index_if_not_exists('assignments', 'idx_assignments_active', 'is_active');
CALL create_index_if_not_exists('assignments', 'idx_assignments_linked_att', 'linked_attendance_session_id');
CALL create_index_if_not_exists('assignments', 'idx_assignments_course_active', 'course_id, is_active');

-- =============================================
-- Table: attendance_sessions
-- Queried with course_id filter
-- =============================================
CALL create_index_if_not_exists('attendance_sessions', 'idx_att_sessions_course', 'course_id');
CALL create_index_if_not_exists('attendance_sessions', 'idx_att_sessions_section', 'course_section_id');
CALL create_index_if_not_exists('attendance_sessions', 'idx_att_sessions_status', 'status');
CALL create_index_if_not_exists('attendance_sessions', 'idx_att_sessions_start', 'start_time');
CALL create_index_if_not_exists('attendance_sessions', 'idx_att_sessions_course_status', 'course_id, status');

-- =============================================
-- Table: course_section_students
-- Critical for student enrollment lookups
-- =============================================
CALL create_index_if_not_exists('course_section_students', 'idx_css_section', 'course_section_id');
CALL create_index_if_not_exists('course_section_students', 'idx_css_student', 'student_id');
CALL create_index_if_not_exists('course_section_students', 'idx_css_status', 'status');

-- =============================================
-- Table: course_sections
-- Used in JOINs frequently
-- =============================================
CALL create_index_if_not_exists('course_sections', 'idx_sections_course', 'course_id');

-- =============================================
-- Table: course_tas
-- Queried for TA access checks
-- =============================================
CALL create_index_if_not_exists('course_tas', 'idx_course_tas_course', 'course_id');
CALL create_index_if_not_exists('course_tas', 'idx_course_tas_user', 'user_id');

-- =============================================
-- Table: course_instructors
-- Queried for instructor access checks
-- =============================================
CALL create_index_if_not_exists('course_instructors', 'idx_course_instructors_course', 'course_id');
CALL create_index_if_not_exists('course_instructors', 'idx_course_instructors_user', 'user_id');

-- =============================================
-- Table: queue_bookings
-- Heavy in queue operations
-- =============================================
CALL create_index_if_not_exists('queue_bookings', 'idx_queue_bookings_session', 'queue_session_id');
CALL create_index_if_not_exists('queue_bookings', 'idx_queue_bookings_student', 'student_id');
CALL create_index_if_not_exists('queue_bookings', 'idx_queue_bookings_status', 'status');
CALL create_index_if_not_exists('queue_bookings', 'idx_queue_bookings_session_status', 'queue_session_id, status');

-- =============================================
-- Table: student_group_members
-- For group assignment lookups
-- =============================================
CALL create_index_if_not_exists('student_group_members', 'idx_sgm_group', 'group_id');
CALL create_index_if_not_exists('student_group_members', 'idx_sgm_student', 'student_id');

-- =============================================
-- Table: student_groups
-- Queried with course_id filter
-- =============================================
CALL create_index_if_not_exists('student_groups', 'idx_sg_course', 'course_id');
CALL create_index_if_not_exists('student_groups', 'idx_sg_course_type', 'course_id, group_type');

-- Cleanup helper procedure
DROP PROCEDURE IF EXISTS create_index_if_not_exists;

-- =============================================
-- NOTES:
-- This migration uses a stored procedure to safely create indexes
-- only if they don't already exist.
-- Compatible with MySQL 5.7 and later.
-- =============================================
