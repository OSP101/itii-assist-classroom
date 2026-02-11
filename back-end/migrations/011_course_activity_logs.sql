-- Migration: Add course_activity_logs table
-- Date: 2026-02-06
-- Purpose: Track all actions within a course for audit and monitoring

CREATE TABLE IF NOT EXISTS `course_activity_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `course_id` VARCHAR(100) NOT NULL COMMENT 'รหัสวิชาที่เกิดกิจกรรม',
  `actor_user_id` BIGINT NOT NULL COMMENT 'ผู้กระทำ (user id)',
  `action` VARCHAR(50) NOT NULL COMMENT 'ประเภทการกระทำ',
  `category` VARCHAR(30) NOT NULL DEFAULT 'general' COMMENT 'หมวดหมู่',
  `target_type` VARCHAR(50) NULL COMMENT 'ประเภทเป้าหมาย เช่น student, assignment, score',
  `target_id` VARCHAR(100) NULL COMMENT 'ID ของเป้าหมาย',
  `target_name` VARCHAR(255) NULL COMMENT 'ชื่อเป้าหมาย เช่น ชื่องาน, ชื่อนักศึกษา',
  `detail` JSON NULL COMMENT 'รายละเอียดเพิ่มเติม',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cal_course_id` (`course_id`),
  INDEX `idx_cal_actor` (`actor_user_id`),
  INDEX `idx_cal_action` (`action`),
  INDEX `idx_cal_category` (`category`),
  INDEX `idx_cal_created_at` (`created_at`),
  INDEX `idx_cal_course_action` (`course_id`, `action`),
  INDEX `idx_cal_course_created` (`course_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='บันทึกกิจกรรมภายในรายวิชา';
