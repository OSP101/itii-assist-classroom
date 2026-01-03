-- Migration: Complete fix for scores table
-- รวมทุก migration ที่เกี่ยวกับ scores table เพื่อให้รันได้ในครั้งเดียว
-- Created: 2026-01-04
-- Author: GitHub Copilot

-- ตรวจสอบและเพิ่มคอลัมน์ sub_item_id ถ้ายังไม่มี
-- Step 1: Add sub_item_id column if not exists
SET @col_exists = (SELECT COUNT(*) 
                   FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'scores' 
                   AND COLUMN_NAME = 'sub_item_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE scores ADD COLUMN sub_item_id INT NULL AFTER group_id',
    'SELECT "sub_item_id column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add foreign key constraint if not exists
SET @fk_exists = (SELECT COUNT(*) 
                  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'scores' 
                  AND CONSTRAINT_NAME = 'fk_scores_sub_item');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE scores ADD CONSTRAINT fk_scores_sub_item FOREIGN KEY (sub_item_id) REFERENCES assignment_sub_items(id) ON DELETE CASCADE',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add index if not exists
SET @idx_exists = (SELECT COUNT(*) 
                   FROM INFORMATION_SCHEMA.STATISTICS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'scores' 
                   AND INDEX_NAME = 'idx_scores_sub_item');

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_scores_sub_item ON scores(sub_item_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Drop old problematic unique constraint if exists
SET @uq_group_exists = (SELECT COUNT(*) 
                        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                        WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = 'scores' 
                        AND CONSTRAINT_NAME = 'uq_group_sub_item');

SET @sql = IF(@uq_group_exists > 0, 
    'ALTER TABLE scores DROP INDEX uq_group_sub_item',
    'SELECT "uq_group_sub_item constraint does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Add unique constraint for student scores if not exists
SET @uq_student_exists = (SELECT COUNT(*) 
                          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                          WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'scores' 
                          AND CONSTRAINT_NAME = 'uq_student_sub_item');

SET @sql = IF(@uq_student_exists = 0, 
    'ALTER TABLE scores ADD CONSTRAINT uq_student_sub_item UNIQUE (assignment_id, student_id, sub_item_id)',
    'SELECT "uq_student_sub_item constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify changes
SELECT 'Migration completed successfully!' AS status;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scores'
ORDER BY ORDINAL_POSITION;
