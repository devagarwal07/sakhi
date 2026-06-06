-- ============================================================
-- Sakhi Platform · Migration 006
-- Add missing driver fields for Admin Onboarding
-- ============================================================

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS aadhaar_back_url text,
  ADD COLUMN IF NOT EXISTS dl_number text,
  ADD COLUMN IF NOT EXISTS dl_expiry date,
  ADD COLUMN IF NOT EXISTS dl_back_url text,
  ADD COLUMN IF NOT EXISTS police_verification_number text,
  ADD COLUMN IF NOT EXISTS police_verification_url text,
  ADD COLUMN IF NOT EXISTS vehicle_image_url text,
  ADD COLUMN IF NOT EXISTS working_hours_start time,
  ADD COLUMN IF NOT EXISTS working_hours_end time,
  ADD COLUMN IF NOT EXISTS pan text,
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS bank_account_no text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS onboarding_note text,
  ADD COLUMN IF NOT EXISTS onboarding_admin_id uuid,
  ADD COLUMN IF NOT EXISTS temp_pin text;
