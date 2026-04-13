-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Support Chat Tables
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Support Sessions ─────────────────────────────────────────────────────────
-- One session per conversation thread. Users can have multiple sessions.
CREATE TABLE IF NOT EXISTS support_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'escalated', 'urgent', 'closed')),
    channel         TEXT NOT NULL DEFAULT 'in_app'
                        CHECK (channel IN ('in_app', 'email', 'phone')),
    last_message_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index: quickly find sessions for a user, newest first
CREATE INDEX IF NOT EXISTS support_sessions_user_id_idx
    ON support_sessions (user_id, last_message_at DESC);

-- ── Support Messages ─────────────────────────────────────────────────────────
-- Each row is one message in a support session (user or bot).
CREATE TABLE IF NOT EXISTS support_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
    sender      TEXT NOT NULL CHECK (sender IN ('user', 'bot', 'agent')),
    message     TEXT NOT NULL,
    intent      TEXT,           -- e.g. 'cancel_ride', 'refund', 'escalate', etc.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index: chronological messages per session
CREATE INDEX IF NOT EXISTS support_messages_session_idx
    ON support_messages (session_id, created_at ASC);

-- ── RLS Policies ─────────────────────────────────────────────────────────────
-- The backend uses the service-role key so RLS is bypassed server-side.
-- These policies protect direct Supabase client access (admin dashboard etc.)

ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can only read their own sessions
CREATE POLICY "users_read_own_sessions"
    ON support_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only read messages in their own sessions
CREATE POLICY "users_read_own_messages"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_support_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_sessions_updated_at_trigger
    BEFORE UPDATE ON support_sessions
    FOR EACH ROW EXECUTE FUNCTION update_support_sessions_updated_at();
