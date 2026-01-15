-- Migration: Add course_instructors table for multi-instructor support
-- Date: 2026-01-15

-- Create course_instructors table
CREATE TABLE IF NOT EXISTS `course_instructors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` varchar(21) NOT NULL,
  `user_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_course_instructor` (`course_id`, `user_id`),
  KEY `fk_ci_course` (`course_id`),
  KEY `fk_ci_user` (`user_id`),
  CONSTRAINT `fk_ci_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing instructor_id data to course_instructors
INSERT INTO `course_instructors` (`course_id`, `user_id`, `is_primary`, `assigned_at`)
SELECT `id`, `instructor_id`, 1, NOW()
FROM `courses`
WHERE `instructor_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `is_primary` = 1;

-- Note: Keep instructor_id column for backward compatibility
-- but it will represent the primary instructor only
