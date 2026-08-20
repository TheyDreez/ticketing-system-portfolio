-- ==============================================================================
-- AcmeCorp Ops Center - Migration 3: Devices, Insights, Knowledge
-- ==============================================================================

-- 1. Knowledge Base
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  -- We assume you might have pgvector. If not, use JSONB or standard arrays.
  -- To keep it compatible everywhere:
  embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  source TEXT
);

-- 2. Devices
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  assigned_user TEXT,
  department TEXT,
  os TEXT,
  serial TEXT,
  model TEXT,
  manufacturer TEXT,
  last_checkin TIMESTAMPTZ,
  compliance BOOLEAN DEFAULT true,
  cpu_usage INTEGER,
  ram_usage INTEGER,
  disk_usage INTEGER,
  network_usage INTEGER,
  battery_level INTEGER,
  defender_active BOOLEAN,
  bitlocker_active BOOLEAN,
  windows_update TEXT,
  health_score INTEGER,
  risk_score INTEGER
);

CREATE TABLE IF NOT EXISTS device_events (
  id TEXT PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_insights (
  id TEXT PRIMARY KEY,
  insight_type TEXT NOT NULL,
  severity TEXT,
  description TEXT NOT NULL,
  impact TEXT,
  recommendation TEXT
);

-- Enable RLS and add Deny Policies (backend bypasses via Service Role)
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all access to knowledge_articles" ON knowledge_articles;
CREATE POLICY "Deny all access to knowledge_articles" ON knowledge_articles FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access to devices" ON devices;
CREATE POLICY "Deny all access to devices" ON devices FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access to device_events" ON device_events;
CREATE POLICY "Deny all access to device_events" ON device_events FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access to device_insights" ON device_insights;
CREATE POLICY "Deny all access to device_insights" ON device_insights FOR ALL USING (false);

