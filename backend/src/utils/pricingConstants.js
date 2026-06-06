'use strict';

/**
 * Sakhi Pricing Constants — single source of truth.
 * Keep in sync with sakhi-customer/src/utils/fareCalculator.js
 */

const PRICING = {
  // ── Passenger Fare ─────────────────────────────────────────────────────────

  /** Minimum fare covers the first BASE_KM km */
  BASE_KM: 2,

  /** Total base fare for the first 2 km (govt ₹36 + pickup ₹10 + Sakhi ₹4) */
  BASE_FARE: 50,

  /** Components of base fare (informational) */
  BASE_FARE_COMPONENTS: {
    govt_minimum: 36,
    pickup_charge: 10,
    sakhi_premium: 4,
  },

  /** Per km rate after the first BASE_KM km (govt ₹18 + Sakhi ₹2) */
  PER_KM_RATE: 20,

  /** Per km rate breakdown (informational) */
  PER_KM_COMPONENTS: {
    govt_rate: 18,
    sakhi_premium: 2,
  },

  // ── Pickup distance surcharge ───────────────────────────────────────────────

  /** Free pickup radius (km) — no surcharge if driver is within this distance */
  FREE_PICKUP_RADIUS_KM: 2,

  /** Extra charge per km if driver is beyond FREE_PICKUP_RADIUS_KM */
  PICKUP_SURCHARGE_PER_KM: 5,

  /** Maximum pickup surcharge cap */
  MAX_PICKUP_SURCHARGE: 20,

  // ── Waiting charges ─────────────────────────────────────────────────────────

  /** Free waiting window in seconds */
  FREE_WAIT_SECS: 180,   // 3 minutes

  /** Charge per minute after free window (in ₹) */
  WAIT_CHARGE_PER_MIN: 1,

  // ── Driver Commission ───────────────────────────────────────────────────────

  COMMISSION: {
    /** Daily platform fee */
    daily: 35,

    /** 7-day plan (saves ₹35 vs paying daily) */
    weekly: 210,

    /** Per-day equivalent on 7-day plan */
    weekly_per_day: 30,
  },

  /** Free trial duration for new drivers (days) */
  NEW_DRIVER_FREE_TRIAL_DAYS: 7,

  // ── Passenger Subscription Discounts ────────────────────────────────────────

  SUBSCRIPTION_DISCOUNTS: {
    7:  { pct: 5,  max_saving: 100 },
    14: { pct: 10, max_saving: 150 },
    30: { pct: 15, max_saving: 200 },
  },
};

module.exports = PRICING;
