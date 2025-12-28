-- Create Feedback table
-- Run this migration to add feedback/bug report functionality

CREATE TABLE IF NOT EXISTS feedbacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    type ENUM('bug', 'feature', 'improvement', 'other') NOT NULL DEFAULT 'other' COMMENT 'bug=รายงานข้อผิดพลาด, feature=ขอฟีเจอร์ใหม่, improvement=ข้อเสนอแนะ, other=อื่นๆ',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    attachments JSON DEFAULT NULL COMMENT 'Array of file URLs (images/videos)',
    status ENUM('pending', 'reviewing', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    admin_notes TEXT NULL COMMENT 'Notes from admin/developer',
    resolved_at DATETIME NULL,
    resolved_by BIGINT NULL,
    contact_email VARCHAR(255) NULL COMMENT 'Email for anonymous feedback',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_feedback_status (status),
    INDEX idx_feedback_type (type),
    INDEX idx_feedback_priority (priority),
    INDEX idx_feedback_user (user_id),
    INDEX idx_feedback_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
