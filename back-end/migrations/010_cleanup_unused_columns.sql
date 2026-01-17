-- =====================================================
-- Migration: 010_cleanup_unused_columns.sql
-- คำอธิบาย: ลบคอลัมน์ที่ไม่ได้ใช้งานในระบบแล้ว
-- วันที่: 17 มกราคม 2569
-- =====================================================
-- 
-- คอลัมน์ที่จะลบ:
-- 1. users.linked_student_id - ไม่ได้ใช้ใน Model
-- 2. attendance_records.timestamp - deprecated (ใช้ check_in_time แทน)
-- 3. attendance_records.sso_identifier - ไม่ได้ใช้ใน Model
-- 4. attendance_records.verified - ไม่ได้ใช้ใน Model (ซ้ำซ้อนกับ pin_verified + location_verified)
-- 5. attendance_sessions.duration_minutes - ไม่ได้ใช้ใน Model
-- 6. course_section_students.status - ไม่ได้ใช้ใน Model
--
-- LEGACY คอลัมน์ที่ยังเก็บไว้ (backward compatibility):
-- - courses.instructor_id
-- - assignments.linked_attendance_session_id
-- - attendance_sessions.course_section_id
-- =====================================================

-- =====================================================
-- Helper: ตรวจสอบก่อนลบทุกครั้ง
-- =====================================================

-- 0. ลบ users.linked_student_id
-- ลบ FK constraint ก่อน (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'users' 
               AND constraint_name = 'fk_users_linked_student');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE users DROP FOREIGN KEY fk_users_linked_student', 'SELECT "FK fk_users_linked_student does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ลบ index (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'users' 
               AND index_name = 'fk_users_linked_student');
SET @sqlstmt := IF(@exist > 0, 'DROP INDEX fk_users_linked_student ON users', 'SELECT "Index fk_users_linked_student does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ลบ column (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'users' 
               AND column_name = 'linked_student_id');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE users DROP COLUMN linked_student_id', 'SELECT "Column linked_student_id does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 1. ลบ attendance_records.timestamp
-- =====================================================

-- Migrate ข้อมูลก่อน (ถ้าคอลัมน์ยังมี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'attendance_records' 
               AND column_name = 'timestamp');
SET @sqlstmt := IF(@exist > 0, 
    'UPDATE attendance_records SET check_in_time = `timestamp` WHERE check_in_time IS NULL AND `timestamp` IS NOT NULL', 
    'SELECT "Column timestamp does not exist - skip migration"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ลบ index (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'attendance_records' 
               AND index_name = 'idx_att_timestamp');
SET @sqlstmt := IF(@exist > 0, 'DROP INDEX idx_att_timestamp ON attendance_records', 'SELECT "Index idx_att_timestamp does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ลบ column (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'attendance_records' 
               AND column_name = 'timestamp');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE attendance_records DROP COLUMN `timestamp`', 'SELECT "Column timestamp does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. ลบ attendance_records.sso_identifier
-- =====================================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'attendance_records' 
               AND column_name = 'sso_identifier');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE attendance_records DROP COLUMN sso_identifier', 'SELECT "Column sso_identifier does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. ลบ attendance_records.verified
-- =====================================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'attendance_records' 
               AND column_name = 'verified');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE attendance_records DROP COLUMN verified', 'SELECT "Column verified does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 4. ลบ attendance_sessions.duration_minutes
-- =====================================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'attendance_sessions' 
               AND column_name = 'duration_minutes');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE attendance_sessions DROP COLUMN duration_minutes', 'SELECT "Column duration_minutes does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 5. ลบ course_section_students.status
-- =====================================================
-- ลบ index ก่อน (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'course_section_students' 
               AND index_name = 'idx_css_status');
SET @sqlstmt := IF(@exist > 0, 'DROP INDEX idx_css_status ON course_section_students', 'SELECT "Index idx_css_status does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ลบ column (ถ้ามี)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'course_section_students' 
               AND column_name = 'status');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE course_section_students DROP COLUMN status', 'SELECT "Column status does not exist"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =====================================================
-- สรุปการเปลี่ยนแปลง
-- =====================================================
-- 
-- ลบ 6 คอลัมน์ (ถ้ามี):
-- ❌ users.linked_student_id
-- ❌ attendance_records.timestamp
-- ❌ attendance_records.sso_identifier
-- ❌ attendance_records.verified
-- ❌ attendance_sessions.duration_minutes
-- ❌ course_section_students.status
--
-- =====================================================

SELECT 'Migration completed successfully!' as result;
-- ❌ attendance_records.sso_identifier
-- ❌ attendance_records.verified
-- ❌ attendance_sessions.duration_minutes
-- ❌ course_section_students.status
--
-- =====================================================
