-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: DigiLocker e-Aadhaar identity columns on drivers table
-- Run this in your Supabase SQL editor or via psql.
-- ─────────────────────────────────────────────────────────────────────────────

-- Identity fields pulled from e-Aadhaar via Signzy v2 API
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS aadhaar_name       TEXT,           -- Name on Aadhaar
  ADD COLUMN IF NOT EXISTS aadhaar_dob        TEXT,           -- DD/MM/YYYY as returned by Signzy
  ADD COLUMN IF NOT EXISTS aadhaar_gender     TEXT,           -- 'MALE' | 'FEMALE' | 'TRANSGENDER'
  ADD COLUMN IF NOT EXISTS aadhaar_uid        TEXT,           -- Masked UID e.g. xxxxxxxx0353
  ADD COLUMN IF NOT EXISTS aadhaar_address    TEXT,           -- Full address string
  ADD COLUMN IF NOT EXISTS aadhaar_photo_url  TEXT,           -- Persist URL of Aadhaar photo (Signzy CDN)
  ADD COLUMN IF NOT EXISTS aadhaar_status     TEXT            -- 'verified' | 'pending' | 'rejected'
    DEFAULT 'pending',

  -- DigiLocker session tracking
  ADD COLUMN IF NOT EXISTS digilocker_request_id   TEXT,      -- requestId from create-url step (alias for signzy_request_id)
  ADD COLUMN IF NOT EXISTS digilocker_consent_at   TIMESTAMPTZ, -- When driver completed DigiLocker consent

  -- Get Details API data
  ADD COLUMN IF NOT EXISTS digilocker_doc_inventory  TEXT,    -- JSON array of linked docs from getDetails
  ADD COLUMN IF NOT EXISTS dl_number_from_digilocker TEXT,    -- DL number extracted from doc id (in.gov.transport-DRVLC-...)
  ADD COLUMN IF NOT EXISTS pan_from_digilocker        TEXT,   -- PAN extracted from doc id (in.gov.cbdt-PANCR-...)
  ADD COLUMN IF NOT EXISTS has_eaadhaar               BOOLEAN, -- Whether eAadhaar is linked in DigiLocker

  -- Create URL (with match scores) callback data
  ADD COLUMN IF NOT EXISTS digilocker_name_match_score  NUMERIC,  -- 0.0–1.0 name similarity vs Aadhaar
  ADD COLUMN IF NOT EXISTS digilocker_dob_match         BOOLEAN,  -- DOB matched vs Aadhaar
  ADD COLUMN IF NOT EXISTS digilocker_face_match_score  TEXT,     -- Face similarity score (e.g. '0.9')
  ADD COLUMN IF NOT EXISTS digilocker_pincode_match     BOOLEAN;  -- Pincode matched vs Aadhaar

-- Add the signzy_request_id column if it doesn't exist (some deployments may already have it)
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS signzy_request_id  TEXT;

-- Optional: index for lookups by signzy_request_id (used in webhook handler)
CREATE INDEX IF NOT EXISTS idx_drivers_signzy_request_id
  ON drivers (signzy_request_id);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN (
    'aadhaar_name', 'aadhaar_dob', 'aadhaar_gender', 'aadhaar_uid',
    'aadhaar_address', 'aadhaar_photo_url', 'aadhaar_status',
    'digilocker_request_id', 'digilocker_consent_at', 'signzy_request_id',
    'digilocker_doc_inventory', 'dl_number_from_digilocker', 'pan_from_digilocker', 'has_eaadhaar',
    'digilocker_name_match_score', 'digilocker_dob_match', 'digilocker_face_match_score', 'digilocker_pincode_match'
  )
ORDER BY column_name;
