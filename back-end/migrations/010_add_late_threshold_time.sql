-- Migration: Add late_threshold_time column
-- This changes from minutes-based late threshold to absolute time threshold

-- Add new column for absolute late threshold time
ALTER TABLE `attendance_sessions` 
ADD COLUMN `late_threshold_time` TIME NULL COMMENT 'เวลาที่ถือว่าสาย (เช่น 08:15:00)' AFTER `late_threshold_minutes`;

-- Note: late_threshold_minutes is kept for backward compatibility
-- The system will prioritize late_threshold_time if set, otherwise fall back to late_threshold_minutes
