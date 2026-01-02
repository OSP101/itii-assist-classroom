-- Migration: Fix group sub-item constraint
-- ลบ unique constraint ที่ทำให้ไม่สามารถ submit คะแนนกลุ่มที่มี sub-items ได้
-- เพราะ constraint เดิมคือ UNIQUE (assignment_id, group_id, sub_item_id) 
-- แต่เราเก็บคะแนนแยกต่อ student ทำให้ insert member คนที่ 2+ จะ fail

-- Drop the problematic constraint
ALTER TABLE scores DROP INDEX uq_group_sub_item;

-- Note: uq_student_sub_item UNIQUE (assignment_id, student_id, sub_item_id) ยังคงอยู่
-- ซึ่งเป็น constraint ที่ถูกต้องแล้ว เพราะป้องกันการ submit คะแนนซ้ำสำหรับนักศึกษาคนเดียวกัน
