-- D1 schema — add a `channel` column to `messages` so each turn records how it
-- was captured: 'text' for the typed chat assistant (the default, keeping every
-- existing row and caller unchanged) and 'voice' for finalized voice-assistant
-- transcripts (see functions/api/voice-transcript.ts).
--
-- Apply with:
--   npm run db:migrate:local
--   npm run db:migrate:remote

ALTER TABLE messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'text';
