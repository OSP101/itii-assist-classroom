-- Migration: Add Performance Indexes
-- Purpose: Improve query performance for high-traffic endpoints
-- Date: 2026-02-01
-- Note: MySQL compatible - uses DROP INDEX IF EXISTS before CREATE INDEX

-- =============================================
-- Helper: Set to ignore errors for index operations
-- =============================================

-- =============================================
-- Scores Table Indexes
-- Note: scores table links to courses via assignments table
-- =============================================

-- Index for score lookup by assignment and student (most common query)
DROP INDEX idx_scores_assignment_student ON scores;
CREATE INDEX idx_scores_assignment_student ON scores(assignment_id, student_id);

-- Index for TA activity queries - counting grades by grader
DROP INDEX idx_scores_graded_by ON scores;
CREATE INDEX idx_scores_graded_by ON scores(graded_by, graded_at);

-- Composite index for sub-item scoring
DROP INDEX idx_scores_assignment_subitem_student ON scores;
CREATE INDEX idx_scores_assignment_subitem_student ON scores(assignment_id, sub_item_id, student_id);

-- Index for group scoring
DROP INDEX idx_scores_assignment_group ON scores;
CREATE INDEX idx_scores_assignment_group ON scores(assignment_id, group_id);

-- =============================================
-- Attendance Records Table Indexes
-- =============================================

-- Index for attendance stats aggregation by session
DROP INDEX idx_attendance_records_session_status ON attendance_records;
CREATE INDEX idx_attendance_records_session_status ON attendance_records(attendance_session_id, status);

-- Index for student attendance lookup
DROP INDEX idx_attendance_records_student_session ON attendance_records;
CREATE INDEX idx_attendance_records_student_session ON attendance_records(student_id, attendance_session_id);

-- Index for check-in time queries
DROP INDEX idx_attendance_records_checkin ON attendance_records;
CREATE INDEX idx_attendance_records_checkin ON attendance_records(attendance_session_id, check_in_time);

-- =============================================
-- Course Section Students Table Indexes
-- =============================================

-- Index for counting students per section
DROP INDEX idx_css_section ON course_section_students;
CREATE INDEX idx_css_section ON course_section_students(course_section_id);

-- Index for finding courses a student is enrolled in
DROP INDEX idx_css_student ON course_section_students;
CREATE INDEX idx_css_student ON course_section_students(student_id);

-- =============================================
-- Course TAs Table Indexes
-- =============================================

-- Index for counting TAs per course
DROP INDEX idx_course_tas_course ON course_tas;
CREATE INDEX idx_course_tas_course ON course_tas(course_id);

-- Index for finding courses a TA is assigned to
DROP INDEX idx_course_tas_user ON course_tas;
CREATE INDEX idx_course_tas_user ON course_tas(user_id);

-- =============================================
-- Course Instructors Table Indexes
-- =============================================

-- Index for counting instructors per course
DROP INDEX idx_course_instructors_course ON course_instructors;
CREATE INDEX idx_course_instructors_course ON course_instructors(course_id);

-- Index for getMyCourses - finding courses by instructor
DROP INDEX idx_course_instructors_user ON course_instructors;
CREATE INDEX idx_course_instructors_user ON course_instructors(user_id);

-- =============================================
-- Course Sections Table Indexes
-- =============================================

-- Index for finding sections by course
DROP INDEX idx_course_sections_course ON course_sections;
CREATE INDEX idx_course_sections_course ON course_sections(course_id);

-- =============================================
-- Assignments Table Indexes
-- =============================================

-- Index for filtering assignments by course and type
DROP INDEX idx_assignments_course_type ON assignments;
CREATE INDEX idx_assignments_course_type ON assignments(course_id, assignment_type);

-- Index for assignment due date queries
DROP INDEX idx_assignments_due_date ON assignments;
CREATE INDEX idx_assignments_due_date ON assignments(course_id, due_date);

-- =============================================
-- Attendance Sessions Table Indexes
-- =============================================

-- Index for listing sessions by course
DROP INDEX idx_attendance_sessions_course ON attendance_sessions;
CREATE INDEX idx_attendance_sessions_course ON attendance_sessions(course_id);

-- Index for finding active sessions
DROP INDEX idx_attendance_sessions_course_status ON attendance_sessions;
CREATE INDEX idx_attendance_sessions_course_status ON attendance_sessions(course_id, status);

-- Index for time-based queries
DROP INDEX idx_attendance_sessions_time ON attendance_sessions;
CREATE INDEX idx_attendance_sessions_time ON attendance_sessions(course_id, start_time, end_time);

-- =============================================
-- Queue Related Indexes
-- =============================================

-- Index for queue sessions by course
DROP INDEX idx_queue_sessions_course ON queue_sessions;
CREATE INDEX idx_queue_sessions_course ON queue_sessions(course_id, status);

-- Index for queue bookings lookup
DROP INDEX idx_queue_bookings_session_status ON queue_bookings;
CREATE INDEX idx_queue_bookings_session_status ON queue_bookings(queue_session_id, status);

-- Index for student queue lookups
DROP INDEX idx_queue_bookings_student ON queue_bookings;
CREATE INDEX idx_queue_bookings_student ON queue_bookings(student_id, status);

-- =============================================
-- Users Table Indexes (if not exists)
-- =============================================

-- Index for role-based queries
DROP INDEX idx_users_role_active ON users;
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Index for student lookups by student_id
DROP INDEX idx_students_student_id ON students;
CREATE INDEX idx_students_student_id ON students(student_id);

-- =============================================
-- Additional Covering Indexes for Common Queries
-- =============================================

-- Covering index for score statistics (via assignment)
DROP INDEX idx_scores_stats ON scores;
CREATE INDEX idx_scores_stats ON scores(assignment_id, score, graded_at);
