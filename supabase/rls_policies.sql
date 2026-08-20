-- ==============================================================================
-- AcmeCorp Ops Center - Supabase RLS Policies
-- ==============================================================================
-- This architecture intentionally blocks ALL direct client-side access.
-- The Express backend uses the Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`), 
-- which bypasses RLS policies entirely. This means all security validation 
-- (roles, permissions, rate limiting) is handled in the Express application.
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing permissive policies (if applicable)
-- Ensure no public or anon access exists.
-- DROP POLICY IF EXISTS "..." ON table_name;

-- 3. Create explicit deny-all policies for safety
-- (Note: In Postgres, if RLS is enabled and no policies exist, it defaults to deny-all. 
-- Adding explicit reject policies can serve as documentation and extra safety)

-- We can just leave them without any public policies, which ensures deny-all for anon/authenticated roles.
-- But to be absolutely explicit, we will create policies that evaluate to false.

CREATE POLICY "Deny all access to tickets" ON tickets FOR ALL USING (false);
CREATE POLICY "Deny all access to ticket_comments" ON ticket_comments FOR ALL USING (false);
CREATE POLICY "Deny all access to users" ON users FOR ALL USING (false);
CREATE POLICY "Deny all access to attachments" ON attachments FOR ALL USING (false);
CREATE POLICY "Deny all access to audit_events" ON audit_events FOR ALL USING (false);
CREATE POLICY "Deny all access to sla_configs" ON sla_configs FOR ALL USING (false);

-- ==============================================================================
-- 4. Storage Bucket Policies
-- ==============================================================================
-- The `attachments` bucket should also be private.
-- Only the backend with the service role key will generate signed URLs for users.

-- Create bucket if it doesn't exist (you might need to run this outside RLS or manually in the UI)
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Deny direct client access to the attachments bucket
CREATE POLICY "Deny direct client access to attachments bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'attachments' AND false);

-- ==============================================================================
-- 5. Revoked Sessions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS revoked_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to revoked_sessions" ON revoked_sessions FOR ALL USING (false);
