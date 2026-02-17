-- Migration: Create user_oauth_accounts table for OAuth provider linking
-- This allows users to link multiple OAuth providers (Google, GitHub, Apple) to their account

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider ENUM('google', 'github', 'apple') NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NULL,
    provider_avatar VARCHAR(500) NULL,
    provider_name VARCHAR(255) NULL,
    access_token TEXT NULL,
    refresh_token TEXT NULL,
    token_expires_at DATETIME NULL,
    linked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_oauth_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Each provider can only be linked once per user
    CONSTRAINT uk_user_provider 
        UNIQUE (user_id, provider),
    
    -- Each provider account can only be linked to one user
    CONSTRAINT uk_provider_account 
        UNIQUE (provider, provider_user_id),
    
    INDEX idx_user_id (user_id),
    INDEX idx_provider (provider),
    INDEX idx_provider_email (provider_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing google_id from users table to user_oauth_accounts
INSERT INTO user_oauth_accounts (user_id, provider, provider_user_id, provider_email, linked_at)
SELECT id, 'google', google_id, email, COALESCE(created_at, NOW())
FROM users 
WHERE google_id IS NOT NULL AND google_id != '';

-- Note: We keep google_id in users table for now for backward compatibility
-- It can be removed in a future migration
