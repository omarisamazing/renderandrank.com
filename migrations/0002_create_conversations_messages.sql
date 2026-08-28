-- D1 schema for the on-site AI chat assistant.
-- Adds two tables: `conversations` (one row per visitor chat session) and
-- `messages` (each user / assistant turn). Mirrors the style of
-- 0001_create_submissions.sql — TEXT datetime('now') timestamps, IF NOT EXISTS.
-- Apply with:
--   npx wrangler d1 migrations apply renderandrank_leads --remote
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  visitor_email TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  ip            TEXT,
  user_agent    TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations (id),
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fast lookups of a conversation's messages and the newest conversations.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations (created_at DESC);
