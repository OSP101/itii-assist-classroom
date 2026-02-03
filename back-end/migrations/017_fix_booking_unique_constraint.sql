-- Migration: Fix queue_bookings unique constraint
-- Allow students to create new bookings after completing previous ones

-- Drop the old unique constraint that prevents multiple bookings per student per session
-- Using procedure to handle "index not exists" error gracefully
DROP PROCEDURE IF EXISTS drop_index_if_exists;

DELIMITER //
CREATE PROCEDURE drop_index_if_exists()
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'queue_bookings'
      AND index_name = 'uk_queue_bookings_session_student';
    
    IF index_exists > 0 THEN
        ALTER TABLE `queue_bookings` DROP INDEX `uk_queue_bookings_session_student`;
    END IF;
END //
DELIMITER ;

CALL drop_index_if_exists();
DROP PROCEDURE IF EXISTS drop_index_if_exists;

-- Add a new index (non-unique) for performance on common queries
CREATE INDEX `idx_queue_bookings_session_student` ON `queue_bookings` (`queue_session_id`, `student_id`);

-- Note: The uniqueness check for active bookings (waiting/in_progress) 
-- is now handled at the application level in queue.controller.js
