-- ============================================================
-- Sakhi Platform · Rider Face Liveness Onboarding
-- Migration: 20260508_rider_face_liveness_onboarding.sql
-- Generated: 2026-05-08
-- Purpose:
--   • Add Rekognition Face Liveness + gender decision fields for riders.
--   • Support retry up to N attempts and manual review flag.
-- Notes:
--   • Uses existing users.verification_status enum: pending|approved|rejected
-- ============================================================

-- 0) Backward-compatible base column (some DBs don't have this yet)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_method text;

-- 1) Expand verification_method to include face_liveness
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_verification_method_check;

ALTER TABLE users
  ADD CONSTRAINT users_verification_method_check
  CHECK (verification_method IN ('aadhaar', 'facial', 'face_liveness'));

-- 2) Add face-liveness onboarding fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS face_verification_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_liveness_session_id text,
  ADD COLUMN IF NOT EXISTS face_liveness_confidence numeric,
  ADD COLUMN IF NOT EXISTS face_gender text,
  ADD COLUMN IF NOT EXISTS face_gender_confidence numeric,
  ADD COLUMN IF NOT EXISTS face_reference_photo_url text,
  ADD COLUMN IF NOT EXISTS face_decision_reason text,
  ADD COLUMN IF NOT EXISTS face_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS face_reviewed_at timestamptz;

-- 3) (Optional) Constrain face_gender values
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_face_gender_check;

ALTER TABLE users
  ADD CONSTRAINT users_face_gender_check
  CHECK (face_gender IS NULL OR face_gender IN ('F', 'M', 'unknown'));

-- 4) Helpful index for admin dashboard manual-review queue
CREATE INDEX IF NOT EXISTS idx_users_face_review_required
  ON users (face_review_required)
  WHERE face_review_required = true;
