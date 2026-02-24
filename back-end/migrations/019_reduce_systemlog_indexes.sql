-- Migration: Reduce system_logs indexes to improve INSERT performance
-- Previous: 9 indexes causing write amplification on every HTTP request log
-- After: 3 essential indexes only

-- Drop unnecessary single-column indexes
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_log_type`;
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_severity`;
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_actor_user_id`;
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_session_id`;
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_http_method`;
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_status_code`;
ALTER TABLE `system_logs` DROP INDEX IF EXISTS `system_logs_severity_created_at`;

-- Keep only:
-- 1. system_logs_created_at (for time-range queries & cleanup)
-- 2. system_logs_log_type_created_at (for filtered queries by type)
-- Add composite index for user activity queries:
CREATE INDEX IF NOT EXISTS `system_logs_actor_user_id_created_at` 
  ON `system_logs` (`actor_user_id`, `created_at`);
