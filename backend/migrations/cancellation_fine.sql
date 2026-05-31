-- ============================================================
-- Sakhi — Cancellation Fine System Migration
-- Run in Supabase SQL Editor (or migrations folder)
-- ============================================================

-- 1. Add cancellation fine columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cancellation_fine_pending BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancellation_fine_amount  NUMERIC(8,2) NOT NULL DEFAULT 0;

-- Index for fast lookup during booking gate check
CREATE INDEX IF NOT EXISTS idx_users_fine_pending
  ON users (id)
  WHERE cancellation_fine_pending = TRUE;

-- 2. Create audit log table for fine payments
CREATE TABLE IF NOT EXISTS cancellation_fine_payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         NUMERIC(8,2) NOT NULL DEFAULT 20,
  transaction_id TEXT        NOT NULL,
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fine_payments_rider
  ON cancellation_fine_payments (rider_id, paid_at DESC);

-- 3. Ensure consecutive_fail_count column exists (should already exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consecutive_fail_count INT NOT NULL DEFAULT 0;

-- ============================================================
-- DONE — Deploy backend + app after running this migration
-- ============================================================
