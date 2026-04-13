-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: RC Verification columns on drivers table
-- Adds Surepass RC V2 result fields for vehicle registration verification.
-- Run this in your Supabase SQL editor AFTER 20260408_driver_dl_verification.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE drivers
  -- Verification lifecycle
  ADD COLUMN IF NOT EXISTS rc_verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rc_status              TEXT,          -- 'verified' | 'rejected' | 'blacklisted'

  -- Key RC fields (may be masked depending on enrich flag used)
  ADD COLUMN IF NOT EXISTS rc_owner_name          TEXT,
  ADD COLUMN IF NOT EXISTS rc_chassis_number      TEXT,
  ADD COLUMN IF NOT EXISTS rc_fuel_type           TEXT,
  ADD COLUMN IF NOT EXISTS rc_maker_model         TEXT,

  -- Date fields
  ADD COLUMN IF NOT EXISTS rc_insurance_upto      DATE,          -- insurance_upto from API
  ADD COLUMN IF NOT EXISTS rc_fit_upto            DATE,          -- fit_up_to from API
  ADD COLUMN IF NOT EXISTS rc_registration_date   DATE,          -- registration_date from API

  -- Financing & blacklist info
  ADD COLUMN IF NOT EXISTS rc_financed            BOOLEAN,
  ADD COLUMN IF NOT EXISTS rc_blacklist_status    TEXT,          -- non-empty string means blacklisted

  -- Full audit trail — raw Surepass response stored as JSONB
  ADD COLUMN IF NOT EXISTS rc_raw_response        JSONB;

-- Index: filter by RC status in admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_drivers_rc_status
  ON drivers (rc_status);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN (
    'rc_verified_at',
    'rc_status',
    'rc_owner_name',
    'rc_chassis_number',
    'rc_fuel_type',
    'rc_maker_model',
    'rc_insurance_upto',
    'rc_fit_upto',
    'rc_registration_date',
    'rc_financed',
    'rc_blacklist_status',
    'rc_raw_response'
  )
ORDER BY column_name;
