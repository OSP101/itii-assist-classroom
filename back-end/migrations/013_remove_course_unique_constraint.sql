-- Migration: Remove unique constraint on courses (code, year, semester)
-- Date: 2026-01-15
-- Reason: Allow duplicate code+year+semester when one course is inactive

-- Drop the unique index (index name: uq_course)
ALTER TABLE `courses` DROP INDEX `uq_course`;

-- Note: The duplicate validation is now handled by application logic in course.controller.js
-- Only active courses with the same code+year+semester will be rejected
