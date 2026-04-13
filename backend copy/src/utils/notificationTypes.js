'use strict';

/**
 * FCM / Notification type constants used across the backend.
 * Always pass one of these as `data.type` to fcmService.sendToUser().
 */

const NotificationTypes = Object.freeze({
  // ── Ride lifecycle ───────────────────────────────────────────────────────────
  RIDE_REQUEST:             'RIDE_REQUEST',
  RIDE_ASSIGNED:            'RIDE_ASSIGNED',
  DRIVER_ARRIVING:          'DRIVER_ARRIVING',
  TRIP_STARTED:             'TRIP_STARTED',
  TRIP_COMPLETED:           'TRIP_COMPLETED',
  RIDE_CANCELLED:           'RIDE_CANCELLED',
  NO_DRIVERS_AVAILABLE:     'NO_DRIVERS_AVAILABLE',

  // ── Driver status ────────────────────────────────────────────────────────────
  DRIVER_ONLINE:            'DRIVER_ONLINE',

  // ── Subscription ────────────────────────────────────────────────────────────
  SUB_REMINDER_RIDER:       'SUB_REMINDER_RIDER',
  SUB_REMINDER_DRIVER:      'SUB_REMINDER_DRIVER',
  SUBSCRIPTION_BLOCK_START: 'SUBSCRIPTION_BLOCK_START',

  // ── Safety ───────────────────────────────────────────────────────────────────
  SOS_ALERT:                'SOS_ALERT',
  LOW_BATTERY_ALERT:        'LOW_BATTERY_ALERT',

  // ── Verification / KYC ───────────────────────────────────────────────────────
  KYC_APPROVED:             'KYC_APPROVED',
  KYC_REJECTED:             'KYC_REJECTED',
  GENDER_VERIFIED:          'GENDER_VERIFIED',
  GENDER_REJECTED:          'GENDER_REJECTED',

  // ── Rewards & marketing ──────────────────────────────────────────────────────
  REFERRAL_REWARD:          'REFERRAL_REWARD',
  LOYALTY_MILESTONE:        'LOYALTY_MILESTONE',
  PROMO_OFFER:              'PROMO_OFFER',
});

module.exports = NotificationTypes;
