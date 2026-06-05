-- ============================================================
-- Sakhi — Cancellation Fine Counter Fix Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- Add a separate consecutive_cancel_count column to users table
-- to isolate cancellation fines from failed bookings (no-driver free rides)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consecutive_cancel_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.consecutive_cancel_count IS
  'Incremented only when rider cancels a ride that has been accepted/assigned by a driver. Reset to 0 on successful ride completion.';
