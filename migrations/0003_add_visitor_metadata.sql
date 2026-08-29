-- D1 schema — visitor metadata enrichment for leads and analytics.
-- Adds visitor-context TEXT columns to `conversations` and `submissions`,
-- and introduces a new `bookings` table (Cal.com / book-a-call captures).
-- Mirrors the style of 0001/0002 — TEXT datetime('now') timestamps.
--
-- NOTE: SQLite / D1 has NO "IF NOT EXISTS" for ADD COLUMN, so each ADD COLUMN
-- is its own statement. This migration is applied exactly once by the
-- migrations system, so re-running is not a concern.
--
-- Apply with:
--   npx wrangler d1 migrations apply renderandrank_leads --local
--   npx wrangler d1 migrations apply renderandrank_leads --remote

-- --- conversations: visitor metadata columns -------------------------------
ALTER TABLE conversations ADD COLUMN country TEXT;
ALTER TABLE conversations ADD COLUMN region TEXT;
ALTER TABLE conversations ADD COLUMN city TEXT;
ALTER TABLE conversations ADD COLUMN timezone TEXT;
ALTER TABLE conversations ADD COLUMN latitude TEXT;
ALTER TABLE conversations ADD COLUMN longitude TEXT;
ALTER TABLE conversations ADD COLUMN isp TEXT;
ALTER TABLE conversations ADD COLUMN device_type TEXT;
ALTER TABLE conversations ADD COLUMN browser TEXT;
ALTER TABLE conversations ADD COLUMN os TEXT;
ALTER TABLE conversations ADD COLUMN language TEXT;
ALTER TABLE conversations ADD COLUMN referrer TEXT;
ALTER TABLE conversations ADD COLUMN landing_page TEXT;
ALTER TABLE conversations ADD COLUMN utm_source TEXT;
ALTER TABLE conversations ADD COLUMN utm_medium TEXT;
ALTER TABLE conversations ADD COLUMN utm_campaign TEXT;
ALTER TABLE conversations ADD COLUMN utm_term TEXT;
ALTER TABLE conversations ADD COLUMN utm_content TEXT;

-- --- submissions: visitor metadata columns ---------------------------------
ALTER TABLE submissions ADD COLUMN country TEXT;
ALTER TABLE submissions ADD COLUMN region TEXT;
ALTER TABLE submissions ADD COLUMN city TEXT;
ALTER TABLE submissions ADD COLUMN timezone TEXT;
ALTER TABLE submissions ADD COLUMN latitude TEXT;
ALTER TABLE submissions ADD COLUMN longitude TEXT;
ALTER TABLE submissions ADD COLUMN isp TEXT;
ALTER TABLE submissions ADD COLUMN device_type TEXT;
ALTER TABLE submissions ADD COLUMN browser TEXT;
ALTER TABLE submissions ADD COLUMN os TEXT;
ALTER TABLE submissions ADD COLUMN language TEXT;
ALTER TABLE submissions ADD COLUMN referrer TEXT;
ALTER TABLE submissions ADD COLUMN landing_page TEXT;
ALTER TABLE submissions ADD COLUMN utm_source TEXT;
ALTER TABLE submissions ADD COLUMN utm_medium TEXT;
ALTER TABLE submissions ADD COLUMN utm_campaign TEXT;
ALTER TABLE submissions ADD COLUMN utm_term TEXT;
ALTER TABLE submissions ADD COLUMN utm_content TEXT;

-- --- bookings: book-a-call captures ----------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  name         TEXT,
  email        TEXT,
  timezone     TEXT,
  event_type   TEXT,
  country      TEXT,
  region       TEXT,
  city         TEXT,
  latitude     TEXT,
  longitude    TEXT,
  isp          TEXT,
  device_type  TEXT,
  browser      TEXT,
  os           TEXT,
  language     TEXT,
  referrer     TEXT,
  landing_page TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_term     TEXT,
  utm_content  TEXT,
  ip           TEXT,
  user_agent   TEXT
);

-- Fast lookups of the newest bookings.
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
