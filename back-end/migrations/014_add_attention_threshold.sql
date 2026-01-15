-- Migration: Add attention_threshold column to courses table
-- This allows instructors to customize the percentage threshold for "students needing attention"

ALTER TABLE courses
ADD COLUMN attention_threshold TINYINT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Percentage threshold for low performer alert (default 60%)';

-- Note: The default value is 60, meaning students scoring below 60% will be flagged
-- Instructors can adjust this per course (e.g., 50%, 70%, etc.)
