-- Migration: Add zones table for classroom layout zones
-- Date: 2026-02-06

CREATE TABLE IF NOT EXISTS `zones` (
  `id` VARCHAR(21) NOT NULL,
  `classroom_id` VARCHAR(21) NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'ชื่อโซน เช่น โซน A, แถวหน้า',
  `x` INT NOT NULL DEFAULT 0 COMMENT 'ตำแหน่ง X บน canvas',
  `y` INT NOT NULL DEFAULT 0 COMMENT 'ตำแหน่ง Y บน canvas',
  `width` INT NOT NULL DEFAULT 400 COMMENT 'ความกว้างโซน (px)',
  `height` INT NOT NULL DEFAULT 300 COMMENT 'ความสูงโซน (px)',
  `color` VARCHAR(30) NOT NULL DEFAULT 'rgba(99,102,241,0.15)' COMMENT 'สีโซน',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_zones_classroom_id` (`classroom_id`),
  CONSTRAINT `fk_zones_classroom` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='โซนแบ่งพื้นที่บน Canvas ผังห้องเรียน';
