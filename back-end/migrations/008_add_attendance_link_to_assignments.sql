-- Migration: Add attendance session link to assignments
-- Description: เพิ่มความสามารถในการลิงก์งานกับ Attendance Session
-- เพื่อตรวจสอบว่านักศึกษามาเรียนหรือไม่ก่อนลงคะแนน

-- Add column for linking attendance session
ALTER TABLE assignments 
ADD COLUMN linked_attendance_session_id INT NULL 
AFTER week_number;

-- Add foreign key constraint
ALTER TABLE assignments
ADD CONSTRAINT fk_assignment_attendance_session
FOREIGN KEY (linked_attendance_session_id) 
REFERENCES attendance_sessions(id) 
ON DELETE SET NULL;

-- Add index for faster lookup
CREATE INDEX idx_assignments_linked_attendance ON assignments(linked_attendance_session_id);

-- Comment explaining the field
ALTER TABLE assignments 
MODIFY COLUMN linked_attendance_session_id INT NULL 
COMMENT 'ถ้า set ค่านี้ จะตรวจสอบว่านักศึกษามาเรียนหรือไม่ก่อนลงคะแนน (ขาด=ไม่อนุญาตลงคะแนน)';
