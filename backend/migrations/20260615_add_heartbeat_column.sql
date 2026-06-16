-- Add last_heartbeat column for auto-expiring stale sessions
ALTER TABLE admin_login_activity ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP;
