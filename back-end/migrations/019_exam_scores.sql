-- =====================================================
-- ตาราง: exam_settings (ตั้งค่าการแสดงผลคะแนนสอบ)
-- สถานะ: ✅ ACTIVE
-- Model: ExamSetting.js
-- คำอธิบาย: เก็บการตั้งค่าการแสดงผลคะแนนสอบแต่ละประเภท
-- =====================================================
CREATE TABLE IF NOT EXISTS `exam_settings` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รายวิชา',
  `exam_type` enum('midterm', 'final') NOT NULL COMMENT 'ประเภทการสอบ: midterm=กลางภาค, final=ปลายภาค',
  `component` enum('lab', 'lecture') NOT NULL COMMENT 'องค์ประกอบ: lab=ปฏิบัติการ, lecture=บรรยาย',
  `max_score` decimal(5,2) NOT NULL DEFAULT 0 COMMENT 'คะแนนเต็ม',
  `is_visible` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'แสดงผลให้นักศึกษาเห็นหรือไม่: 0=ซ่อน, 1=แสดง',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'เปิดใช้งานหรือไม่: 0=ปิด, 1=เปิด',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_exam_settings_course_type_component` (`course_id`, `exam_type`, `component`),
  KEY `idx_exam_settings_course` (`course_id`),
  CONSTRAINT `fk_exam_settings_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: exam_scores (คะแนนสอบ)
-- สถานะ: ✅ ACTIVE
-- Model: ExamScore.js
-- คำอธิบาย: เก็บคะแนนสอบของนักศึกษาแต่ละคน
-- =====================================================
CREATE TABLE IF NOT EXISTS `exam_scores` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `exam_setting_id` int NOT NULL COMMENT 'FK->exam_settings: การตั้งค่าการสอบ',
  `student_id` bigint NOT NULL COMMENT 'FK->students: นักศึกษา',
  `score` decimal(5,2) DEFAULT NULL COMMENT 'คะแนนที่ได้',
  `comment` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `graded_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้ให้คะแนน',
  `graded_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่ให้คะแนน',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_exam_scores_setting_student` (`exam_setting_id`, `student_id`),
  KEY `idx_exam_scores_student` (`student_id`),
  KEY `idx_exam_scores_graded_by` (`graded_by`),
  CONSTRAINT `fk_exam_scores_setting` FOREIGN KEY (`exam_setting_id`) REFERENCES `exam_settings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_scores_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_scores_graded_by` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- สร้าง Index เพิ่มเติมสำหรับ Performance
-- =====================================================
CREATE INDEX `idx_exam_scores_setting_score` ON `exam_scores` (`exam_setting_id`, `score`);
