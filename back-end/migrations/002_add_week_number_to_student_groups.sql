-- =====================================================
-- Migration: 002_add_week_number_to_student_groups.sql
-- Description: เพิ่ม week_number สำหรับกลุ่มรายสัปดาห์
-- Date: 2025-12-31
-- =====================================================

-- เพิ่ม week_number ให้ตาราง student_groups
ALTER TABLE `student_groups`
ADD COLUMN `week_number` INT DEFAULT NULL AFTER `group_type`;

-- สร้าง Index สำหรับ Performance
ALTER TABLE `student_groups`
ADD INDEX `idx_sg_course_type` (`course_id`, `group_type`),
ADD INDEX `idx_sg_week` (`week_number`);

ALTER TABLE `student_group_members`
ADD INDEX `idx_sgm_group` (`group_id`),
ADD INDEX `idx_sgm_student` (`student_id`);

-- =====================================================
-- สิ้นสุด Migration
-- =====================================================
