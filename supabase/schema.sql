-- FinServe OS — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ── Leads table ───────────────────────────────────────────────────────────────
-- Key columns for querying/filtering; full Lead object stored in `data` JSONB.

CREATE TABLE IF NOT EXISTS leads (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL DEFAULT '',
  phone         TEXT        NOT NULL DEFAULT '',
  loan_type     TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'New',
  admin_status  TEXT        NOT NULL DEFAULT 'L1: New Lead',
  assigned_user TEXT,
  agent         TEXT,
  is_deleted    BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  deleted_by    TEXT,
  delete_reason TEXT,
  delete_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data          JSONB       NOT NULL DEFAULT '{}'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS leads_status_idx       ON leads (status)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS leads_assigned_idx     ON leads (assigned_user) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS leads_deleted_idx      ON leads (is_deleted);
CREATE INDEX IF NOT EXISTS leads_created_at_idx   ON leads (created_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Notifications table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Basic open policy for now (app handles auth via session).
-- Tighten these once you wire up Supabase Auth.

ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations from the anon key (app-level auth handles access control)
CREATE POLICY IF NOT EXISTS "allow_all_leads"
  ON leads FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "allow_all_notifications"
  ON notifications FOR ALL USING (true) WITH CHECK (true);
