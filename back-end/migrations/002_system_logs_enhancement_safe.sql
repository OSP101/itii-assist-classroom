-- =====================================================
-- Migration: 002_system_logs_enhancement_safe.sql
-- Description: ปรับปรุง system_logs สำหรับ Compliance พ.ร.บ. คอมพิวเตอร์ 2550
-- Safe version - ตรวจสอบก่อนเพิ่ม column
-- =====================================================

-- Add columns only if they don't exist
-- Using stored procedure for conditional column addition

DELIMITER //

DROP PROCEDURE IF EXISTS add_column_if_not_exists//

CREATE PROCEDURE add_column_if_not_exists(
    IN table_name VARCHAR(64),
    IN column_name VARCHAR(64),
    IN column_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.columns 
        WHERE table_schema = DATABASE()
        AND table_name = table_name 
        AND column_name = column_name
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `', column_name, '` ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

-- Add all columns
CALL add_column_if_not_exists('system_logs', 'log_type', "ENUM('access', 'error', 'auth', 'security') NOT NULL DEFAULT 'access' AFTER `id`");
CALL add_column_if_not_exists('system_logs', 'severity', "ENUM('debug', 'info', 'warn', 'error', 'critical') NOT NULL DEFAULT 'info' AFTER `log_type`");
CALL add_column_if_not_exists('system_logs', 'http_method', "VARCHAR(10) DEFAULT NULL AFTER `action`");
CALL add_column_if_not_exists('system_logs', 'url', "VARCHAR(2048) DEFAULT NULL AFTER `http_method`");
CALL add_column_if_not_exists('system_logs', 'query_params', "JSON DEFAULT NULL AFTER `url`");
CALL add_column_if_not_exists('system_logs', 'status_code', "INT DEFAULT NULL AFTER `query_params`");
CALL add_column_if_not_exists('system_logs', 'response_time_ms', "INT DEFAULT NULL AFTER `status_code`");
CALL add_column_if_not_exists('system_logs', 'user_agent', "VARCHAR(512) DEFAULT NULL AFTER `ip_address`");
CALL add_column_if_not_exists('system_logs', 'referer', "VARCHAR(2048) DEFAULT NULL AFTER `user_agent`");
CALL add_column_if_not_exists('system_logs', 'device_type', "VARCHAR(50) DEFAULT NULL AFTER `referer`");
CALL add_column_if_not_exists('system_logs', 'browser', "VARCHAR(100) DEFAULT NULL AFTER `device_type`");
CALL add_column_if_not_exists('system_logs', 'os', "VARCHAR(100) DEFAULT NULL AFTER `browser`");
CALL add_column_if_not_exists('system_logs', 'session_id', "VARCHAR(128) DEFAULT NULL AFTER `actor_user_id`");
CALL add_column_if_not_exists('system_logs', 'auth_method', "VARCHAR(50) DEFAULT NULL AFTER `session_id`");
CALL add_column_if_not_exists('system_logs', 'error_message', "TEXT DEFAULT NULL AFTER `detail`");
CALL add_column_if_not_exists('system_logs', 'error_stack', "TEXT DEFAULT NULL AFTER `error_message`");
CALL add_column_if_not_exists('system_logs', 'error_code', "VARCHAR(50) DEFAULT NULL AFTER `error_stack`");
CALL add_column_if_not_exists('system_logs', 'resource_type', "VARCHAR(100) DEFAULT NULL AFTER `error_code`");
CALL add_column_if_not_exists('system_logs', 'resource_id', "VARCHAR(255) DEFAULT NULL AFTER `resource_type`");
CALL add_column_if_not_exists('system_logs', 'request_body', "JSON DEFAULT NULL AFTER `resource_id`");
CALL add_column_if_not_exists('system_logs', 'request_size', "INT DEFAULT NULL AFTER `request_body`");
CALL add_column_if_not_exists('system_logs', 'response_size', "INT DEFAULT NULL AFTER `request_size`");

-- Cleanup procedure
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- Add indexes (safe - ignore errors if already exists)
-- Note: MySQL 8.0.29+ supports CREATE INDEX IF NOT EXISTS
-- For older versions, we just ignore the errors

-- Skip index creation if they already exist (run these manually if needed)
-- Or use phpMyAdmin/MySQL Workbench to add them

-- Create view
CREATE OR REPLACE VIEW `v_system_logs_with_user` AS
SELECT 
    sl.*,
    u.email AS actor_email,
    u.full_name AS actor_full_name,
    u.role AS actor_role
FROM system_logs sl
LEFT JOIN users u ON sl.actor_user_id = u.id;

-- Create cleanup stored procedure
DROP PROCEDURE IF EXISTS sp_cleanup_old_logs;
DELIMITER //
CREATE PROCEDURE `sp_cleanup_old_logs`()
BEGIN
    DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    SELECT COUNT(*) AS remaining_logs FROM system_logs;
END //
DELIMITER ;
