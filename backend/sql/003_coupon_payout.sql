-- ============================================================
-- Sakhi Platform · Migration 003
-- Coupon Split Payment + Instant Driver Disbursement
-- ============================================================

-- ── 1. Add coupon liability field to rides ──────────────────
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS promo_code              text,
  ADD COLUMN IF NOT EXISTS promo_discount_amount   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_liability_settled boolean DEFAULT false;

-- ── 2. Add payout fields to drivers ────────────────────────
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS upi_id           text,
  ADD COLUMN IF NOT EXISTS bank_account_no  text,
  ADD COLUMN IF NOT EXISTS bank_ifsc        text,
  ADD COLUMN IF NOT EXISTS fund_account_id  text;   -- RazorpayX fund_account_id

-- ── 3. Payout transactions log ──────────────────────────────
CREATE TABLE IF NOT EXISTS payout_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES drivers(id),
  ride_id         uuid REFERENCES rides(id),
  amount          numeric NOT NULL,
  type            text NOT NULL CHECK (type IN ('coupon_liability', 'weekly_incentive', 'loyalty_reward')),
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  razorpay_payout_id text,
  utr             text,          -- Unique Transaction Reference from bank
  failure_reason  text,
  initiated_at    timestamptz DEFAULT now(),
  settled_at      timestamptz
);

ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payout_transactions_driver ON payout_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_ride   ON payout_transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_status ON payout_transactions(status);

-- ── 4. subscriptions: add payment_order_id for Razorpay ────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_order_id text;
