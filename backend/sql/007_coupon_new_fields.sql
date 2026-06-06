-- Migration 007: Add advanced coupon features
-- Run this in your Supabase SQL Editor

ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS flat_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER,
ADD COLUMN IF NOT EXISTS applicable_rides VARCHAR(50) DEFAULT 'all';

-- Ensure existing percentage coupons continue to work
UPDATE coupons 
SET discount_type = 'percentage' 
WHERE discount_type IS NULL;
