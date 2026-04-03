'use strict';

const cron = require('node-cron');
const supabase   = require('../config/supabase');
const fcmService = require('../services/fcmService');
const logger     = require('../utils/logger');

// ── Tier thresholds (combined active_days over current + previous month) ──────
const TIERS = [
  { tier: 'elite',    minDays: 40, badge: 'elite_unlock'  },
  { tier: 'gold',     minDays: 26, badge: 'gold_unlock'   },
  { tier: 'silver',   minDays: 13, badge: 'silver_unlock' },
  { tier: 'standard', minDays:  0, badge: null             },
];

const TIER_LABELS = {
  elite:    '👑 Elite',
  gold:     '🥇 Gold',
  silver:   '🥈 Silver',
  standard: 'Standard',
};

async function runLoyaltyTierCheck() {
  const now          = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prevDate     = new Date(now);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth    = prevDate.toISOString().slice(0, 7);

  logger.info('LoyaltyTierWorker — running', { currentMonth, prevMonth });

  try {
    // 1. Fetch all distinct driver IDs with milestones in these 2 months
    const { data: milestones } = await supabase
      .from('loyalty_milestones')
      .select('driver_id, active_days')
      .in('month', [currentMonth, prevMonth]);

    if (!milestones?.length) {
      logger.info('LoyaltyTierWorker — no milestones found, skipping');
      return;
    }

    // 2. Aggregate per driver
    const driverDays = {};
    for (const m of milestones) {
      driverDays[m.driver_id] = (driverDays[m.driver_id] || 0) + m.active_days;
    }

    // 3. Fetch current tiers for these drivers
    const driverIds = Object.keys(driverDays);
    const { data: driverRows } = await supabase
      .from('drivers')
      .select('id, loyalty_tier, name')
      .in('id', driverIds);

    const currentTierMap = {};
    const nameMap = {};
    for (const d of (driverRows || [])) {
      currentTierMap[d.id] = d.loyalty_tier || 'standard';
      nameMap[d.id] = d.name || 'Driver';
    }

    // 4. Compute new tier + apply upgrades
    await Promise.all(driverIds.map(async (driverId) => {
      const totalDays = driverDays[driverId];
      const newTier   = TIERS.find((t) => totalDays >= t.minDays)?.tier || 'standard';
      const oldTier   = currentTierMap[driverId] || 'standard';

      // Only update if changed
      if (newTier === oldTier) return;

      await supabase.from('drivers').update({ loyalty_tier: newTier }).eq('id', driverId);

      // Award badge if upgrading (not downgrading through inactivity)
      const tierRank = { standard: 0, silver: 1, gold: 2, elite: 3 };
      const isUpgrade = tierRank[newTier] > tierRank[oldTier];
      const badgeType = TIERS.find((t) => t.tier === newTier)?.badge;

      if (isUpgrade && badgeType) {
        // Idempotent badge award
        const { count } = await supabase
          .from('driver_badges')
          .select('id', { count: 'exact', head: true })
          .eq('driver_id', driverId)
          .eq('badge_type', badgeType);

        if ((count || 0) === 0) {
          await supabase.from('driver_badges').insert({
            driver_id:   driverId,
            badge_type:  badgeType,
            description: `Achieved ${TIER_LABELS[newTier]} loyalty tier`,
          });
        }

        // FCM
        fcmService.sendToUser(driverId, 'driver', {
          title: `${TIER_LABELS[newTier]} Tier Unlocked! 🎉`,
          body:  `You've been upgraded to ${TIER_LABELS[newTier]} tier based on your consistency! Keep it up!`,
          data:  {
            type:      'TIER_UPGRADE',
            old_tier:  oldTier,
            new_tier:  newTier,
            badge:     badgeType,
          },
        }).catch(() => {});

        // Notifications log
        await supabase.from('notifications_log').insert({
          user_id: driverId,
          type:    'TIER_UPGRADE',
          title:   `${TIER_LABELS[newTier]} Tier Unlocked!`,
          body:    `Congratulations ${nameMap[driverId]}! You've reached ${TIER_LABELS[newTier]} loyalty tier.`,
          read:    false,
        }).catch(() => {});

        logger.info('LoyaltyTierWorker — tier upgraded', { driverId, oldTier, newTier, totalDays });
      } else if (!isUpgrade) {
        // Tier downgrade (inactivity) — update silently
        logger.info('LoyaltyTierWorker — tier adjusted down', { driverId, oldTier, newTier, totalDays });
      }
    }));

    logger.info('LoyaltyTierWorker — done', { processed: driverIds.length });
  } catch (err) {
    logger.error('LoyaltyTierWorker — error', { error: err.message });
  }
}

function startLoyaltyTierWorker() {
  // Daily at 02:00 IST
  cron.schedule('0 2 * * *', runLoyaltyTierCheck, { timezone: 'Asia/Kolkata' });
  logger.info('LoyaltyTierWorker — started (daily 02:00 IST)');
}

module.exports = { startLoyaltyTierWorker };
