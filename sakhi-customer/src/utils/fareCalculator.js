/**
 * Sakhi Fare Calculator — client-side mirror of backend fareService.
 * Pure JS (no imports needed). Kept in sync with:
 *   backend/src/services/fareService.js
 *   backend/src/utils/pricingConstants.js
 */

export const PRICING = {
  BASE_KM:   2,
  BASE_FARE: 50,
  BASE_FARE_COMPONENTS: {
    govt_minimum: 36,
    pickup_charge: 10,
    sakhi_premium: 4,
  },
  PER_KM_RATE: 20,
  PER_KM_COMPONENTS: {
    govt_rate: 18,
    sakhi_premium: 2,
  },
  FREE_PICKUP_RADIUS_KM:    2,
  PICKUP_SURCHARGE_PER_KM:  5,
  MAX_PICKUP_SURCHARGE:     20,
  FREE_WAIT_SECS:           180,  // 3 minutes
  WAIT_CHARGE_PER_MIN:      1,

  COMMISSION: {
    daily:        35,
    weekly:       210,
    weekly_per_day: 30,
  },
  NEW_DRIVER_FREE_TRIAL_DAYS: 7,

  SUBSCRIPTION_DISCOUNTS: {
    7:  { pct: 5,  max_saving: 100 },
    15: { pct: 10, max_saving: 150 },
    30: { pct: 15, max_saving: 200 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the full fare breakdown for a ride.
 *
 * @param {number} distanceKm    - Trip distance (pickup → dropoff)
 * @param {number} [pickupKm=0] - Distance from driver to pickup (for surcharge)
 * @returns {{
 *   estimated_fare: number,
 *   base_fare: number,
 *   billable_km: number,
 *   distance_charge: number,
 *   pickup_surcharge: number,
 *   waiting_charge: number,
 *   per_km_rate: number,
 *   base_km: number,
 * }}
 */
export function calculateFare(distanceKm, pickupKm = 0) {
  const dist = Math.max(0, parseFloat(distanceKm) || 0);
  const pkup = Math.max(0, parseFloat(pickupKm)   || 0);

  const base_fare = PRICING.BASE_FARE;

  const billable_km     = Math.max(0, dist - PRICING.BASE_KM);
  const distance_charge = parseFloat((billable_km * PRICING.PER_KM_RATE).toFixed(2));

  let pickup_surcharge = 0;
  if (pkup > PRICING.FREE_PICKUP_RADIUS_KM) {
    const extra_km   = pkup - PRICING.FREE_PICKUP_RADIUS_KM;
    pickup_surcharge = Math.min(
      parseFloat((extra_km * PRICING.PICKUP_SURCHARGE_PER_KM).toFixed(2)),
      PRICING.MAX_PICKUP_SURCHARGE,
    );
  }

  const waiting_charge  = 0;
  const estimated_fare  = parseFloat(
    (base_fare + distance_charge + pickup_surcharge + waiting_charge).toFixed(2),
  );

  return {
    estimated_fare,
    base_fare,
    billable_km: parseFloat(billable_km.toFixed(2)),
    distance_charge,
    pickup_surcharge,
    waiting_charge,
    per_km_rate: PRICING.PER_KM_RATE,
    base_km:     PRICING.BASE_KM,
  };
}

/**
 * Format a km number from the Google Directions API text (e.g. "5.2 km") into a number.
 * Returns 0 if parsing fails.
 */
export function parseKmText(distanceText) {
  if (!distanceText) return 0;
  const match = distanceText.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Apply a subscription discount to a base fare total.
 *
 * @param {number} baseFare   - Undiscounted total
 * @param {7|15|30} planDays
 * @returns {{ discounted: number, saving: number, pct: number }}
 */
export function applySubscriptionDiscount(baseFare, planDays) {
  const rule = PRICING.SUBSCRIPTION_DISCOUNTS[planDays];
  if (!rule) return { discounted: baseFare, saving: 0, pct: 0 };

  const rawSaving  = parseFloat(((baseFare * rule.pct) / 100).toFixed(2));
  const saving     = Math.min(rawSaving, rule.max_saving);
  const discounted = parseFloat(Math.max(0, baseFare - saving).toFixed(2));

  return { discounted, saving, pct: rule.pct };
}

/**
 * Get driver commission info.
 * @param {'daily'|'weekly'} period
 */
export function getDriverCommission(period = 'daily') {
  if (period === 'weekly') {
    return {
      amount:  PRICING.COMMISSION.weekly,
      per_day: PRICING.COMMISSION.weekly_per_day,
      savings: PRICING.COMMISSION.daily * 7 - PRICING.COMMISSION.weekly,
      label:   '7-Day Plan',
    };
  }
  return {
    amount:  PRICING.COMMISSION.daily,
    per_day: PRICING.COMMISSION.daily,
    savings: 0,
    label:   'Daily',
  };
}
