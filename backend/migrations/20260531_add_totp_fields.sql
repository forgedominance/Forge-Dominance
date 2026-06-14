-- Add TOTP authenticator fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
