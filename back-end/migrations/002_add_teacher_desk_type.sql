-- Migration: Add teacher desk type
-- Date: 2024-12-28
-- Description: เพิ่มประเภทโต๊ะอาจารย์ในระบบ

-- Modify desk type enum to include 'teacher'
ALTER TABLE desks MODIFY COLUMN type ENUM('computer', 'normal', 'teacher') NOT NULL DEFAULT 'normal' COMMENT 'ประเภทโต๊ะ';
