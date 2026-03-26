'use strict';

const cron = require('node-cron');
const supabase = require('../config/supabase');
const fcmService = require('../services/fcmService');
const logger = require('../utils/logger');

const COMMISSION_DISCOUNT  = 500;  // ₹500 reward on 26+ active days
const MILESTONE_ACTIVE_DAYS = 26;

async function runLoyaltyCheck() {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    const { data: milestones } = await supabase
      .from('loyalty_milestones')
      .select('id, driver_id, active_days, milestone_reached')
      .eq('month', month)
      .eq('milestone_reached', false)
      .gte('active_days', MILESTONE_ACTIVE_DAYS);

    if (!milestones?.length) return;

    await Promise.all(milestones.map(async (m) => {
      try {
        // Mark milestone reached
        await supabase.from('loyalty_milestones')
          .update({ milestone_reached: true, reward_applied: true })
          .eq('id', m.id);

        // Credit driver wallet
        const { data: driverRows } = await supabase
          .from('drivers')
          .select('wallet_credits, name, fcm_token')
          .eq('id', m.driver_id)
          .limit(1);

        const driver = driverRows?.[0];
        const currentCredits = parseFloat(driver?.wallet_credits || 0);

        await supabase.from('drivers')
          .update({ wallet_credits: currentCredits + COMMISSION_DISCOUNT })
          .eq('id', m.driver_id);

        // FCM notification
        fcmService.sendToUser(m.driver_id, 'driver', {
          title: '🎉 Loyalty Milestone Reached!',
          body: `Congratulations ${driver?.name || ''}! You have driven ${m.active_days} active days this month. ₹${COMMISSION_DISCOUNT} commission discount added to your wallet!`,
          data: {
            type:           'LOYALTY_MILESTONE',
            month,
            reward_amount:  String(COMMISSION_DISCOUNT),
            active_days:    String(m.active_days),
          },
        }).catch(() => {});

        // Persist in notifications_log
        await supabase.from('notifications_log').insert({
          user_id: m.driver_id,
          type:    'LOYALTY_MILESTONE',
          title:   '🎉 Loyalty Milestone Reached!',
          body:    `You drove ${m.active_days} active days this month. ₹${COMMISSION_DISCOUNT} added to your wallet!`,
          read:    false,
        }).catch(() => {});

        logger.info('LoyaltyMilestoneWorker — milestone rewarded', { driverId: m.driver_id, month, reward: COMMISSION_DISCOUNT });
      } catch (err) {
        logger.error('LoyaltyMilestoneWorker — error for driver', { driverId: m.driver_id, error: err.message });
      }
    }));
  } catch (err) {
    logger.error('LoyaltyMilestoneWorker — error', { error: err.message });
  }
}

function startLoyaltyMilestoneWorker() {
  // Run at midnight every day (IST)
  cron.schedule('0 0 * * *', runLoyaltyCheck, { timezone: 'Asia/Kolkata' });
  logger.info('LoyaltyMilestoneWorker — started (midnight daily IST)');
}

module.exports = { startLoyaltyMilestoneWorker };
