-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: DL Verification columns on drivers table
-- Run this in your Supabase SQL editor AFTER 20260408_driver_aadhaar_digilocker.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Additional DL verification result fields
-- driving_licence_status and driving_licence_expiry already exist on the drivers
-- table from the initial schema. We add the new fields only.
ALTER TABLE drivers
  -- Issue date parsed from Signzy moreInfo e.g. "Oct 25, 2021" → stored as DATE
  ADD COLUMN IF NOT EXISTS driving_licence_issued_at    DATE,

  -- Timestamp of when verifyDrivingLicence was last called for this driver
  ADD COLUMN IF NOT EXISTS driving_licence_verified_at  TIMESTAMPTZ,

  -- JSON array of vehicle classes returned by Signzy e.g. '["MCWG","LMV"]'
  ADD COLUMN IF NOT EXISTS dl_vehicle_class             TEXT,

  -- Issue date stored as YYYY-MM-DD (for passing back to Signzy as optional param)
  -- Some deployments already have this from the initial schema; safe to re-add with IF NOT EXISTS
  ADD COLUMN IF NOT EXISTS dl_issue_date                DATE;

-- Optional: index for status-based filtering in admin dashboard
CREATE INDEX IF NOT EXISTS idx_drivers_dl_status
  ON drivers (driving_licence_status);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN (
    'driving_licence_status',
    'driving_licence_expiry',
    'driving_licence_issued_at',
    'driving_licence_verified_at',
    'dl_vehicle_class',
    'dl_issue_date',
    'dl_number',
    'dl_number_from_digilocker'
  )
ORDER BY column_name;
