-- =====================================================
-- Migration: 002_system_logs_enhancement.sql
-- Description: ปรับปรุง system_logs สำหรับ Compliance พ.ร.บ. คอมพิวเตอร์ 2550
-- Date: 2024-12-20
-- Note: กฎหมายกำหนดให้เก็บ log อย่างน้อย 90 วัน
-- =====================================================

-- =====================================================
-- 1. Backup existing data (run manually if needed)
-- =====================================================
-- CREATE TABLE system_logs_backup AS SELECT * FROM system_logs;

-- =====================================================
-- 2. Add new columns to system_logs
-- =====================================================

-- Log Type: access, error, auth, security
ALTER TABLE `system_logs`
ADD COLUMN `log_type` ENUM('access', 'error', 'auth', 'security') NOT NULL DEFAULT 'access' AFTER `id`;

-- Severity Level: debug, info, warn, error, critical
ALTER TABLE `system_logs`
ADD COLUMN `severity` ENUM('debug', 'info', 'warn', 'error', 'critical') NOT NULL DEFAULT 'info' AFTER `log_type`;

-- HTTP Request Info
ALTER TABLE `system_logs`
ADD COLUMN `http_method` VARCHAR(10) DEFAULT NULL AFTER `action`,
ADD COLUMN `url` VARCHAR(2048) DEFAULT NULL AFTER `http_method`,
ADD COLUMN `query_params` JSON DEFAULT NULL AFTER `url`,
ADD COLUMN `status_code` INT DEFAULT NULL AFTER `query_params`,
ADD COLUMN `response_time_ms` INT DEFAULT NULL AFTER `status_code`;

-- Client Info (สำคัญสำหรับ พ.ร.บ. คอมพิวเตอร์)
ALTER TABLE `system_logs`
ADD COLUMN `user_agent` VARCHAR(512) DEFAULT NULL AFTER `ip_address`,
ADD COLUMN `referer` VARCHAR(2048) DEFAULT NULL AFTER `user_agent`,
ADD COLUMN `device_type` VARCHAR(50) DEFAULT NULL AFTER `referer`,
ADD COLUMN `browser` VARCHAR(100) DEFAULT NULL AFTER `device_type`,
ADD COLUMN `os` VARCHAR(100) DEFAULT NULL AFTER `browser`;

-- Session & Auth Info
ALTER TABLE `system_logs`
ADD COLUMN `session_id` VARCHAR(128) DEFAULT NULL AFTER `actor_user_id`,
ADD COLUMN `auth_method` VARCHAR(50) DEFAULT NULL AFTER `session_id`;

-- Error Info
ALTER TABLE `system_logs`
ADD COLUMN `error_message` TEXT DEFAULT NULL AFTER `detail`,
ADD COLUMN `error_stack` TEXT DEFAULT NULL AFTER `error_message`,
ADD COLUMN `error_code` VARCHAR(50) DEFAULT NULL AFTER `error_stack`;

-- Resource Info
ALTER TABLE `system_logs`
ADD COLUMN `resource_type` VARCHAR(100) DEFAULT NULL AFTER `error_code`,
ADD COLUMN `resource_id` VARCHAR(255) DEFAULT NULL AFTER `resource_type`;

-- Request/Response (เก็บแบบ sanitized)
ALTER TABLE `system_logs`
ADD COLUMN `request_body` JSON DEFAULT NULL AFTER `resource_id`,
ADD COLUMN `request_size` INT DEFAULT NULL AFTER `request_body`,
ADD COLUMN `response_size` INT DEFAULT NULL AFTER `request_size`;

-- =====================================================
-- 3. Add Indexes for better query performance
-- =====================================================

-- Index by log type
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_type` (`log_type`);

-- Index by severity
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_severity` (`severity`);

-- Index by HTTP method
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_method` (`http_method`);

-- Index by status code
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_status_code` (`status_code`);

-- Index by actor_user_id
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_user` (`actor_user_id`);

-- Index by session_id
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_session` (`session_id`);

-- Composite index for common queries
ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_type_created` (`log_type`, `created_at`);

ALTER TABLE `system_logs`
ADD INDEX `idx_syslog_severity_created` (`severity`, `created_at`);

-- =====================================================
-- 4. Create view for easy querying
-- =====================================================
CREATE OR REPLACE VIEW `v_system_logs_with_user` AS
SELECT 
    sl.*,
    u.email AS actor_email,
    u.full_name AS actor_full_name,
    u.role AS actor_role
FROM system_logs sl
LEFT JOIN users u ON sl.actor_user_id = u.id;

-- =====================================================
-- 5. Create stored procedure for log cleanup (90 days retention)
-- =====================================================
DELIMITER //
CREATE PROCEDURE `sp_cleanup_old_logs`()
BEGIN
    -- Archive logs older than 90 days (optional: archive to another table first)
    -- INSERT INTO system_logs_archive SELECT * FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Delete logs older than 90 days
    DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Return count of remaining logs
    SELECT COUNT(*) AS remaining_logs FROM system_logs;
END //
DELIMITER ;

-- =====================================================
-- 6. Create event for automatic cleanup (run daily at 3 AM)
-- =====================================================
-- Note: Make sure event_scheduler is enabled:
-- SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS `evt_cleanup_old_logs`
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '03:00:00')
DO
CALL sp_cleanup_old_logs();

-- =====================================================
-- 7. Grant necessary privileges
-- =====================================================
-- GRANT EXECUTE ON PROCEDURE sp_cleanup_old_logs TO 'app_user'@'%';
