-- Migration: Add images column to score_edit_requests table
-- This stores JSON array of image file paths

ALTER TABLE score_edit_requests
ADD COLUMN images JSON DEFAULT NULL COMMENT 'JSON array of image file paths';

-- Example value: ["uploads/score-edit-requests/edit-request-123456789.jpg", "uploads/score-edit-requests/edit-request-987654321.png"]
