-- Migration: Add is_active column to classrooms table
-- Description: เพิ่ม column is_active สำหรับเปิด/ปิดการใช้งานห้องเรียน

ALTER TABLE `classrooms` 
ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'สถานะเปิด/ปิดใช้งาน' AFTER `is_deleted`;

-- Update existing records to be active by default
UPDATE `classrooms` SET `is_active` = 1 WHERE `is_active` IS NULL;
