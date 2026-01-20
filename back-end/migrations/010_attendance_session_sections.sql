-- Migration: Add support for multiple sections per attendance session
-- This creates a junction table to allow many-to-many relationship

-- Create junction table for attendance sessions and course sections
CREATE TABLE IF NOT EXISTS attendance_session_sections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attendance_session_id BIGINT NOT NULL,
    course_section_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (course_section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_section (attendance_session_id, course_section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data: Copy existing course_section_id to junction table
INSERT INTO attendance_session_sections (attendance_session_id, course_section_id)
SELECT id, course_section_id 
FROM attendance_sessions 
WHERE course_section_id IS NOT NULL;

-- Note: We keep the course_section_id column in attendance_sessions for backward compatibility
-- It will be set to the first section_id if only one section is selected, or NULL if multiple
