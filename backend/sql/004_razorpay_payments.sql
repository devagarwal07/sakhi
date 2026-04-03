-- ============================================================
-- Sakhi Platform · Migration 004
-- Razorpay Ride Payments + Driver Commission Payments
-- Run in: Supabase SQL Editor
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. rides table — add Razorpay payment fields
-- ──────────────────────────────────────────────────────────────

ALTER TABLE rides
  -- Razorpay order & payment IDs (stored on order creation and after capture)
  ADD COLUMN IF NOT EXISTS razorpay_order_id    text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id  text,

  -- Payment status lifecycle: pending → paid | collected (cash)
  ADD COLUMN IF NOT EXISTS payment_status       text DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'collected', 'failed')),

  -- Fare breakdown fields (used by fareSummary endpoint and PaymentDetailsScreen)
  ADD COLUMN IF NOT EXISTS base_fare            numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wait_charge          numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_commission  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_fare             numeric DEFAULT 0,

  -- Driver's rating for the rider (stored by rateRider endpoint)
  ADD COLUMN IF NOT EXISTS driver_rating_for_rider smallint
    CHECK (driver_rating_for_rider BETWEEN 1 AND 5);


-- ──────────────────────────────────────────────────────────────
-- 2. rides — add final location fields (used by /complete endpoint)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS final_latitude   numeric,
  ADD COLUMN IF NOT EXISTS final_longitude  numeric;


-- ──────────────────────────────────────────────────────────────
-- 3. rides — indexes for webhook & payment lookups
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rides_razorpay_order_id
  ON rides (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rides_payment_status
  ON rides (payment_status);


-- ──────────────────────────────────────────────────────────────
-- 4. driver_commission_payments — NEW table
--    Logs every platform commission paid by a driver via Razorpay
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_commission_payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id            uuid NOT NULL REFERENCES drivers (id) ON DELETE CASCADE,

  -- 'daily' or 'weekly'
  period               text NOT NULL DEFAULT 'daily'
    CHECK (period IN ('daily', 'weekly')),

  amount_inr           numeric NOT NULL,
  razorpay_order_id    text,
  razorpay_payment_id  text,

  status               text NOT NULL DEFAULT 'paid'
    CHECK (status IN ('pending', 'paid', 'failed')),

  paid_at              timestamptz,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE driver_commission_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_driver_commission_payments_driver_id
  ON driver_commission_payments (driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_commission_payments_paid_at
  ON driver_commission_payments (paid_at);


-- ──────────────────────────────────────────────────────────────
-- 5. commission_ledger — add Razorpay traceability fields
-- ──────────────────────────────────────────────────────────────

ALTER TABLE commission_ledger
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_source       text DEFAULT 'razorpay'
    CHECK (payment_source IN ('razorpay', 'manual', 'wallet'));


-- ──────────────────────────────────────────────────────────────
-- DONE
-- ──────────────────────────────────────────────────────────────
