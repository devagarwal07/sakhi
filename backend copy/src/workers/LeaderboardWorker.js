'use strict';

const cron = require('node-cron');
const supabase  = require('../config/supabase');
const fcmService = require('../services/fcmService');
const payoutService = require('../services/payoutService');
const logger    = require('../utils/logger');

// ── Constants ────────────────────────────────────────────────────────────────
// Weekly incentive payouts for Top 3 drivers (in ₹)
const WEEKLY_PAYOUTS = { 1: 500, 2: 300, 3: 150 };

const BADGE_MAP = { 1: 'weekly_top1', 2: 'weekly_top2', 3: 'weekly_top3' };

// ── Compute current ISO week label e.g. '2026-W13' ────────────────────────
function getWeekLabel(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wn = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wn).padStart(2, '0')}`;
}

function getPreviousWeekLabel() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getWeekLabel(d);
}

function getWeekDateRange(weekLabel) {
  // Returns { start, end } as ISO strings for the given week label
  const [year, week] = weekLabel.split('-W').map(Number);
  // Find Monday of that ISO week
  const jan4 = new Date(year, 0, 4);
  const isoWk1Mon = new Date(jan4);
  isoWk1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const startDate = new Date(isoWk1Mon);
  startDate.setDate(isoWk1Mon.getDate() + (week - 1) * 7);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

// ── Main leaderboard computation for a given week ────────────────────────────
async function buildLeaderboard(weekLabel) {
  logger.info('LeaderboardWorker.buildLeaderboard — start', { weekLabel });

  const { start, end } = getWeekDateRange(weekLabel);

  // 1. Aggregate rides for that week
  const { data: rideSummaries, error } = await supabase
    .from('rides')
    .select('driver_id, rider_rating')
    .eq('status', 'completed')
    .gte('completed_at', start)
    .lte('completed_at', end)
    .not('driver_id', 'is', null);

  if (error) {
    logger.error('LeaderboardWorker — DB error fetching rides', { error });
    return;
  }

  if (!rideSummaries?.length) {
    logger.info('LeaderboardWorker — no rides found for week', { weekLabel });
    return;
  }

  // 2. Group by driver
  const driverMap = {};
  for (const r of rideSummaries) {
    if (!driverMap[r.driver_id]) {
      driverMap[r.driver_id] = { rides_count: 0, rating_sum: 0, rating_count: 0 };
    }
    driverMap[r.driver_id].rides_count++;
    if (r.rider_rating) {
      driverMap[r.driver_id].rating_sum += r.rider_rating;
      driverMap[r.driver_id].rating_count++;
    }
  }

  // 3. Fetch acceptance rates for these drivers
  const driverIds = Object.keys(driverMap);
  const { data: driverStats } = await supabase
    .from('drivers')
    .select('id, acceptance_rate')
    .in('id', driverIds);

  const rarMap = {};
  for (const d of (driverStats || [])) rarMap[d.id] = parseFloat(d.acceptance_rate || 1.0);

  // 4. Compute composite score  =  rides*0.5 + avg_rating*0.3 + acceptance_rate*0.2  (normalised)
  const scored = driverIds.map((dId) => {
    const { rides_count, rating_sum, rating_count } = driverMap[dId];
    const avg_rating = rating_count > 0 ? parseFloat((rating_sum / rating_count).toFixed(2)) : 5.0;
    const rar = rarMap[dId] ?? 1.0;
    const composite_score = parseFloat(
      (rides_count * 0.5 + avg_rating * 0.3 + rar * 0.2).toFixed(4)
    );
    return { driver_id: dId, rides_count, avg_rating, acceptance_rate: rar, composite_score };
  });

  // 5. Rank descending
  scored.sort((a, b) => b.composite_score - a.composite_score);

  // 6. Upsert leaderboard rows
  const rows = scored.map((s, idx) => ({
    week_label:          weekLabel,
    driver_id:           s.driver_id,
    rank:                idx + 1,
    rides_count:         s.rides_count,
    avg_rating_snap:     s.avg_rating,
    acceptance_rate_snap: s.acceptance_rate,
    composite_score:     s.composite_score,
    payout_amount:       WEEKLY_PAYOUTS[idx + 1] || 0,
  }));

  await supabase
    .from('weekly_leaderboard')
    .upsert(rows, { onConflict: 'week_label,driver_id' });

  logger.info('LeaderboardWorker — leaderboard built', { weekLabel, total: scored.length });

  // 7. Reward Top 3
  for (let rank = 1; rank <= 3; rank++) {
    const entry = scored[rank - 1];
    if (!entry) continue;

    const payout = WEEKLY_PAYOUTS[rank];
    const badge  = BADGE_MAP[rank];

    // Award badge (idempotent)
    const { count: existingBadge } = await supabase
      .from('driver_badges')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', entry.driver_id)
      .eq('badge_type', badge)
      .eq('week_label', weekLabel);

    if ((existingBadge || 0) === 0) {
      await supabase.from('driver_badges').insert({
        driver_id:   entry.driver_id,
        badge_type:  badge,
        week_label:  weekLabel,
        description: `Ranked #${rank} on the Sakhi weekly leaderboard (${weekLabel})`,
      });
    }

    // Initiate payout
    const txResult = await payoutService.initiatePayout({
      driverId:  entry.driver_id,
      amountInr: payout,
      type:      'weekly_incentive',
      narration: `Sakhi Weekly Top${rank} - ${weekLabel}`,
    }).catch((err) => {
      logger.error('LeaderboardWorker — payout failed', { rank, driver: entry.driver_id, error: err.message });
      return null;
    });

    // FCM notification
    fcmService.sendToUser(entry.driver_id, 'driver', {
      title: `🏆 Weekly Leaderboard - Rank #${rank}!`,
      body:  `Congratulations! You ranked #${rank} this week. ₹${payout} has been initiated to your account!`,
      data:  {
        type:        'WEEKLY_RANK',
        rank:        String(rank),
        week_label:  weekLabel,
        payout:      String(payout),
        badge:       badge,
      },
    }).catch(() => {});

    // Mark payout done in leaderboard
    if (txResult) {
      await supabase
        .from('weekly_leaderboard')
        .update({ payout_done: true })
        .eq('week_label', weekLabel)
        .eq('driver_id', entry.driver_id);
    }

    logger.info('LeaderboardWorker — rank rewarded', { rank, driverId: entry.driver_id, payout });
  }

  logger.info('LeaderboardWorker.buildLeaderboard — done', { weekLabel });
}

// ── Cron entry point ─────────────────────────────────────────────────────────
async function runWeeklyLeaderboard() {
  const weekLabel = getPreviousWeekLabel(); // Run on Monday for the completed week
  await buildLeaderboard(weekLabel);
}

function startLeaderboardWorker() {
  // Every Monday at 01:30 IST — compute last week's results
  cron.schedule('30 1 * * 1', runWeeklyLeaderboard, { timezone: 'Asia/Kolkata' });
  logger.info('LeaderboardWorker — started (Mondays 01:30 IST)');
}

module.exports = { startLeaderboardWorker, buildLeaderboard, getWeekLabel };
