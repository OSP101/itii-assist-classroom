-- Migration: Add must_change_password column to users table
-- This field forces users to change their password on first login

-- Add must_change_password column
ALTER TABLE users 
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active;

-- Update existing users to not require password change
UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL;
