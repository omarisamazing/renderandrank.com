-- D1 schema for contact "Send a message" submissions.
-- Apply with:
--   npx wrangler d1 migrations apply renderandrank_leads --remote
CREATE TABLE IF NOT EXISTS submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  website    TEXT NOT NULL,
  service    TEXT,
  location   TEXT NOT NULL,
  message    TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT
);

-- Fast lookups of the newest leads and de-dupe by email.
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions (email);
