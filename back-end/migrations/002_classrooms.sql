-- Migration: Create classrooms and desks tables
-- Date: 2025-12-27

-- --------------------------------------------------------
-- Table structure for table `classrooms`
-- --------------------------------------------------------

CREATE TABLE `classrooms` (
  `id` varchar(21) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อห้อง เช่น ห้อง 306',
  `building` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'อาคาร เช่น อาคาร IT',
  `floor` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชั้น',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียดเพิ่มเติม',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft delete flag',
  `created_by` bigint DEFAULT NULL COMMENT 'ผู้สร้าง',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_classrooms_building` (`building`),
  KEY `idx_classrooms_is_deleted` (`is_deleted`),
  KEY `fk_classrooms_created_by` (`created_by`),
  CONSTRAINT `fk_classrooms_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `desks`
-- --------------------------------------------------------

CREATE TABLE `desks` (
  `id` varchar(21) COLLATE utf8mb4_unicode_ci NOT NULL,
  `classroom_id` varchar(21) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` int NOT NULL COMMENT 'หมายเลขโต๊ะ',
  `x` int NOT NULL DEFAULT '0' COMMENT 'ตำแหน่ง X บน canvas',
  `y` int NOT NULL DEFAULT '0' COMMENT 'ตำแหน่ง Y บน canvas',
  `type` enum('computer','normal') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT 'ประเภทโต๊ะ',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'เปิด/ปิดใช้งาน',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_desks_classroom` (`classroom_id`),
  KEY `idx_desks_number` (`classroom_id`, `number`),
  CONSTRAINT `fk_desks_classroom` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
