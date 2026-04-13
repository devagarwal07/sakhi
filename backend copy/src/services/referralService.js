'use strict';

const supabase = require('../config/supabase');
const fcmService = require('./fcmService');
const logger = require('../utils/logger');

// Configurable thresholds
const REFERRAL_RIDE_THRESHOLD = 5;   // referee must complete exactly this many rides
const REFERRAL_REWARD_AMOUNT  = 200; // ₹200 added to referrer's wallet

/**
 * checkDriverReferral
 *
 * Called after every ride completion. Checks if the driving referee
 * has just hit the REFERRAL_RIDE_THRESHOLD completed rides, and if so,
 * credits the referrer's wallet once (guarded by referrals.rewarded_at IS NULL).
 *
 * @param {string} refereeDriverId - The driver who just completed a ride
 */
async function checkDriverReferral(refereeDriverId) {
  try {
    // 1. Count referee's completed rides
    const { count, error: countErr } = await supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', refereeDriverId)
      .eq('status', 'completed');

    if (countErr) {
      logger.warn('referralService.checkDriverReferral — count error', { refereeDriverId, error: countErr.message });
      return;
    }

    // Only reward at exactly the threshold to avoid double-rewarding
    if (count !== REFERRAL_RIDE_THRESHOLD) return;

    // 2. Find an un-rewarded referral for this referee
    const { data: referralRows } = await supabase
      .from('referrals')
      .select('id, referrer_id')
      .eq('referee_id', refereeDriverId)
      .eq('type', 'driver')
      .is('rewarded_at', null)
      .limit(1);

    const referral = referralRows?.[0];
    if (!referral) return; // No pending referral — nothing to do

    const referrerId = referral.referrer_id;

    // 3. Fetch referrer to get current wallet balance & FCM token
    const { data: referrerRows } = await supabase
      .from('drivers')
      .select('id, name, wallet_credits, fcm_token')
      .eq('id', referrerId)
      .limit(1);

    const referrer = referrerRows?.[0];
    if (!referrer) return;

    const newCredits = parseFloat((parseFloat(referrer.wallet_credits || 0) + REFERRAL_REWARD_AMOUNT).toFixed(2));

    // 4. Credit wallet + mark referral rewarded (in parallel)
    await Promise.all([
      supabase
        .from('drivers')
        .update({ wallet_credits: newCredits })
        .eq('id', referrerId),

      supabase
        .from('referrals')
        .update({ rewarded_at: new Date().toISOString() })
        .eq('id', referral.id),
    ]);

    // 5. FCM notification to referrer
    fcmService.sendToUser(referrerId, 'driver', {
      title: '🎉 Referral Reward Earned!',
      body: `Your referred driver has completed ${REFERRAL_RIDE_THRESHOLD} rides. ₹${REFERRAL_REWARD_AMOUNT} added to your wallet!`,
      data: {
        type:           'REFERRAL_REWARD',
        referee_id:     refereeDriverId,
        reward_amount:  String(REFERRAL_REWARD_AMOUNT),
        wallet_credits: String(newCredits),
      },
    }).catch(() => {});

    // 6. Log in notifications_log
    await supabase.from('notifications_log').insert({
      user_id: referrerId,
      type:    'REFERRAL_REWARD',
      title:   '🎉 Referral Reward Earned!',
      body:    `Your referred driver completed ${REFERRAL_RIDE_THRESHOLD} rides. ₹${REFERRAL_REWARD_AMOUNT} added to your wallet!`,
      read:    false,
    }).catch(() => {});

    logger.info('referralService.checkDriverReferral — reward applied', {
      referrerId,
      refereeDriverId,
      reward: REFERRAL_REWARD_AMOUNT,
      newCredits,
    });
  } catch (err) {
    // Non-fatal — log and continue
    logger.error('referralService.checkDriverReferral — unexpected error', { refereeDriverId, error: err.message });
  }
}

module.exports = { checkDriverReferral };
