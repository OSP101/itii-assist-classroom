-- Migration: Add 'assignment' to assignment_type enum
-- Date: 2026-01-26
-- Description: เพิ่มประเภท 'assignment' สำหรับงานที่สั่งให้ทำที่บ้าน (การบ้าน)
-- Safe: ไม่กระทบข้อมูลเดิม - เพียงแค่เพิ่ม enum value ใหม่

-- ============================================================
-- STEP 1: Add 'assignment' to assignment_type ENUM
-- ============================================================
-- MySQL allows adding new enum values at the end without data loss
ALTER TABLE assignments 
MODIFY COLUMN assignment_type 
ENUM('individual', 'permanent_group', 'weekly_group', 'assignment') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci 
NOT NULL DEFAULT 'individual'
COMMENT 'ประเภท: individual=ปฏิบัติการเดี่ยว(Lab), permanent_group=กลุ่มถาวร, weekly_group=กลุ่มรายสัปดาห์, assignment=การบ้าน';

-- ============================================================
-- VERIFICATION: Check the change was applied
-- ============================================================
-- Run this to verify:
-- SHOW COLUMNS FROM assignments LIKE 'assignment_type';
-- Expected: enum('individual','permanent_group','weekly_group','assignment')

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. งานเดิมที่เป็น 'individual' จะยังคงเป็น 'individual' (แสดงในแท็บ Lab)
-- 2. งานใหม่สามารถเลือกเป็น 'assignment' ได้ (แสดงในแท็บ Assignment)
-- 3. ไม่มีการ migrate ข้อมูลเดิม - ถ้าต้องการเปลี่ยนงานเดิมให้เป็น assignment 
--    ต้องแก้ไขผ่านหน้า UI หรือรัน UPDATE manual

-- ============================================================
-- ROLLBACK (ถ้าต้องการย้อนกลับ):
-- ============================================================
-- WARNING: จะต้องเปลี่ยนงานที่เป็น 'assignment' กลับเป็น 'individual' ก่อน
-- UPDATE assignments SET assignment_type = 'individual' WHERE assignment_type = 'assignment';
-- ALTER TABLE assignments 
-- MODIFY COLUMN assignment_type 
-- ENUM('individual', 'permanent_group', 'weekly_group') 
-- CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci 
-- NOT NULL DEFAULT 'individual';
