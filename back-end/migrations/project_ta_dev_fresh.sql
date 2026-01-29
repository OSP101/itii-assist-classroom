-- =====================================================
-- ITII Assist Classroom - Fresh Database Setup
-- =====================================================
-- วันที่สร้าง: 17 มกราคม 2569
-- คำอธิบาย: ไฟล์สำหรับสร้างฐานข้อมูลใหม่ตั้งแต่ต้น
-- วิธีใช้: รันไฟล์นี้บน MySQL/MariaDB ที่มี database ว่างเปล่า
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- =====================================================
-- ตาราง: students (นักศึกษา)
-- คำอธิบาย: เก็บข้อมูลนักศึกษาทั้งหมดในระบบ
-- =====================================================
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'รหัสภายในระบบ (Primary Key)',
  `student_id` varchar(11) NOT NULL COMMENT 'รหัสนักศึกษา เช่น 65070501001',
  `full_name` varchar(255) NOT NULL COMMENT 'ชื่อ-นามสกุล',
  `email` varchar(255) DEFAULT NULL COMMENT 'อีเมลนักศึกษา',
  `extra` json DEFAULT NULL COMMENT 'ข้อมูลเพิ่มเติมในรูปแบบ JSON',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะ: 1=ใช้งาน, 0=ไม่ใช้งาน',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`),
  KEY `idx_students_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: users (ผู้ใช้ระบบ)
-- คำอธิบาย: เก็บข้อมูลผู้ใช้งานทั้งหมด (admin, instructor, ta)
-- =====================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้ (Primary Key)',
  `username` varchar(100) NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับ login',
  `password_hash` char(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'รหัสผ่านที่เข้ารหัสด้วย bcrypt',
  `role` enum('admin','instructor','ta') NOT NULL COMMENT 'บทบาท: admin=ผู้ดูแลระบบ, instructor=อาจารย์, ta=ผู้ช่วยสอน',
  `full_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อ-นามสกุลเต็ม',
  `email` varchar(255) DEFAULT NULL COMMENT 'อีเมล',
  `avatar` longtext COMMENT 'รูปโปรไฟล์ (Base64 หรือ URL)',
  `google_id` varchar(255) DEFAULT NULL COMMENT 'Google OAuth ID (สำหรับ login ผ่าน Google)',
  `provider` enum('local','google') NOT NULL DEFAULT 'local' COMMENT 'วิธีการ login: local=ใช้ username/password, google=ใช้ Google OAuth',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะการใช้งาน: 1=ใช้งานได้, 0=ถูกปิด',
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'ต้องเปลี่ยนรหัสผ่านเมื่อ login ครั้งถัดไป',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: refresh_tokens (Token สำหรับ refresh JWT)
-- คำอธิบาย: เก็บ refresh token สำหรับต่ออายุ JWT
-- =====================================================
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `jti` varchar(100) NOT NULL COMMENT 'JWT ID (unique identifier)',
  `user_id` bigint NOT NULL COMMENT 'FK->users: เจ้าของ token',
  `revoked` tinyint(1) DEFAULT '0' COMMENT 'ถูกยกเลิกหรือไม่: 0=ใช้ได้, 1=ถูกยกเลิก',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `expires_at` datetime NOT NULL COMMENT 'วันหมดอายุ',
  `meta` json DEFAULT NULL COMMENT 'ข้อมูลเพิ่มเติม เช่น device info',
  PRIMARY KEY (`id`),
  UNIQUE KEY `jti` (`jti`),
  KEY `fk_rt_user` (`user_id`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: courses (รายวิชา)
-- คำอธิบาย: เก็บข้อมูลรายวิชาทั้งหมด
-- =====================================================
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` varchar(21) NOT NULL COMMENT 'รหัสรายวิชา (nanoid 21 ตัวอักษร)',
  `code` varchar(100) NOT NULL COMMENT 'รหัสวิชา เช่น 01076001',
  `name` varchar(255) NOT NULL COMMENT 'ชื่อวิชา',
  `year` smallint NOT NULL COMMENT 'ปีการศึกษา (พ.ศ.)',
  `semester` tinyint NOT NULL COMMENT 'ภาคเรียน: 1, 2, 3(ฤดูร้อน)',
  `description` text COMMENT 'คำอธิบายรายวิชา',
  `image` longtext COMMENT 'รูปปกรายวิชา (Base64)',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะ: 1=เปิดใช้งาน, 0=ปิด',
  `attention_threshold` tinyint UNSIGNED NOT NULL DEFAULT '60' COMMENT 'เกณฑ์เปอร์เซ็นต์สำหรับแจ้งเตือนนักศึกษาที่ต้องดูแล',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `idx_courses_year_semester` (`year`,`semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: course_instructors (อาจารย์ประจำวิชา)
-- คำอธิบาย: ความสัมพันธ์ Many-to-Many ระหว่างรายวิชากับอาจารย์
--           รองรับหลายอาจารย์ต่อวิชา
-- =====================================================
DROP TABLE IF EXISTS `course_instructors`;
CREATE TABLE `course_instructors` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `user_id` bigint NOT NULL COMMENT 'FK->users: รหัสอาจารย์',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'อาจารย์หลักหรือไม่: 1=อาจารย์หลัก, 0=อาจารย์ร่วม',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่เพิ่มเข้ารายวิชา',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_course_instructor` (`course_id`,`user_id`),
  KEY `fk_ci_course` (`course_id`),
  KEY `fk_ci_user` (`user_id`),
  CONSTRAINT `fk_ci_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: course_sections (กลุ่มเรียน)
-- คำอธิบาย: กลุ่มเรียน/Section ของแต่ละรายวิชา
-- =====================================================
DROP TABLE IF EXISTS `course_sections`;
CREATE TABLE `course_sections` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `section_no` varchar(50) NOT NULL COMMENT 'หมายเลขกลุ่มเรียน เช่น 1, 2, 800',
  `note` varchar(255) DEFAULT NULL COMMENT 'หมายเหตุ เช่น "เรียนวันจันทร์"',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_section` (`course_id`,`section_no`),
  CONSTRAINT `fk_cs_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: course_section_students (นักศึกษาในกลุ่มเรียน)
-- คำอธิบาย: ความสัมพันธ์ระหว่างนักศึกษากับกลุ่มเรียน
-- =====================================================
DROP TABLE IF EXISTS `course_section_students`;
CREATE TABLE `course_section_students` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_section_id` bigint NOT NULL COMMENT 'FK->course_sections: รหัสกลุ่มเรียน',
  `student_id` bigint NOT NULL COMMENT 'FK->students: รหัสนักศึกษา',
  `enrolled_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่ลงทะเบียน',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enroll` (`course_section_id`,`student_id`),
  KEY `fk_css_student` (`student_id`),
  CONSTRAINT `fk_css_section` FOREIGN KEY (`course_section_id`) REFERENCES `course_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_css_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: course_tas (ผู้ช่วยสอนประจำวิชา)
-- คำอธิบาย: ความสัมพันธ์ Many-to-Many ระหว่างรายวิชากับ TA
-- =====================================================
DROP TABLE IF EXISTS `course_tas`;
CREATE TABLE `course_tas` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `user_id` bigint NOT NULL COMMENT 'FK->users: รหัส TA',
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่เพิ่มเข้ารายวิชา',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_ta` (`course_id`,`user_id`),
  KEY `fk_ct_user` (`user_id`),
  CONSTRAINT `fk_ct_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ct_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: student_groups (กลุ่มนักศึกษา)
-- คำอธิบาย: กลุ่มนักศึกษาสำหรับทำงานกลุ่ม
--           มี 2 ประเภท: permanent (ตลอดเทอม), temporary (รายสัปดาห์)
-- =====================================================
DROP TABLE IF EXISTS `student_groups`;
CREATE TABLE `student_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `name` varchar(255) NOT NULL COMMENT 'ชื่อกลุ่ม',
  `group_type` enum('permanent','temporary') DEFAULT 'permanent' COMMENT 'ประเภท: permanent=กลุ่มถาวร, temporary=กลุ่มชั่วคราว(รายสัปดาห์)',
  `week_number` int DEFAULT NULL COMMENT 'สัปดาห์ที่ (สำหรับ temporary เท่านั้น)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  PRIMARY KEY (`id`),
  KEY `fk_sg2_course` (`course_id`),
  KEY `idx_sg_course_type` (`course_id`,`group_type`),
  KEY `idx_sg_week` (`week_number`),
  CONSTRAINT `fk_sg2_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: student_group_members (สมาชิกกลุ่มนักศึกษา)
-- คำอธิบาย: ความสัมพันธ์ระหว่างนักศึกษากับกลุ่ม
-- =====================================================
DROP TABLE IF EXISTS `student_group_members`;
CREATE TABLE `student_group_members` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `group_id` bigint NOT NULL COMMENT 'FK->student_groups: รหัสกลุ่ม',
  `student_id` bigint NOT NULL COMMENT 'FK->students: รหัสนักศึกษา',
  `joined_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่เข้าร่วม',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_member` (`group_id`,`student_id`),
  KEY `fk_sgm_student` (`student_id`),
  KEY `idx_sgm_group` (`group_id`),
  KEY `idx_sgm_student` (`student_id`),
  CONSTRAINT `fk_sgm_group` FOREIGN KEY (`group_id`) REFERENCES `student_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sgm_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: attendance_sessions (Session เช็คชื่อ)
-- คำอธิบาย: Session สำหรับเช็คชื่อนักศึกษา
-- =====================================================
DROP TABLE IF EXISTS `attendance_sessions`;
CREATE TABLE `attendance_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `course_section_id` bigint DEFAULT NULL COMMENT 'FK->course_sections (legacy - ใช้ attendance_session_sections แทน)',
  `title` varchar(255) NOT NULL DEFAULT 'Attendance' COMMENT 'ชื่อ session เช่น "สัปดาห์ที่ 1"',
  `pin_code` varchar(50) DEFAULT NULL COMMENT 'รหัส PIN สำหรับเช็คชื่อ',
  `session_type` enum('lecture','lab','online') DEFAULT 'lecture' COMMENT 'ประเภท: lecture=บรรยาย, lab=ปฏิบัติ, online=ออนไลน์',
  `check_location` tinyint(1) DEFAULT '0' COMMENT 'ตรวจสอบตำแหน่งหรือไม่: 1=ตรวจ, 0=ไม่ตรวจ',
  `location_lat` decimal(10,7) DEFAULT NULL COMMENT 'พิกัด Latitude ของห้องเรียน',
  `location_lng` decimal(10,7) DEFAULT NULL COMMENT 'พิกัด Longitude ของห้องเรียน',
  `radius_meters` int DEFAULT '50' COMMENT 'รัศมีที่อนุญาต (เมตร)',
  `start_time` datetime NOT NULL COMMENT 'เวลาเริ่มเช็คชื่อ',
  `end_time` datetime NOT NULL COMMENT 'เวลาสิ้นสุดเช็คชื่อ',
  `late_threshold_minutes` int DEFAULT '15' COMMENT 'เวลาที่ถือว่าสาย (นาที)',
  `status` enum('draft','active','closed') NOT NULL DEFAULT 'draft' COMMENT 'สถานะ: draft=ยังไม่เปิด, active=เปิดอยู่, closed=ปิดแล้ว',
  `created_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้สร้าง',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `fk_att_course` (`course_id`),
  KEY `fk_att_section` (`course_section_id`),
  KEY `fk_att_creator` (`created_by`),
  KEY `idx_attsess_status` (`status`),
  KEY `idx_attsess_start_time` (`start_time`),
  CONSTRAINT `fk_att_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_att_section` FOREIGN KEY (`course_section_id`) REFERENCES `course_sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: attendance_session_sections (Section ของ Session เช็คชื่อ)
-- คำอธิบาย: เชื่อม session เช็คชื่อกับหลาย section (Many-to-Many)
-- =====================================================
DROP TABLE IF EXISTS `attendance_session_sections`;
CREATE TABLE `attendance_session_sections` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `attendance_session_id` bigint NOT NULL COMMENT 'FK->attendance_sessions: รหัส session',
  `course_section_id` bigint NOT NULL COMMENT 'FK->course_sections: รหัส section',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_section` (`attendance_session_id`,`course_section_id`),
  KEY `course_section_id` (`course_section_id`),
  CONSTRAINT `attendance_session_sections_ibfk_1` FOREIGN KEY (`attendance_session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_session_sections_ibfk_2` FOREIGN KEY (`course_section_id`) REFERENCES `course_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: attendance_records (บันทึกการเช็คชื่อ)
-- คำอธิบาย: บันทึกการเช็คชื่อของนักศึกษาแต่ละคน
-- =====================================================
DROP TABLE IF EXISTS `attendance_records`;
CREATE TABLE `attendance_records` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `attendance_session_id` bigint NOT NULL COMMENT 'FK->attendance_sessions: รหัส session',
  `student_id` bigint NOT NULL COMMENT 'FK->students: รหัสนักศึกษา',
  `check_in_time` datetime DEFAULT NULL COMMENT 'เวลาที่เช็คชื่อ',
  `status` enum('present','late','leave','absent') DEFAULT 'absent' COMMENT 'สถานะ: present=มา, late=สาย, leave=ลา, absent=ขาด',
  `google_email` varchar(255) DEFAULT NULL COMMENT 'Email จาก Google (ถ้าเช็คผ่าน Google)',
  `google_id` varchar(255) DEFAULT NULL COMMENT 'Google ID',
  `pin_verified` tinyint(1) DEFAULT '0' COMMENT 'ยืนยัน PIN แล้ว: 1=ใช่, 0=ไม่',
  `location_verified` tinyint(1) DEFAULT '0' COMMENT 'ยืนยันตำแหน่งแล้ว: 1=ใช่, 0=ไม่',
  `note` text COMMENT 'หมายเหตุ เช่น เหตุผลการลา',
  `location_lat` decimal(10,7) DEFAULT NULL COMMENT 'พิกัด Latitude ที่เช็คชื่อ',
  `location_lng` decimal(10,7) DEFAULT NULL COMMENT 'พิกัด Longitude ที่เช็คชื่อ',
  `distance_meters` int DEFAULT NULL COMMENT 'ระยะห่างจากจุดกำหนด (เมตร)',
  `updated_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้แก้ไขล่าสุด',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_att_unique` (`attendance_session_id`,`student_id`),
  KEY `fk_ar_student` (`student_id`),
  KEY `fk_ar_updater` (`updated_by`),
  KEY `idx_att_status` (`status`),
  CONSTRAINT `fk_ar_session` FOREIGN KEY (`attendance_session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: assignments (งานมอบหมาย)
-- คำอธิบาย: งานมอบหมายในแต่ละรายวิชา
-- =====================================================
DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `name` varchar(255) NOT NULL COMMENT 'ชื่องาน',
  `description` text COMMENT 'คำอธิบายงาน',
  `assignment_type` enum('individual','permanent_group','weekly_group') NOT NULL DEFAULT 'individual' COMMENT 'ประเภท: individual=งานเดี่ยว, permanent_group=กลุ่มถาวร, weekly_group=กลุ่มรายสัปดาห์',
  `week_number` int DEFAULT NULL COMMENT 'สัปดาห์ที่ (สำหรับ weekly_group)',
  `linked_attendance_session_id` bigint DEFAULT NULL COMMENT 'FK->attendance_sessions (legacy - ใช้ assignment_attendance_links แทน)',
  `attendance_condition` enum('and','or') DEFAULT 'or' COMMENT 'เงื่อนไขเช็คชื่อ: and=ต้องครบทุก session, or=session ใด session หนึ่ง',
  `max_score` decimal(5,2) NOT NULL DEFAULT '10.00' COMMENT 'คะแนนเต็ม',
  `due_date` datetime DEFAULT NULL COMMENT 'วันกำหนดส่ง',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะ: 1=ใช้งาน, 0=ไม่ใช้งาน',
  `created_by` bigint NOT NULL COMMENT 'FK->users: ผู้สร้าง',
  `order_index` int DEFAULT '0' COMMENT 'ลำดับการแสดงผล',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `idx_assignments_course` (`course_id`),
  KEY `idx_assignments_type` (`assignment_type`),
  KEY `idx_assignments_week` (`week_number`),
  KEY `idx_assignments_order` (`order_index`),
  KEY `created_by` (`created_by`),
  KEY `idx_assignments_linked_attendance` (`linked_attendance_session_id`),
  CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assignments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_assignment_attendance_session` FOREIGN KEY (`linked_attendance_session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: assignment_sub_items (หัวข้อย่อยของงาน)
-- คำอธิบาย: หัวข้อย่อยสำหรับให้คะแนนแยกเป็นส่วนๆ
-- =====================================================
DROP TABLE IF EXISTS `assignment_sub_items`;
CREATE TABLE `assignment_sub_items` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `assignment_id` int NOT NULL COMMENT 'FK->assignments: รหัสงาน',
  `name` varchar(255) NOT NULL COMMENT 'ชื่อหัวข้อย่อย',
  `max_score` decimal(10,2) DEFAULT '10.00' COMMENT 'คะแนนเต็มของหัวข้อนี้',
  `order_index` int DEFAULT '0' COMMENT 'ลำดับการแสดงผล',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `idx_assignment_id` (`assignment_id`),
  CONSTRAINT `assignment_sub_items_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: assignment_attendance_links (เชื่อมงานกับ session เช็คชื่อ)
-- คำอธิบาย: เชื่อมงานกับหลาย session เช็คชื่อ (Many-to-Many)
-- =====================================================
DROP TABLE IF EXISTS `assignment_attendance_links`;
CREATE TABLE `assignment_attendance_links` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `assignment_id` int NOT NULL COMMENT 'FK->assignments: รหัสงาน',
  `attendance_session_id` bigint NOT NULL COMMENT 'FK->attendance_sessions: รหัส session เช็คชื่อ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_assignment_attendance` (`assignment_id`,`attendance_session_id`),
  KEY `idx_aal_assignment` (`assignment_id`),
  KEY `idx_aal_attendance` (`attendance_session_id`),
  CONSTRAINT `fk_aal_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aal_attendance` FOREIGN KEY (`attendance_session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: scores (คะแนน)
-- คำอธิบาย: เก็บคะแนนของนักศึกษาแต่ละคน/กลุ่ม
-- =====================================================
DROP TABLE IF EXISTS `scores`;
CREATE TABLE `scores` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `assignment_id` int NOT NULL COMMENT 'FK->assignments: รหัสงาน',
  `student_id` bigint DEFAULT NULL COMMENT 'FK->students: รหัสนักศึกษา (สำหรับงานเดี่ยว)',
  `group_id` bigint DEFAULT NULL COMMENT 'FK->student_groups: รหัสกลุ่ม (สำหรับงานกลุ่ม)',
  `sub_item_id` int DEFAULT NULL COMMENT 'FK->assignment_sub_items: รหัสหัวข้อย่อย (ถ้ามี)',
  `score` decimal(5,2) DEFAULT NULL COMMENT 'คะแนนที่ได้',
  `comment` text COMMENT 'ความเห็นจากผู้ตรวจ',
  `graded_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้ให้คะแนน',
  `graded_at` datetime DEFAULT NULL COMMENT 'วันที่ให้คะแนน',
  `status` enum('pending','graded') DEFAULT 'pending' COMMENT 'สถานะ: pending=รอตรวจ, graded=ตรวจแล้ว',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_sub_item` (`assignment_id`,`student_id`,`sub_item_id`),
  KEY `idx_scores_assignment` (`assignment_id`),
  KEY `idx_scores_student` (`student_id`),
  KEY `idx_scores_group` (`group_id`),
  KEY `idx_scores_status` (`status`),
  KEY `graded_by` (`graded_by`),
  KEY `idx_scores_sub_item` (`sub_item_id`),
  CONSTRAINT `fk_scores_sub_item` FOREIGN KEY (`sub_item_id`) REFERENCES `assignment_sub_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scores_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scores_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scores_ibfk_3` FOREIGN KEY (`group_id`) REFERENCES `student_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scores_ibfk_4` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: score_edit_requests (คำขอแก้ไขคะแนน)
-- คำอธิบาย: ระบบขออนุมัติแก้ไขคะแนน (TA ขอ, Instructor อนุมัติ)
-- =====================================================
DROP TABLE IF EXISTS `score_edit_requests`;
CREATE TABLE `score_edit_requests` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `score_id` int NOT NULL COMMENT 'FK->scores: รหัสคะแนนที่ต้องการแก้',
  `old_score` decimal(5,2) DEFAULT NULL COMMENT 'คะแนนเดิม',
  `new_score` decimal(5,2) NOT NULL COMMENT 'คะแนนใหม่ที่ต้องการ',
  `reason` text COMMENT 'เหตุผลที่ขอแก้ไข',
  `requested_by` bigint NOT NULL COMMENT 'FK->users: ผู้ขอแก้ไข',
  `status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'สถานะ: pending=รออนุมัติ, approved=อนุมัติ, rejected=ปฏิเสธ',
  `reviewed_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้อนุมัติ/ปฏิเสธ',
  `reviewed_at` datetime DEFAULT NULL COMMENT 'วันที่พิจารณา',
  `review_comment` text COMMENT 'ความเห็นจากผู้อนุมัติ',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `idx_edit_requests_score` (`score_id`),
  KEY `idx_edit_requests_status` (`status`),
  KEY `idx_edit_requests_requester` (`requested_by`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `score_edit_requests_ibfk_1` FOREIGN KEY (`score_id`) REFERENCES `scores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `score_edit_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `score_edit_requests_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: bonus_scores (คะแนนพิเศษ)
-- คำอธิบาย: คะแนนพิเศษจากการถามตอบในห้องเรียน
-- =====================================================
DROP TABLE IF EXISTS `bonus_scores`;
CREATE TABLE `bonus_scores` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `student_id` bigint NOT NULL COMMENT 'FK->students: รหัสนักศึกษา',
  `score` decimal(5,2) NOT NULL DEFAULT '1.00' COMMENT 'คะแนนที่ได้',
  `reason` varchar(255) DEFAULT NULL COMMENT 'เหตุผล เช่น "ตอบคำถามในห้องเรียน"',
  `given_by` bigint NOT NULL COMMENT 'FK->users: ผู้ให้คะแนน',
  `given_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่ให้',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `given_by` (`given_by`),
  KEY `idx_bonus_scores_course` (`course_id`),
  KEY `idx_bonus_scores_student` (`student_id`),
  KEY `idx_bonus_scores_course_student` (`course_id`,`student_id`),
  CONSTRAINT `bonus_scores_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bonus_scores_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bonus_scores_ibfk_3` FOREIGN KEY (`given_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: classrooms (ห้องเรียน)
-- คำอธิบาย: ข้อมูลห้องเรียนสำหรับระบบจัดการผังห้อง/คิว
-- =====================================================
DROP TABLE IF EXISTS `classrooms`;
CREATE TABLE `classrooms` (
  `id` varchar(21) NOT NULL COMMENT 'รหัสห้อง (nanoid)',
  `name` varchar(100) NOT NULL COMMENT 'ชื่อห้อง เช่น "306"',
  `building` varchar(100) NOT NULL COMMENT 'อาคาร เช่น "IT"',
  `floor` varchar(20) NOT NULL COMMENT 'ชั้น เช่น "3"',
  `description` text COMMENT 'รายละเอียดเพิ่มเติม',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft delete: 1=ลบแล้ว, 0=ยังใช้งาน',
  `created_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้สร้าง',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `idx_classrooms_building` (`building`),
  KEY `idx_classrooms_is_deleted` (`is_deleted`),
  KEY `fk_classrooms_created_by` (`created_by`),
  CONSTRAINT `fk_classrooms_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: desks (โต๊ะในห้องเรียน)
-- คำอธิบาย: โต๊ะแต่ละตัวในห้องเรียน สำหรับระบบผังห้อง/คิว
-- =====================================================
DROP TABLE IF EXISTS `desks`;
CREATE TABLE `desks` (
  `id` varchar(21) NOT NULL COMMENT 'รหัสโต๊ะ (nanoid)',
  `classroom_id` varchar(21) NOT NULL COMMENT 'FK->classrooms: รหัสห้อง',
  `number` int NOT NULL COMMENT 'หมายเลขโต๊ะ',
  `x` int NOT NULL DEFAULT '0' COMMENT 'ตำแหน่ง X บน canvas',
  `y` int NOT NULL DEFAULT '0' COMMENT 'ตำแหน่ง Y บน canvas',
  `type` enum('computer','normal','teacher') NOT NULL DEFAULT 'normal' COMMENT 'ประเภท: computer=โต๊ะคอม, normal=โต๊ะธรรมดา, teacher=โต๊ะอาจารย์',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'เปิดใช้งาน: 1=เปิด, 0=ปิด',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `idx_desks_classroom` (`classroom_id`),
  KEY `idx_desks_number` (`classroom_id`,`number`),
  CONSTRAINT `fk_desks_classroom` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: feedbacks (Feedback/รายงานปัญหา)
-- คำอธิบาย: ระบบรายงานปัญหาและข้อเสนอแนะจากผู้ใช้
-- =====================================================
DROP TABLE IF EXISTS `feedbacks`;
CREATE TABLE `feedbacks` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `user_id` bigint DEFAULT NULL COMMENT 'FK->users: ผู้รายงาน (null ถ้าไม่ login)',
  `type` enum('bug','feature','improvement','other') NOT NULL DEFAULT 'other' COMMENT 'ประเภท: bug=ข้อผิดพลาด, feature=ขอฟีเจอร์, improvement=ข้อเสนอแนะ, other=อื่นๆ',
  `title` varchar(255) NOT NULL COMMENT 'หัวข้อ',
  `description` text NOT NULL COMMENT 'รายละเอียด',
  `attachments` json DEFAULT NULL COMMENT 'ไฟล์แนบ (Array of URLs)',
  `status` enum('pending','reviewing','resolved','rejected') NOT NULL DEFAULT 'pending' COMMENT 'สถานะ: pending=รอดำเนินการ, reviewing=กำลังตรวจสอบ, resolved=แก้ไขแล้ว, rejected=ปฏิเสธ',
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium' COMMENT 'ความสำคัญ: low/medium/high/critical',
  `admin_notes` text COMMENT 'บันทึกจากผู้ดูแล',
  `resolved_at` datetime DEFAULT NULL COMMENT 'วันที่แก้ไขเสร็จ',
  `resolved_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้แก้ไข',
  `contact_email` varchar(255) DEFAULT NULL COMMENT 'Email สำหรับติดต่อกลับ (ถ้าไม่ login)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `resolved_by` (`resolved_by`),
  KEY `idx_feedback_status` (`status`),
  KEY `idx_feedback_type` (`type`),
  KEY `idx_feedback_priority` (`priority`),
  KEY `idx_feedback_user` (`user_id`),
  KEY `idx_feedback_created` (`created_at`),
  CONSTRAINT `feedbacks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `feedbacks_ibfk_2` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: system_logs (Log ระบบ)
-- คำอธิบาย: บันทึก log การใช้งานระบบทั้งหมด
-- =====================================================
DROP TABLE IF EXISTS `system_logs`;
CREATE TABLE `system_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `log_type` enum('access','error','auth','security') NOT NULL DEFAULT 'access' COMMENT 'ประเภท: access=เข้าถึง, error=ข้อผิดพลาด, auth=การยืนยันตัว, security=ความปลอดภัย',
  `severity` enum('debug','info','warn','error','critical') NOT NULL DEFAULT 'info' COMMENT 'ระดับความรุนแรง',
  `actor_user_id` bigint DEFAULT NULL COMMENT 'FK->users: ผู้กระทำ',
  `session_id` varchar(128) DEFAULT NULL COMMENT 'Session ID',
  `auth_method` varchar(50) DEFAULT NULL COMMENT 'วิธีการ auth เช่น jwt, basic',
  `action` varchar(255) NOT NULL COMMENT 'การกระทำ',
  `http_method` varchar(10) DEFAULT NULL COMMENT 'HTTP Method: GET, POST, PUT, DELETE',
  `url` varchar(2048) DEFAULT NULL COMMENT 'URL ที่เรียก',
  `query_params` json DEFAULT NULL COMMENT 'Query parameters',
  `status_code` int DEFAULT NULL COMMENT 'HTTP Status Code',
  `response_time_ms` int DEFAULT NULL COMMENT 'เวลาตอบกลับ (milliseconds)',
  `detail` json DEFAULT NULL COMMENT 'รายละเอียดเพิ่มเติม',
  `error_message` text COMMENT 'ข้อความ error (ถ้ามี)',
  `error_stack` text COMMENT 'Stack trace (ถ้ามี)',
  `error_code` varchar(50) DEFAULT NULL COMMENT 'Error code',
  `resource_type` varchar(100) DEFAULT NULL COMMENT 'ประเภท resource เช่น course, user',
  `resource_id` varchar(255) DEFAULT NULL COMMENT 'ID ของ resource',
  `request_body` json DEFAULT NULL COMMENT 'Body ของ request',
  `request_size` int DEFAULT NULL COMMENT 'ขนาด request (bytes)',
  `response_size` int DEFAULT NULL COMMENT 'ขนาด response (bytes)',
  `ip_address` varchar(64) DEFAULT NULL COMMENT 'IP Address',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'User Agent',
  `referer` varchar(2048) DEFAULT NULL COMMENT 'Referer URL',
  `device_type` varchar(50) DEFAULT NULL COMMENT 'ประเภทอุปกรณ์: desktop, mobile, tablet',
  `browser` varchar(100) DEFAULT NULL COMMENT 'Browser ที่ใช้',
  `os` varchar(100) DEFAULT NULL COMMENT 'ระบบปฏิบัติการ',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  PRIMARY KEY (`id`),
  KEY `fk_log_actor` (`actor_user_id`),
  KEY `idx_syslog_action` (`action`),
  KEY `idx_syslog_created_at` (`created_at`),
  KEY `idx_syslog_type` (`log_type`),
  KEY `idx_syslog_severity` (`severity`),
  KEY `idx_syslog_method` (`http_method`),
  KEY `idx_syslog_status_code` (`status_code`),
  KEY `idx_syslog_user` (`actor_user_id`),
  KEY `idx_syslog_session` (`session_id`),
  KEY `idx_syslog_type_created` (`log_type`,`created_at`),
  KEY `idx_syslog_severity_created` (`severity`,`created_at`),
  CONSTRAINT `fk_log_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: queue_sessions (Session คิวตรวจงาน)
-- คำอธิบาย: ระบบจัดคิวตรวจงานในห้องปฏิบัติการ
--           สำหรับฟีเจอร์ถัดไปที่จะพัฒนา
-- =====================================================
DROP TABLE IF EXISTS `queue_sessions`;
CREATE TABLE `queue_sessions` (
  `id` varchar(21) NOT NULL COMMENT 'รหัส session (nanoid)',
  `course_id` varchar(21) NOT NULL COMMENT 'FK->courses: รหัสรายวิชา',
  `classroom_id` varchar(21) NOT NULL COMMENT 'FK->classrooms: รหัสห้องเรียน',
  `title` varchar(255) NOT NULL COMMENT 'ชื่อ session เช่น "Lab01 - ตรวจงาน"',
  `description` text COMMENT 'รายละเอียดเพิ่มเติม',
  `pin_code` varchar(10) NOT NULL COMMENT 'รหัส PIN 6 หลัก สำหรับนักศึกษาเข้าคิว',
  `linked_assignment_id` int DEFAULT NULL COMMENT 'FK->assignments: งานที่ลิงก์สำหรับบันทึกคะแนน',
  `require_attendance` tinyint(1) DEFAULT '0' COMMENT 'ต้องเช็คชื่อก่อนจึงจะจองคิวได้',
  `linked_attendance_session_id` bigint DEFAULT NULL COMMENT 'FK->attendance_sessions: session เช็คชื่อที่ต้องผ่าน',
  `status` enum('draft','active','paused','closed') DEFAULT 'draft' COMMENT 'สถานะ: draft/active/paused/closed',
  `start_time` datetime DEFAULT NULL COMMENT 'เวลาเริ่มรับจองคิว',
  `end_time` datetime DEFAULT NULL COMMENT 'เวลาสิ้นสุดรับจองคิว',
  `created_by` bigint DEFAULT NULL COMMENT 'FK->users: ผู้สร้าง',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `linked_assignment_id` (`linked_assignment_id`),
  KEY `linked_attendance_session_id` (`linked_attendance_session_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_classroom_id` (`classroom_id`),
  KEY `idx_status` (`status`),
  KEY `idx_pin_code` (`pin_code`),
  CONSTRAINT `queue_sessions_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_sessions_ibfk_2` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_sessions_ibfk_3` FOREIGN KEY (`linked_assignment_id`) REFERENCES `assignments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `queue_sessions_ibfk_4` FOREIGN KEY (`linked_attendance_session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `queue_sessions_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: queue_bookings (การจองคิว)
-- คำอธิบาย: บันทึกการจองคิวของนักศึกษา
-- =====================================================
DROP TABLE IF EXISTS `queue_bookings`;
CREATE TABLE `queue_bookings` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `queue_session_id` varchar(21) NOT NULL COMMENT 'FK->queue_sessions: รหัส session',
  `student_id` bigint NOT NULL COMMENT 'FK->students: รหัสนักศึกษา',
  `desk_id` varchar(21) NOT NULL COMMENT 'FK->desks: รหัสโต๊ะที่จอง',
  `desk_number` int NOT NULL COMMENT 'หมายเลขโต๊ะ (denormalized)',
  `booking_type` enum('grading','help') NOT NULL COMMENT 'ประเภท: grading=ตรวจงาน, help=ขอความช่วยเหลือ',
  `queue_number` int NOT NULL COMMENT 'หมายเลขคิว',
  `note` text COMMENT 'หมายเหตุจากนักศึกษา',
  `status` enum('waiting','in_progress','completed','cancelled','no_show') DEFAULT 'waiting' COMMENT 'สถานะ: waiting/in_progress/completed/cancelled/no_show',
  `assigned_worker_id` bigint DEFAULT NULL COMMENT 'FK->users: อาจารย์/TA ที่รับตรวจ',
  `assigned_at` timestamp NULL DEFAULT NULL COMMENT 'เวลาที่ได้รับมอบหมาย',
  `started_at` timestamp NULL DEFAULT NULL COMMENT 'เวลาเริ่มตรวจ',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT 'เวลาตรวจเสร็จ',
  `score` decimal(5,2) DEFAULT NULL COMMENT 'คะแนนที่ได้ (ถ้าเป็น grading)',
  `score_comment` text COMMENT 'ความเห็นเรื่องคะแนน',
  `worker_note` text COMMENT 'บันทึกจากผู้ตรวจ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  KEY `assigned_worker_id` (`assigned_worker_id`),
  KEY `idx_queue_session` (`queue_session_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_desk_id` (`desk_id`),
  KEY `idx_status` (`status`),
  KEY `idx_booking_type` (`booking_type`),
  KEY `idx_queue_number` (`queue_session_id`,`queue_number`),
  CONSTRAINT `queue_bookings_ibfk_1` FOREIGN KEY (`queue_session_id`) REFERENCES `queue_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_bookings_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_bookings_ibfk_3` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_bookings_ibfk_4` FOREIGN KEY (`assigned_worker_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: queue_desk_status (สถานะโต๊ะในคิว)
-- คำอธิบาย: สถานะปัจจุบันของแต่ละโต๊ะใน session
-- =====================================================
DROP TABLE IF EXISTS `queue_desk_status`;
CREATE TABLE `queue_desk_status` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `queue_session_id` varchar(21) NOT NULL COMMENT 'FK->queue_sessions: รหัส session',
  `desk_id` varchar(21) NOT NULL COMMENT 'FK->desks: รหัสโต๊ะ',
  `grading_status` enum('not_started','waiting','in_progress','completed') DEFAULT 'not_started' COMMENT 'สถานะการตรวจงาน',
  `grading_booking_id` bigint DEFAULT NULL COMMENT 'FK->queue_bookings: booking ปัจจุบันของ grading',
  `help_status` enum('none','waiting','in_progress') DEFAULT 'none' COMMENT 'สถานะการขอช่วยเหลือ',
  `help_booking_id` bigint DEFAULT NULL COMMENT 'FK->queue_bookings: booking ปัจจุบันของ help',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_desk_session` (`queue_session_id`,`desk_id`),
  KEY `desk_id` (`desk_id`),
  KEY `idx_queue_session` (`queue_session_id`),
  KEY `idx_grading_status` (`grading_status`),
  KEY `idx_help_status` (`help_status`),
  CONSTRAINT `queue_desk_status_ibfk_1` FOREIGN KEY (`queue_session_id`) REFERENCES `queue_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_desk_status_ibfk_2` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: queue_workers (ผู้ตรวจงานในคิว)
-- คำอธิบาย: อาจารย์/TA ที่พร้อมรับงานตรวจใน session
-- =====================================================
DROP TABLE IF EXISTS `queue_workers`;
CREATE TABLE `queue_workers` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `queue_session_id` varchar(21) NOT NULL COMMENT 'FK->queue_sessions: รหัส session',
  `user_id` bigint NOT NULL COMMENT 'FK->users: รหัสอาจารย์/TA',
  `accept_grading` tinyint(1) DEFAULT '1' COMMENT 'รับตรวจงาน: 1=รับ, 0=ไม่รับ',
  `accept_help` tinyint(1) DEFAULT '1' COMMENT 'รับช่วยเหลือ: 1=รับ, 0=ไม่รับ',
  `status` enum('online','busy','offline') DEFAULT 'offline' COMMENT 'สถานะ: online=ว่าง, busy=กำลังทำ, offline=ไม่พร้อม',
  `current_booking_id` bigint DEFAULT NULL COMMENT 'FK->queue_bookings: งานที่กำลังทำอยู่',
  `total_grading_completed` int DEFAULT '0' COMMENT 'จำนวนตรวจงานเสร็จทั้งหมด',
  `total_help_completed` int DEFAULT '0' COMMENT 'จำนวนช่วยเหลือเสร็จทั้งหมด',
  `last_active_at` timestamp NULL DEFAULT NULL COMMENT 'เวลา active ล่าสุด',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_worker` (`queue_session_id`,`user_id`),
  KEY `idx_queue_session` (`queue_session_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `queue_workers_ibfk_1` FOREIGN KEY (`queue_session_id`) REFERENCES `queue_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `queue_workers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- =====================================================
-- สรุปตาราง (27 ตาราง)
-- =====================================================
-- 
-- 1.  students                     - นักศึกษา
-- 2.  users                        - ผู้ใช้ระบบ
-- 3.  refresh_tokens               - Token สำหรับ refresh JWT
-- 4.  courses                      - รายวิชา
-- 5.  course_instructors           - อาจารย์ประจำวิชา (Multi-instructor)
-- 6.  course_sections              - กลุ่มเรียน
-- 7.  course_section_students      - นักศึกษาในกลุ่มเรียน
-- 8.  course_tas                   - ผู้ช่วยสอนประจำวิชา
-- 9.  student_groups               - กลุ่มนักศึกษา
-- 10. student_group_members        - สมาชิกกลุ่ม
-- 11. attendance_sessions          - Session เช็คชื่อ
-- 12. attendance_session_sections  - Section ของ Session เช็คชื่อ
-- 13. attendance_records           - บันทึกการเช็คชื่อ
-- 14. assignments                  - งานมอบหมาย
-- 15. assignment_sub_items         - หัวข้อย่อยของงาน
-- 16. assignment_attendance_links  - เชื่อมงานกับ session เช็คชื่อ
-- 17. scores                       - คะแนน
-- 18. score_edit_requests          - คำขอแก้ไขคะแนน
-- 19. bonus_scores                 - คะแนนพิเศษ
-- 20. classrooms                   - ห้องเรียน
-- 21. desks                        - โต๊ะในห้องเรียน
-- 22. feedbacks                    - Feedback/รายงานปัญหา
-- 23. system_logs                  - Log ระบบ
-- 
-- === ระบบคิว (สำหรับพัฒนาต่อ) ===
-- 24. queue_sessions               - Session คิวตรวจงาน
-- 25. queue_bookings               - การจองคิว
-- 26. queue_desk_status            - สถานะโต๊ะในคิว
-- 27. queue_workers                - ผู้ตรวจงานในคิว
--
-- =====================================================
