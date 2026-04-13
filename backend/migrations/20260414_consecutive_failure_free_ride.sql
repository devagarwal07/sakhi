-- Migration: 20260414_consecutive_failure_free_ride
-- Policy: If a customer's subscription ride is cancelled/not fulfilled 3 consecutive
-- times, their next ride is free.

-- 1. Track consecutive failures at the subscription level
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;

-- 2. Free ride credits table — one row per pending free ride
CREATE TABLE IF NOT EXISTS rider_free_ride_credits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL DEFAULT 'consecutive_subscription_failure',
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at          TIMESTAMPTZ,
  ride_id          UUID REFERENCES rides(id) ON DELETE SET NULL,
  -- Status: 'available' | 'used' | 'expired'
  status           TEXT NOT NULL DEFAULT 'available',
  CONSTRAINT rider_free_ride_credits_status_check
    CHECK (status IN ('available', 'used', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_free_ride_credits_rider
  ON rider_free_ride_credits (rider_id, status)
  WHERE status = 'available';
