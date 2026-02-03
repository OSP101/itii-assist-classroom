-- Migration: Add FCM tokens table for push notifications
-- Description: Stores Firebase Cloud Messaging tokens for workers and students

-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fcm_token VARCHAR(500) NOT NULL,
    user_type ENUM('worker', 'student') NOT NULL,
    user_id BIGINT NULL COMMENT 'For authenticated users (workers)',
    student_id VARCHAR(20) NULL COMMENT 'For students (รหัสนักศึกษา)',
    booking_id BIGINT NULL COMMENT 'For students - linked to their booking',
    session_id VARCHAR(21) NULL COMMENT 'For workers - linked to queue session',
    device_info JSON NULL COMMENT 'Browser/device information',
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_fcm_token (fcm_token(255)),
    INDEX idx_user_type (user_type),
    INDEX idx_user_id (user_id),
    INDEX idx_student_id (student_id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_session_id (session_id),
    INDEX idx_is_active (is_active),
    
    UNIQUE KEY unique_token (fcm_token(255)),
    
    CONSTRAINT fk_fcm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fcm_booking FOREIGN KEY (booking_id) REFERENCES queue_bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_fcm_session FOREIGN KEY (session_id) REFERENCES queue_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add notification preferences to queue_workers table (ignore error if column exists)
-- Run this separately or use a stored procedure for conditional add
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'queue_workers' 
    AND COLUMN_NAME = 'push_notifications_enabled'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE queue_workers ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT TRUE AFTER accept_help',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fcm_token_id BIGINT NULL,
    notification_type ENUM('new-task', 'queue-ready', 'booking-completed', 'session-closed', 'other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NULL,
    data JSON NULL,
    status ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending',
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_fcm_token_id (fcm_token_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    CONSTRAINT fk_notification_fcm_token FOREIGN KEY (fcm_token_id) REFERENCES fcm_tokens(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
