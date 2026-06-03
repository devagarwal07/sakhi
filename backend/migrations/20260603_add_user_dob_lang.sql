-- Migration: Add dob and preferred_language columns to users table
-- Date: 2026-06-03

ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT;
