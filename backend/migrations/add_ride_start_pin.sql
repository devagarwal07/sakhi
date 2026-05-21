-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add ride_start_pin column to rides table
-- Purpose:   4-digit PIN generated at booking; driver must enter it to start trip.
--            Cleared (set to NULL) after successful trip start.
-- Run in:    Supabase SQL Editor or migration runner
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS ride_start_pin TEXT DEFAULT NULL;

-- Optional: back-fill existing 'arrived' rides with a PIN so they don't get stuck
-- (only needed if you have rides already in 'arrived' status without a PIN)
UPDATE rides
   SET ride_start_pin = LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
 WHERE ride_start_pin IS NULL
   AND status IN ('arrived', 'assigned', 'driver_en_route');

COMMENT ON COLUMN rides.ride_start_pin IS
  '4-digit trip-start PIN shown to the rider. Driver must enter it to transition to in_progress. Cleared after use.';
