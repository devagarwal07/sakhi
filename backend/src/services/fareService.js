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

// ────────────────────────────────────────────────────────────────────────────────
// applyPromo
// ────────────────────────────────────────────────────────────────────────────────
/**
 * Validate and apply a promo code to a fare.
 * Supports percentage and flat-amount discounts.
 * Enforces per-user usage limits via the promo_usage table.
 * When rideId + userId are provided, records usage and updates the ride row.
 *
 * @param {number} fare             - Fare before discount
 * @param {string} promoCode        - Code entered by user
 * @param {string} [userId]         - Rider user ID (for per-user limit enforcement)
 * @param {string} [rideId]         - Ride ID (to persist usage + update ride row)
 * @param {boolean} [dryRun=false]  - true = validate only, do NOT record usage
 * @returns {Promise<{ discounted_fare, promo_discount, promo_applied, promo_data }>}
 */
async function applyPromo(fare, promoCode, userId = null, rideId = null, dryRun = false) {
  if (!promoCode) return { discounted_fare: fare, promo_discount: 0, promo_applied: false, promo_data: null };

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('promo_discounts')
    .select('*')
    .eq('code', promoCode.toUpperCase().trim())
    .eq('is_active', true)
    .lte('valid_from', today)
    .gte('valid_to', today)
    .limit(1)
    .single();

  if (error || !data) throw new AppError('Promo code is invalid or expired.', 400, 'PROMO_INVALID');

  // Global usage cap
  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    throw new AppError('Promo code has reached its usage limit.', 400, 'PROMO_EXHAUSTED');
  }

  // Minimum fare gate
  const minFare = parseFloat(data.min_fare || 0);
  if (minFare > 0 && fare < minFare) {
    throw new AppError(`This promo code requires a minimum fare of ₹${minFare}.`, 400, 'PROMO_MIN_FARE');
  }

  // Per-user usage limit
  if (userId && data.max_uses_per_user !== null) {
    const { count: userUses } = await supabase
      .from('promo_usage')
      .select('id', { count: 'exact', head: true })
      .eq('promo_id', data.id)
      .eq('user_id', userId);
    if ((userUses || 0) >= data.max_uses_per_user) {
      throw new AppError('You have already used this promo code the maximum number of times.', 400, 'PROMO_USER_LIMIT');
    }
  }

  // Calculate discount
  let promo_discount;
  const discountType = data.discount_type || 'percentage';

  if (discountType === 'flat') {
    promo_discount = parseFloat(Math.min(data.flat_amount || 0, fare).toFixed(2));
  } else {
    // percentage
    const raw = parseFloat(((fare * data.discount_pct) / 100).toFixed(2));
    const cap = data.max_discount_cap ? parseFloat(data.max_discount_cap) : Infinity;
    promo_discount = parseFloat(Math.min(raw, cap).toFixed(2));
  }

  const discounted_fare = parseFloat(Math.max(0, fare - promo_discount).toFixed(2));

  if (!dryRun) {
    // 1. Increment global used_count
    await supabase
      .from('promo_discounts')
      .update({ used_count: data.used_count + 1 })
      .eq('id', data.id);

    // 2. Record per-user usage
    if (userId) {
      await supabase
        .from('promo_usage')
        .insert({ promo_id: data.id, user_id: userId, ride_id: rideId || null, discount_amt: promo_discount })
        .onConflict('promo_id,user_id,ride_id')  // idempotent — ignore duplicate inserts
        .ignoreDuplicates();
    }

    // 3. Stamp promo info on the ride row
    if (rideId) {
      await supabase
        .from('rides')
        .update({ promo_code: data.code, promo_discount_amt: promo_discount })
        .eq('id', rideId);
    }
  }

  return {
    discounted_fare,
    promo_discount,
    promo_applied: true,
    promo_data: {
      code:          data.code,
      description:   data.description || null,
      discount_type: discountType,
      discount_pct:  data.discount_pct || null,
      flat_amount:   data.flat_amount  || null,
      valid_to:      data.valid_to,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// applyReferralCode — called when a new user enters a referral code
// ────────────────────────────────────────────────────────────────────────────────
/**
 * Apply a referral code for a newly registered user.
 * - Stamps referred_by_code on the new user
 * - Inserts a referrals row
 * - Credits wallet to both referrer and referee
 *   (referee credit is held as a pending credit, actual credit only after
 *    their first completed ride — enforced by the ride completion handler)
 *
 * @param {string} newUserId      - UUID of newly signed-up user
 * @param {string} referralCode   - Code entered by new user
 * @returns {Promise<{ success: boolean; referrer_id?: string; referee_credit?: number }>}
 */
async function applyReferralCode(newUserId, referralCode) {
  if (!referralCode) return { success: false };

  const code = referralCode.toUpperCase().trim();

  // Prevent self-referral
  const { data: self } = await supabase
    .from('users')
    .select('referral_code, referred_by_code')
    .eq('id', newUserId)
    .single();

  if (self?.referral_code === code) {
    throw new AppError('You cannot use your own referral code.', 400, 'REFERRAL_SELF');
  }
  if (self?.referred_by_code) {
    throw new AppError('You have already applied a referral code.', 400, 'REFERRAL_ALREADY_USED');
  }

  // Look up the referrer by their code
  const { data: referrer, error: refErr } = await supabase
    .from('users')
    .select('id, referral_code')
    .eq('referral_code', code)
    .single();

  if (refErr || !referrer) {
    throw new AppError('Referral code not found.', 404, 'REFERRAL_NOT_FOUND');
  }

  // Fetch active reward config
  const { data: config } = await supabase
    .from('referral_config')
    .select('referrer_credit, referee_credit, min_rides_to_unlock')
    .eq('is_active', true)
    .limit(1)
    .single();

  const referrerCredit = parseFloat(config?.referrer_credit || 50);
  const refereeCredit  = parseFloat(config?.referee_credit  || 30);

  // Stamp referred_by_code on new user
  await supabase
    .from('users')
    .update({ referred_by_code: code })
    .eq('id', newUserId);

  // Create referral record (referrer reward credited after new user completes first ride)
  await supabase.from('referrals').insert({
    referrer_id:     referrer.id,
    referred_id:     newUserId,
    status:          'pending',     // upgrades to 'completed' after first ride
    referrer_reward: referrerCredit,
    referee_reward:  refereeCredit,
  });

  // Immediately credit the referee (new user) — they can use it on their first ride
  await supabase.rpc('increment_wallet_credits', { p_user_id: newUserId, p_amount: refereeCredit }).catch(() =>
    // Fallback: manual update if RPC doesn't exist
    supabase.from('users')
      .update({ wallet_credits: supabase.raw(`wallet_credits + ${refereeCredit}`) })
      .eq('id', newUserId)
  );

  // Log the referee credit transaction
  await supabase.from('wallet_transactions').insert({
    user_id:     newUserId,
    type:        'referral_credit',
    amount:      refereeCredit,
    description: `Welcome bonus for using referral code ${code}`,
  }).catch(() => {});

  logger.info('fareService.applyReferralCode', { newUserId, referrerId: referrer.id, code, refereeCredit });

  return { success: true, referrer_id: referrer.id, referee_credit: refereeCredit };
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
  applyReferralCode,
  applySubscriptionDiscount,
  isNightFare,
  applyNightFare,
  NIGHT_FARE_MULTIPLIER,
};
