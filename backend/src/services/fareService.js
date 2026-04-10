'use strict';

const supabase   = require('../config/supabase');
const AppError   = require('../utils/AppError');
const logger     = require('../utils/logger');
const PRICING    = require('../utils/pricingConstants');

// ─────────────────────────────────────────────────────────────────────────────
// calculateFare
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calculate the passenger fare for a ride.
 *
 * @param {number} distanceKm      - Trip distance in km (pickup → dropoff)
 * @param {number} durationMin     - Estimated trip duration in minutes (for display only — waiting is separate)
 * @param {number} [pickupKm=0]   - Distance from driver to pickup point (for surcharge)
 * @returns {{ estimated_fare: number, breakdown: object }}
 */
function calculateFare(distanceKm, durationMin = 0, pickupKm = 0) {
  const dist = Math.max(0, parseFloat(distanceKm) || 0);
  const pkup = Math.max(0, parseFloat(pickupKm)   || 0);

  // 1. Base fare — covers the first 2 km
  const base_fare = PRICING.BASE_FARE;

  // 2. Distance charge — only km BEYOND the first BASE_KM
  const billable_km     = Math.max(0, dist - PRICING.BASE_KM);
  const distance_charge = parseFloat((billable_km * PRICING.PER_KM_RATE).toFixed(2));

  // 3. Pickup surcharge — only if driver is more than 2 km away
  let pickup_surcharge = 0;
  if (pkup > PRICING.FREE_PICKUP_RADIUS_KM) {
    const extra_km    = pkup - PRICING.FREE_PICKUP_RADIUS_KM;
    pickup_surcharge  = Math.min(
      parseFloat((extra_km * PRICING.PICKUP_SURCHARGE_PER_KM).toFixed(2)),
      PRICING.MAX_PICKUP_SURCHARGE
    );
  }

  // 4. Waiting charge — 0 at estimate time (calculated at completion via calculateWaitingCharge)
  const waiting_charge = 0;

  const estimated_fare = parseFloat(
    (base_fare + distance_charge + pickup_surcharge + waiting_charge).toFixed(2)
  );

  return {
    estimated_fare,
    breakdown: {
      base_fare,           // ₹50  — first 2 km
      billable_km: parseFloat(billable_km.toFixed(2)),
      distance_charge,     // billable_km × ₹20
      pickup_surcharge,    // ₹5/km beyond 2 km, max ₹20
      waiting_charge,      // accrued while driver waits (0 at estimate)
      per_km_rate:         PRICING.PER_KM_RATE,
      base_km:             PRICING.BASE_KM,
      // Component labels for UI
      components: {
        base_govt:    PRICING.BASE_FARE_COMPONENTS.govt_minimum,
        base_pickup:  PRICING.BASE_FARE_COMPONENTS.pickup_charge,
        base_sakhi:   PRICING.BASE_FARE_COMPONENTS.sakhi_premium,
        per_km_govt:  PRICING.PER_KM_COMPONENTS.govt_rate,
        per_km_sakhi: PRICING.PER_KM_COMPONENTS.sakhi_premium,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateWaitingCharge
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calculate waiting charge accrued since driver arrived at pickup.
 *
 * @param {string|Date} waitingStartAt  - ISO timestamp when driver marked 'arrived'
 * @returns {{ waiting_seconds: number, waiting_charge: number }}
 */
function calculateWaitingCharge(waitingStartAt) {
  const elapsedSeconds = Math.floor((Date.now() - new Date(waitingStartAt).getTime()) / 1000);

  if (elapsedSeconds <= PRICING.FREE_WAIT_SECS) {
    return { waiting_seconds: elapsedSeconds, waiting_charge: 0 };
  }

  const billableSeconds = elapsedSeconds - PRICING.FREE_WAIT_SECS;
  const waiting_charge  = parseFloat(
    ((PRICING.WAIT_CHARGE_PER_MIN * billableSeconds) / 60).toFixed(2)
  );

  return { waiting_seconds: elapsedSeconds, waiting_charge };
}

// ─────────────────────────────────────────────────────────────────────────────
// getDriverCommission
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns commission amount and metadata for a given period.
 *
 * @param {'daily'|'weekly'} period
 * @returns {{ amount: number, per_day: number, savings: number, label: string }}
 */
function getDriverCommission(period = 'daily') {
  if (period === 'weekly') {
    const full_daily_total = PRICING.COMMISSION.daily * 7;
    return {
      amount:   PRICING.COMMISSION.weekly,
      per_day:  PRICING.COMMISSION.weekly_per_day,
      savings:  full_daily_total - PRICING.COMMISSION.weekly,
      label:    '7-Day Plan',
    };
  }
  return {
    amount:   PRICING.COMMISSION.daily,
    per_day:  PRICING.COMMISSION.daily,
    savings:  0,
    label:    'Daily',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getFareConfig — kept for backwards compatibility (some routes still call it)
// ─────────────────────────────────────────────────────────────────────────────
async function getFareConfig(vehicleType = 'auto') {
  // Attempt DB lookup; fall back to hardcoded constants if not found.
  try {
    const { data, error } = await supabase
      .from('fare_config')
      .select('*')
      .eq('vehicle_type', vehicleType)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!error && data) return data;
  } catch (_) { /* ignore */ }

  // Return a synthetic config that matches our constants
  logger.warn('fareService.getFareConfig — DB config not found, using hardcoded defaults');
  return {
    vehicle_type:    vehicleType,
    base_fare:       PRICING.BASE_FARE,
    base_km:         PRICING.BASE_KM,
    per_km:          PRICING.PER_KM_RATE,
    free_wait_secs:  PRICING.FREE_WAIT_SECS,
    per_min_wait:    PRICING.WAIT_CHARGE_PER_MIN,
    is_active:       true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyPromo — unchanged
// ─────────────────────────────────────────────────────────────────────────────
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

  if (error || !data) throw new AppError('Promo code is invalid or expired.', 400, 'PROMO_INVALID');

  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    throw new AppError('Promo code has reached its usage limit.', 400, 'PROMO_EXHAUSTED');
  }

  const promo_discount  = parseFloat(((fare * data.discount_pct) / 100).toFixed(2));
  const discounted_fare = parseFloat(Math.max(0, fare - promo_discount).toFixed(2));

  await supabase
    .from('promo_discounts')
    .update({ used_count: data.used_count + 1 })
    .eq('id', data.id);

  return { discounted_fare, promo_discount, promo_applied: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// applySubscriptionDiscount — passenger subscription plan savings
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Apply a subscription discount to a base total fare.
 *
 * @param {number} baseFare   - Total undiscounted fare
 * @param {7|15|30} planDays  - Subscription plan duration
 * @returns {{ discounted_fare: number, saving: number, pct: number }}
 */
function applySubscriptionDiscount(baseFare, planDays) {
  const rule = PRICING.SUBSCRIPTION_DISCOUNTS[planDays];
  if (!rule) return { discounted_fare: baseFare, saving: 0, pct: 0 };

  const rawSaving      = parseFloat(((baseFare * rule.pct) / 100).toFixed(2));
  const saving         = Math.min(rawSaving, rule.max_saving);
  const discounted_fare = parseFloat(Math.max(0, baseFare - saving).toFixed(2));

  return { discounted_fare, saving, pct: rule.pct };
}

// ─────────────────────────────────────────────────────────────────────────────
// Night Fare — 1.5× multiplier between 22:00 and 06:00
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns true if the given date/time falls within night fare hours (22:00 – 06:00).
 * @param {Date} [date=new Date()]
 */
function isNightFare(date = new Date()) {
  const h = date.getHours();
  return h >= 22 || h < 6;
}

const NIGHT_FARE_MULTIPLIER = 1.5;

/**
 * Applies the night fare multiplier if applicable.
 * @param {number} fare
 * @param {Date} [date=new Date()]
 * @returns {{ final_fare: number, night_surcharge: number, is_night_fare: boolean }}
 */
function applyNightFare(fare, date = new Date()) {
  if (!isNightFare(date)) {
    return { final_fare: fare, night_surcharge: 0, is_night_fare: false };
  }
  const night_surcharge = parseFloat((fare * (NIGHT_FARE_MULTIPLIER - 1)).toFixed(2));
  const final_fare      = parseFloat((fare + night_surcharge).toFixed(2));
  return { final_fare, night_surcharge, is_night_fare: true };
}

module.exports = {
  calculateFare,
  calculateWaitingCharge,
  getDriverCommission,
  getFareConfig,
  applyPromo,
  applySubscriptionDiscount,
  isNightFare,
  applyNightFare,
  NIGHT_FARE_MULTIPLIER,
};
