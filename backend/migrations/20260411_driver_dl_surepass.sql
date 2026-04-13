-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Surepass DL Verification columns on drivers table
-- Adds new fields returned by the Surepass Driving Licence API that are not
-- covered by the existing Signzy DL migration (20260408_driver_dl_verification.sql).
-- Run AFTER 20260408_driver_dl_verification.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE drivers
  -- Name as it appears on the DL (may differ from profile name / Aadhaar name)
  ADD COLUMN IF NOT EXISTS dl_surepass_name   TEXT,

  -- Gender from DL record (e.g. 'M', 'F', 'Male', 'Female')
  ADD COLUMN IF NOT EXISTS dl_gender          TEXT,

  -- State code / name where licence was issued (e.g. 'UP', 'Uttar Pradesh')
  ADD COLUMN IF NOT EXISTS dl_issuing_state   TEXT,

  -- Issuing RTO office name (e.g. 'DISTRICT TRANSPORT OFFICE, MIRZAPUR')
  ADD COLUMN IF NOT EXISTS dl_ola_name        TEXT,

  -- Issuing RTO office code (e.g. 'UP20')
  ADD COLUMN IF NOT EXISTS dl_ola_code        TEXT,

  -- Blood group as on DL (may be empty string if not printed)
  ADD COLUMN IF NOT EXISTS dl_blood_group     TEXT,

  -- Whether the DL record has a profile photo available from Surepass
  ADD COLUMN IF NOT EXISTS dl_has_image       BOOLEAN,

  -- Full Surepass DL API response stored for audit / admin review
  ADD COLUMN IF NOT EXISTS dl_raw_response    JSONB;

-- Index: fast lookup by DL gender (used in safety/gender-filter queries)
CREATE INDEX IF NOT EXISTS idx_drivers_dl_gender
  ON drivers (dl_gender);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN (
    'dl_surepass_name',
    'dl_gender',
    'dl_issuing_state',
    'dl_ola_name',
    'dl_ola_code',
    'dl_blood_group',
    'dl_has_image',
    'dl_raw_response'
  )
ORDER BY column_name;
