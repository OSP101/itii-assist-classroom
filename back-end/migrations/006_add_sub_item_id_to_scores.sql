-- Migration: Add sub_item_id to scores table for sub-item level grading
-- เพิ่ม sub_item_id เพื่อเก็บคะแนนแยกแต่ละข้อย่อย

-- Add sub_item_id column
ALTER TABLE scores
ADD COLUMN sub_item_id INT NULL AFTER group_id,
ADD CONSTRAINT fk_scores_sub_item 
    FOREIGN KEY (sub_item_id) 
    REFERENCES assignment_sub_items(id) 
    ON DELETE CASCADE;

-- Add index for faster lookup
CREATE INDEX idx_scores_sub_item ON scores(sub_item_id);

-- Add composite unique constraint to prevent duplicate sub-item scores
-- (one score per student per sub-item, or one score per group per sub-item)
ALTER TABLE scores
ADD CONSTRAINT uq_student_sub_item UNIQUE (assignment_id, student_id, sub_item_id),
ADD CONSTRAINT uq_group_sub_item UNIQUE (assignment_id, group_id, sub_item_id);
