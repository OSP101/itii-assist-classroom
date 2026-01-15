-- Migration: Add support for multiple attendance sessions per assignment
-- Description: สร้างตาราง junction สำหรับเชื่อมโยง Assignment กับ AttendanceSession แบบ many-to-many
-- และเพิ่ม condition field (AND/OR) สำหรับกำหนดเงื่อนไขการเช็คชื่อ

-- 1. สร้างตาราง assignment_attendance_links (junction table)
CREATE TABLE IF NOT EXISTS assignment_attendance_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    attendance_session_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_assignment_attendance (assignment_id, attendance_session_id),
    
    CONSTRAINT fk_aal_assignment
        FOREIGN KEY (assignment_id) 
        REFERENCES assignments(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_aal_attendance
        FOREIGN KEY (attendance_session_id) 
        REFERENCES attendance_sessions(id) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. เพิ่ม column attendance_condition ใน assignments
-- 'and' = ต้องเช็คชื่อทุกรอบที่ผูกไว้
-- 'or' = ต้องเช็คชื่ออย่างน้อย 1 รอบ
ALTER TABLE assignments 
ADD COLUMN attendance_condition ENUM('and', 'or') DEFAULT 'or' 
AFTER linked_attendance_session_id;

-- 3. Migrate existing data จาก linked_attendance_session_id ไป junction table
INSERT INTO assignment_attendance_links (assignment_id, attendance_session_id, created_at)
SELECT id, linked_attendance_session_id, NOW()
FROM assignments 
WHERE linked_attendance_session_id IS NOT NULL;

-- 4. (Optional) Drop old column after confirming migration - COMMENTED OUT for safety
-- Run this manually after verifying data migration
-- ALTER TABLE assignments DROP COLUMN linked_attendance_session_id;

-- Create index for better query performance
CREATE INDEX idx_aal_assignment ON assignment_attendance_links(assignment_id);
CREATE INDEX idx_aal_attendance ON assignment_attendance_links(attendance_session_id);
