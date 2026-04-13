-- Migration: 20260414_subscription_no_driver_flag
-- Adds a flag to track when a customer has been notified that no driver
-- was found for their subscription ride 30 minutes before the scheduled time.

ALTER TABLE subscription_rides
  ADD COLUMN IF NOT EXISTS no_driver_notified BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow 'driver_not_found' as a valid status value
-- (status is typically a text column with CHECK constraint; add if applicable)
-- If your status column has an ENUM or CHECK constraint, extend it here:
-- ALTER TABLE subscription_rides DROP CONSTRAINT IF EXISTS subscription_rides_status_check;
-- ALTER TABLE subscription_rides ADD CONSTRAINT subscription_rides_status_check
--   CHECK (status IN ('scheduled','in_progress','completed','missed','cancelled','driver_not_found'));

-- Index to speed up the 30-min no-driver query
CREATE INDEX IF NOT EXISTS idx_sub_rides_no_driver_check
  ON subscription_rides (scheduled_date, scheduled_time, status, assigned_driver_id, no_driver_notified)
  WHERE no_driver_notified = FALSE AND assigned_driver_id IS NULL;
