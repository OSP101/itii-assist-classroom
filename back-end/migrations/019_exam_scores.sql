-- Exam Score System Migration
-- คะแนนสอบกลางภาคและปลายภาค

-- Create exam_settings table
CREATE TABLE IF NOT EXISTS exam_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id VARCHAR(21) NOT NULL,
    exam_type ENUM('midterm', 'final') NOT NULL COMMENT 'ประเภทการสอบ: midterm=กลางภาค, final=ปลายภาค',
    component ENUM('lab', 'lecture') NOT NULL COMMENT 'องค์ประกอบ: lab=ปฏิบัติการ, lecture=บรรยาย',
    max_score DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'คะแนนเต็ม',
    is_visible BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'แสดงผลให้นักศึกษาเห็นหรือไม่',
    is_active BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'เปิดใช้งานหรือไม่',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_course_exam_component (course_id, exam_type, component)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create exam_scores table
CREATE TABLE IF NOT EXISTS exam_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_setting_id INT NOT NULL,
    student_id BIGINT NOT NULL,
    score DECIMAL(5, 2) DEFAULT NULL COMMENT 'คะแนนที่ได้',
    comment TEXT DEFAULT NULL COMMENT 'หมายเหตุ',
    graded_by BIGINT DEFAULT NULL COMMENT 'ผู้ให้คะแนน',
    graded_at DATETIME DEFAULT NULL COMMENT 'วันเวลาที่ให้คะแนน',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_setting_id) REFERENCES exam_settings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_setting_student (exam_setting_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for performance
CREATE INDEX idx_exam_settings_course ON exam_settings(course_id);
CREATE INDEX idx_exam_scores_setting ON exam_scores(exam_setting_id);
CREATE INDEX idx_exam_scores_student ON exam_scores(student_id);
CREATE INDEX idx_exam_scores_grader ON exam_scores(graded_by);
