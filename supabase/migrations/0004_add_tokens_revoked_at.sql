-- Migration 5: Add tokens_revoked_at to Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_revoked_at TIMESTAMPTZ;
