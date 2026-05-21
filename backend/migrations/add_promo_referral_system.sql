-- =========================================================
-- Migration: Promo & Referral System Enhancements
-- Run this once on the production Supabase database.
-- Idempotent: all statements use IF NOT EXISTS / IF EXISTS guards.
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- 1. Extend promo_discounts with flat-amount + per-user cap
-- ─────────────────────────────────────────────────────────
ALTER TABLE promo_discounts
  ADD COLUMN IF NOT EXISTS discount_type     TEXT    NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS flat_amount       NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_discount_cap  NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_fare          NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_uses_per_user INT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS applicable_rides  TEXT    NOT NULL DEFAULT 'all';

-- Add CHECK constraints separately so they never fail if column already existed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'promo_discounts_discount_type_check' AND conrelid = 'promo_discounts'::regclass
  ) THEN
    ALTER TABLE promo_discounts
      ADD CONSTRAINT promo_discounts_discount_type_check
        CHECK (discount_type IN ('percentage', 'flat'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'promo_discounts_applicable_rides_check' AND conrelid = 'promo_discounts'::regclass
  ) THEN
    ALTER TABLE promo_discounts
      ADD CONSTRAINT promo_discounts_applicable_rides_check
        CHECK (applicable_rides IN ('all', 'first_ride', 'nth_ride'));
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────
-- 2. Track per-user promo usage
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_usage (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id     UUID          NOT NULL REFERENCES promo_discounts(id) ON DELETE CASCADE,
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ride_id      UUID          REFERENCES rides(id) ON DELETE SET NULL,
  used_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  discount_amt NUMERIC(10, 2) NOT NULL DEFAULT 0,
  UNIQUE (promo_id, user_id, ride_id)
);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user  ON promo_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_promo ON promo_usage (promo_id);

-- ─────────────────────────────────────────────────────────
-- 3. Extra columns on users table
-- ─────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by_code   TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_reward_at TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallet_credits     NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────
-- 4. Referral reward config table
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_config (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_credit     NUMERIC(10, 2) NOT NULL DEFAULT 50,
  referee_credit      NUMERIC(10, 2) NOT NULL DEFAULT 30,
  min_rides_to_unlock INT           NOT NULL DEFAULT 1,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

INSERT INTO referral_config (referrer_credit, referee_credit, min_rides_to_unlock, is_active)
SELECT 50, 30, 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM referral_config LIMIT 1);

-- ─────────────────────────────────────────────────────────
-- 5. Store promo info on rides table
-- ─────────────────────────────────────────────────────────
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS promo_code         TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_discount_amt NUMERIC(10, 2) DEFAULT 0;

-- ─────────────────────────────────────────────────────────
-- 6. Referrals tracking table
--    CHECK constraint as named table-level (avoids parser issues)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_used         TEXT          NOT NULL,
  referral_status   TEXT          NOT NULL DEFAULT 'pending',
  referee_credited  NUMERIC(10,2) DEFAULT 0,
  referrer_credited NUMERIC(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ   DEFAULT NULL,
  UNIQUE (referrer_id, referee_id),
  CONSTRAINT referrals_status_check
    CHECK (referral_status IN ('pending', 'completed', 'expired'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee  ON referrals (referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status   ON referrals (referral_status);
