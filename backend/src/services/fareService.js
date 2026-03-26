'use strict';

const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * getFareConfig — fetch active config for a vehicle type (default: 'auto')
 */
async function getFareConfig(vehicleType = 'auto') {
  const { data, error } = await supabase
    .from('fare_config')
    .select('*')
    .eq('vehicle_type', vehicleType)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) {
    logger.error('fareService.getFareConfig — not found', { vehicleType, error });
    throw new AppError('Fare configuration not found.', 500, 'FARE_CONFIG_NOT_FOUND');
  }

  return data;
}

/**
 * calculateFare — base fare + distance + duration
 * Returns { estimated_fare, breakdown }
 */
function calculateFare(distanceKm, durationMin, fareConfig) {
  const base_fare = parseFloat(fareConfig.base_fare);
  const distance_charge = parseFloat((fareConfig.per_km * distanceKm).toFixed(2));
  const duration_charge = parseFloat((fareConfig.per_min_wait * durationMin).toFixed(2));
  const estimated_fare = parseFloat((base_fare + distance_charge + duration_charge).toFixed(2));

  return {
    estimated_fare,
    breakdown: { base_fare, distance_charge, duration_charge },
  };
}

/**
 * applyPromo — validate promo code and return discounted fare + discount amount
 */
async function applyPromo(fare, promoCode) {
  if (!promoCode) return { discounted_fare: fare, promo_discount: 0, promo_applied: false };

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('promo_discounts')
    .select('*')
    .eq('code', promoCode.toUpperCase())
    .eq('is_active', true)
    .lte('valid_from', today)
    .gte('valid_to', today)
    .limit(1)
    .single();

  if (error || !data) {
    throw new AppError('Promo code is invalid or expired.', 400, 'PROMO_INVALID');
  }

  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    throw new AppError('Promo code has reached its usage limit.', 400, 'PROMO_EXHAUSTED');
  }

  const promo_discount = parseFloat(((fare * data.discount_pct) / 100).toFixed(2));
  const discounted_fare = parseFloat(Math.max(0, fare - promo_discount).toFixed(2));

  // Increment used_count atomically
  await supabase
    .from('promo_discounts')
    .update({ used_count: data.used_count + 1 })
    .eq('id', data.id);

  return { discounted_fare, promo_discount, promo_applied: true };
}

/**
 * calculateWaitingCharge — compute charge accrued while driver waits at pickup
 * Returns { waiting_seconds, waiting_charge }
 */
function calculateWaitingCharge(waitingStartAt, fareConfig) {
  const elapsedSeconds = Math.floor((Date.now() - new Date(waitingStartAt).getTime()) / 1000);
  const freeWaitSecs = parseInt(fareConfig.free_wait_secs, 10);

  if (elapsedSeconds <= freeWaitSecs) {
    return { waiting_seconds: elapsedSeconds, waiting_charge: 0 };
  }

  const billableSeconds = elapsedSeconds - freeWaitSecs;
  const waiting_charge = parseFloat(((fareConfig.per_min_wait * billableSeconds) / 60).toFixed(2));

  return { waiting_seconds: elapsedSeconds, waiting_charge };
}

module.exports = { getFareConfig, calculateFare, applyPromo, calculateWaitingCharge };
