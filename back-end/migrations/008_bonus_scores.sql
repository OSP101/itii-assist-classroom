-- Migration: Create bonus_scores table for special points (Q&A in class)
-- Date: 2026-01-12

-- Create bonus_scores table
CREATE TABLE IF NOT EXISTS bonus_scores (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id VARCHAR(21) NOT NULL,
    student_id varchar(11) NOT NULL,
    score DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    reason VARCHAR(255) NULL COMMENT 'เหตุผลการให้คะแนน เช่น ตอบคำถามในห้องเรียน',
    given_by BIGINT NOT NULL COMMENT 'ผู้ให้คะแนน (instructor/ta)',
    given_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (given_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_bonus_scores_course (course_id),
    INDEX idx_bonus_scores_student (student_id),
    INDEX idx_bonus_scores_course_student (course_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment
ALTER TABLE bonus_scores COMMENT = 'ตารางเก็บคะแนนพิเศษจากการถามตอบในห้องเรียน';
