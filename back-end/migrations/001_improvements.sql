-- =====================================================
-- Migration: 001_improvements.sql
-- Description: ปรับปรุงโครงสร้างฐานข้อมูลเพิ่มเติม
-- Date: 2024-12-19
-- =====================================================

-- =====================================================
-- 1. เพิ่ม is_active ให้ตาราง users
-- =====================================================
ALTER TABLE `users`
ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `provider`;

-- =====================================================
-- 2. เพิ่ม is_active ให้ตาราง students
-- =====================================================
ALTER TABLE `students`
ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `extra`;

-- =====================================================
-- 3. เพิ่ม status ให้ตาราง attendance_sessions
-- =====================================================
ALTER TABLE `attendance_sessions`
ADD COLUMN `status` ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft' AFTER `end_time`;

-- =====================================================
-- 4. เพิ่ม status ให้ตาราง queue_sessions
-- =====================================================
ALTER TABLE `queue_sessions`
ADD COLUMN `status` ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft' AFTER `end_time`;

-- =====================================================
-- 5. เพิ่ม course_section_id ให้ตาราง queue_sessions
-- (สำหรับเปิดคิวเฉพาะ Section)
-- =====================================================
ALTER TABLE `queue_sessions`
ADD COLUMN `course_section_id` BIGINT DEFAULT NULL AFTER `course_id`,
ADD CONSTRAINT `fk_qs_section` FOREIGN KEY (`course_section_id`) 
    REFERENCES `course_sections` (`id`) ON DELETE SET NULL;

-- =====================================================
-- 6. เพิ่ม status ให้ตาราง course_section_students
-- (สำหรับกรณีถอนวิชา/Drop)
-- =====================================================
ALTER TABLE `course_section_students`
ADD COLUMN `status` ENUM('enrolled', 'dropped', 'withdrawn') NOT NULL DEFAULT 'enrolled' AFTER `student_id`;

-- =====================================================
-- 7. เพิ่ม queue_number ให้ตาราง queue_records
-- =====================================================
ALTER TABLE `queue_records`
ADD COLUMN `queue_number` INT DEFAULT NULL AFTER `seat_number`;

-- =====================================================
-- 8. เพิ่ม is_active ให้ตาราง score_items
-- =====================================================
ALTER TABLE `score_items`
ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `order_index`;

-- =====================================================
-- 9. เพิ่ม is_active ให้ตาราง score_groups
-- =====================================================
ALTER TABLE `score_groups`
ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `max_total`;

-- =====================================================
-- 10. เพิ่ม Indexes สำหรับ Performance
-- =====================================================

-- Index สำหรับ system_logs
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_action` (`action`),
ADD INDEX `idx_syslog_created_at` (`created_at`);

-- Index สำหรับ attendance_records
ALTER TABLE `attendance_records`
ADD INDEX `idx_att_timestamp` (`timestamp`),
ADD INDEX `idx_att_status` (`status`);

-- Index สำหรับ attendance_sessions
ALTER TABLE `attendance_sessions`
ADD INDEX `idx_attsess_status` (`status`),
ADD INDEX `idx_attsess_start_time` (`start_time`);

-- Index สำหรับ score_records
ALTER TABLE `score_records`
ADD INDEX `idx_sr_status` (`status`);

-- Index สำหรับ queue_records
ALTER TABLE `queue_records`
ADD INDEX `idx_qr_status` (`status`),
ADD INDEX `idx_qr_booked_at` (`booked_at`);

-- Index สำหรับ queue_sessions
ALTER TABLE `queue_sessions`
ADD INDEX `idx_qs_status` (`status`),
ADD INDEX `idx_qs_start_time` (`start_time`);

-- Index สำหรับ users
ALTER TABLE `users`
ADD INDEX `idx_users_role` (`role`),
ADD INDEX `idx_users_is_active` (`is_active`);

-- Index สำหรับ students
ALTER TABLE `students`
ADD INDEX `idx_students_is_active` (`is_active`);

-- Index สำหรับ courses
ALTER TABLE `courses`
ADD INDEX `idx_courses_year_semester` (`year`, `semester`);

-- Index สำหรับ course_section_students
ALTER TABLE `course_section_students`
ADD INDEX `idx_css_status` (`status`);

-- =====================================================
-- 11. เพิ่ม note/comment field ให้บางตาราง
-- =====================================================

-- เพิ่ม note ให้ queue_records (สำหรับ TA บันทึกหมายเหตุ)
ALTER TABLE `queue_records`
ADD COLUMN `note` TEXT DEFAULT NULL AFTER `status`;

-- เพิ่ม note ให้ attendance_records (สำหรับบันทึกเหตุผลมาสาย/ขาด)
ALTER TABLE `attendance_records`
ADD COLUMN `note` TEXT DEFAULT NULL AFTER `verified`;

-- =====================================================
-- สิ้นสุด Migration
-- =====================================================
