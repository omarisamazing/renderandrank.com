-- D1 schema — Funnel events log for tracking visitor journey interactions
-- (AI Visibility Checker runs, ROI calculator calculations, form transitions).
--
-- Apply with:
--   npm run db:migrate:local
--   npm run db:migrate:remote

CREATE TABLE IF NOT EXISTS funnel_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id   TEXT NOT NULL,
  event_type   TEXT NOT NULL, -- 'ai_check' | 'calculator' | 'contact_form' | 'booking'
  payload      TEXT NOT NULL, -- JSON blob with query, results, or metrics
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor ON funnel_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created ON funnel_events (created_at DESC);
