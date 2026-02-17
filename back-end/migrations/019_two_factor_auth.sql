-- Migration: Add Two-Factor Authentication support
-- Date: 2026-02-17
-- Database: MySQL

-- Add 2FA columns to users table
ALTER TABLE users 
ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0 COMMENT 'Whether 2FA is enabled for this user',
ADD COLUMN two_factor_method VARCHAR(20) DEFAULT NULL COMMENT 'The 2FA method: totp or email',
ADD COLUMN two_factor_secret TEXT DEFAULT NULL COMMENT 'Encrypted TOTP secret or null for email method',
ADD COLUMN two_factor_backup_codes JSON DEFAULT NULL COMMENT 'JSON array of hashed backup codes',
ADD COLUMN two_factor_confirmed_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When 2FA was successfully enabled';

-- Create table for 2FA pending verifications (for setup process)
CREATE TABLE IF NOT EXISTS two_factor_pending (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  method VARCHAR(20) NOT NULL,
  secret TEXT NOT NULL,
  email_code VARCHAR(6) DEFAULT NULL,
  email_code_expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 15 MINUTE),
  UNIQUE KEY unique_user_method (user_id, method),
  CONSTRAINT fk_two_factor_pending_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_two_factor_method CHECK (method IN ('totp', 'email'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for cleanup
CREATE INDEX idx_two_factor_pending_expires ON two_factor_pending(expires_at);

-- Index for 2FA enabled users
CREATE INDEX idx_users_two_factor_enabled ON users(two_factor_enabled);
