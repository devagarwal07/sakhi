'use strict';

const cron = require('node-cron');
const supabase = require('../config/supabase');
const fcmService = require('../services/fcmService');
const subscriptionService = require('../services/subscriptionService');
const mapsService = require('../services/mapsService');
const logger = require('../utils/logger');

let _io = null;

// ── Time helpers ──────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Build an HH:MM string offset from now by ±minutes */
function timeOffset(offsetMinutes) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  return d.toTimeString().slice(0, 5); // "HH:MM"
}

/** Datetime for a scheduled_date + scheduled_time */
function scheduledDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

// ── CHECK 1 — 24-hour reminder ────────────────────────────────────────────────
async function check24hReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: rides, error } = await supabase
    .from('subscription_rides')
    .select(`
      id, scheduled_time, subscription_id,
      subscriptions!inner(rider_id, pickup_address),
      drivers:assigned_driver_id(name)
    `)
    .eq('status', 'scheduled')
    .eq('scheduled_date', tomorrowStr)
    .eq('reminder_sent_24h', false);

  if (error || !rides?.length) return;

  await Promise.all(rides.map(async (sr) => {
    const riderId = sr.subscriptions?.rider_id;
    const driverName = sr.drivers?.name || 'your driver';
    if (!riderId) return;

    await fcmService.sendToUser(riderId, 'rider', {
      title: 'Ride Reminder 🗓️',
      body: `Reminder: Your scheduled ride is tomorrow at ${sr.scheduled_time}. Driver: ${driverName}`,
      data: { type: 'REMINDER_24H', subscription_ride_id: sr.id },
    }).catch(() => {});

    await supabase.from('subscription_rides').update({ reminder_sent_24h: true }).eq('id', sr.id);
  }));

  if (rides.length) logger.info(`SubscriptionScheduler — 24h reminders sent: ${rides.length}`);
}

// ── CHECK 2 — 60-minute reminder ──────────────────────────────────────────────
async function check60mReminders() {
  const today = todayStr();
  const timeFrom = timeOffset(55);
  const timeTo   = timeOffset(65);

  const { data: rides } = await supabase
    .from('subscription_rides')
    .select(`
      id, scheduled_time, assigned_driver_id,
      subscriptions!inner(pickup_address)
    `)
    .eq('status', 'scheduled')
    .eq('scheduled_date', today)
    .gte('scheduled_time', timeFrom)
    .lte('scheduled_time', timeTo)
    .eq('reminder_sent_60m', false)
    .not('assigned_driver_id', 'is', null);

  if (!rides?.length) return;

  await Promise.all(rides.map(async (sr) => {
    await fcmService.sendToUser(sr.assigned_driver_id, 'driver', {
      title: 'Subscription Ride Reminder ⏰',
      body: `Pickup at ${sr.subscriptions?.pickup_address} at ${sr.scheduled_time}`,
      data: { type: 'REMINDER_60M', subscription_ride_id: sr.id },
    }).catch(() => {});

    await supabase.from('subscription_rides').update({ reminder_sent_60m: true }).eq('id', sr.id);
  }));

  if (rides.length) logger.info(`SubscriptionScheduler — 60m reminders sent: ${rides.length}`);
}

// ── CHECK 3 — Driver blocking (30 min before) ─────────────────────────────────
async function check30mDriverBlock() {
  const today = todayStr();
  const timeFrom = timeOffset(25);
  const timeTo   = timeOffset(35);

  const { data: rides } = await supabase
    .from('subscription_rides')
    .select('id, scheduled_time, assigned_driver_id')
    .eq('status', 'scheduled')
    .eq('scheduled_date', today)
    .gte('scheduled_time', timeFrom)
    .lte('scheduled_time', timeTo)
    .eq('driver_blocked', false)
    .not('assigned_driver_id', 'is', null);

  if (!rides?.length) return;

  await Promise.all(rides.map(async (sr) => {
    const scheduledDt = scheduledDateTime(today, sr.scheduled_time);
    const blockedUntil = new Date(scheduledDt.getTime() + 30 * 60_000).toISOString();
    const countdownSeconds = Math.max(0, Math.floor((scheduledDt.getTime() - Date.now()) / 1000));

    await supabase.from('driver_blocks').insert({
      driver_id:            sr.assigned_driver_id,
      blocked_until:        blockedUntil,
      subscription_ride_id: sr.id,
    });

    await supabase.from('subscription_rides').update({ driver_blocked: true }).eq('id', sr.id);

    if (_io) {
      _io.of('/rides').to(`driver:${sr.assigned_driver_id}`).emit('subscription_block_start', {
        message: `On-demand rides blocked until your subscription ride at ${sr.scheduled_time}`,
        blocked_until: blockedUntil,
        countdown_seconds: countdownSeconds,
      });
    }
  }));

  if (rides.length) logger.info(`SubscriptionScheduler — driver blocks set: ${rides.length}`);
}

// ── CHECK 4 — Auto-create rides at scheduled time ─────────────────────────────
async function checkAutoCreateRides() {
  const today = todayStr();
  const timeFrom = timeOffset(-3);
  const timeTo   = timeOffset(2);

  const { data: rides } = await supabase
    .from('subscription_rides')
    .select(`
      id, scheduled_time, assigned_driver_id, is_return,
      pickup_lat, pickup_lng, pickup_address,
      drop_lat, drop_lng, drop_address,
      subscriptions!inner(id, rider_id, per_ride_fare, driver_id)
    `)
    .eq('status', 'scheduled')
    .eq('scheduled_date', today)
    .gte('scheduled_time', timeFrom)
    .lte('scheduled_time', timeTo)
    .is('ride_id', null);

  if (!rides?.length) return;

  await Promise.all(rides.map(async (sr) => {
    try {
      const sub = sr.subscriptions;
      const driverId = sr.assigned_driver_id || sub.driver_id;

      // Get distance/duration for the ride
      let distance_km = 0, duration_min = 0;
      try {
        const dist = await mapsService.getDistanceMatrix(sr.pickup_lat, sr.pickup_lng, sr.drop_lat, sr.drop_lng);
        distance_km = dist.distance_km;
        duration_min = dist.duration_min;
      } catch { /* non-fatal */ }

      // ── Check for free ride credit (3 consecutive failures) ──────────────
      const { isFree, creditId } = await subscriptionService.consumeFreeRideCredit(sub.rider_id).catch(() => ({ isFree: false }));
      const appliedFare = isFree ? 0 : sub.per_ride_fare;

      if (isFree) {
        logger.info('SubscriptionScheduler — applying free ride credit', { riderId: sub.rider_id, creditId });
      }

      const { data: rideRows } = await supabase.from('rides').insert({
        rider_id:        sub.rider_id,
        driver_id:       driverId,
        subscription_id: sub.id,
        pickup_lat:      sr.pickup_lat,
        pickup_lng:      sr.pickup_lng,
        pickup_address:  sr.pickup_address,
        drop_lat:        sr.drop_lat,
        drop_lng:        sr.drop_lng,
        drop_address:    sr.drop_address,
        estimated_fare:  sub.per_ride_fare,
        final_fare:      appliedFare,
        is_free_ride:    isFree,
        status:          'assigned',
        payment_method:  isFree ? 'free_credit' : 'cash',
        distance_km,
        duration_min,
      }).select('id').single();

      const rideId = rideRows?.id;
      if (!rideId) return;

      await supabase.from('subscription_rides').update({ ride_id: rideId, status: 'in_progress' }).eq('id', sr.id);

      // If a free credit was used, link it to this ride for audit
      if (isFree && creditId) {
        await supabase.from('rider_free_ride_credits')
          .update({ ride_id: rideId })
          .eq('id', creditId)
          .catch(() => {});
      }

      // Successful ride — reset consecutive failure counter
      if (sr.subscription_id) {
        supabase.from('subscriptions')
          .update({ consecutive_failures: 0 })
          .eq('id', sr.subscription_id)
          .then(() => {})
          .catch(() => {});
      }

      // Socket events
      if (_io) {
        _io.of('/rides').to(`rider:${sub.rider_id}`).emit('ride_assigned', { ride_id: rideId, status: 'assigned', is_free_ride: isFree });
        if (driverId) _io.of('/rides').to(`driver:${driverId}`).emit('ride_assigned', { ride_id: rideId, status: 'assigned' });
      }

      // Fetch driver name for notification
      let driverName = 'Your driver';
      if (driverId) {
        const { data: driverRows } = await supabase.from('drivers').select('name').eq('id', driverId).limit(1);
        driverName = driverRows?.[0]?.name || driverName;
      }

      fcmService.sendToUser(sub.rider_id, 'rider', {
        title: isFree ? '🎁 FREE Ride Started!' : 'Scheduled Ride Started 🚖',
        body: isFree
          ? `${driverName} is on the way — this ride is complimentary!`
          : `${driverName} is on the way to pick you up!`,
        data: { type: 'SUBSCRIPTION_RIDE_STARTED', ride_id: rideId, is_free_ride: String(isFree) },
      }).catch(() => {});

      if (driverId) {
        fcmService.sendToUser(driverId, 'driver', {
          title: 'Subscription Ride',
          body: `Navigate to: ${sr.pickup_address}`,
          data: { type: 'SUBSCRIPTION_RIDE_STARTED', ride_id: rideId },
        }).catch(() => {});
      }

      logger.info('SubscriptionScheduler — auto-created ride', { rideId, subscriptionRideId: sr.id, isFree });
    } catch (err) {
      logger.error('SubscriptionScheduler.checkAutoCreateRides — error', { srId: sr.id, error: err.message });
    }
  }));
}

// ── CHECK 5 — Missed ride detection ──────────────────────────────────────────
async function checkMissedRides() {
  const today = todayStr();
  const cutoff = timeOffset(-5); // 5 minutes ago

  const { data: rides } = await supabase
    .from('subscription_rides')
    .select('id, subscription_id, assigned_driver_id, subscriptions!inner(rider_id)')
    .eq('status', 'scheduled')
    .eq('scheduled_date', today)
    .lt('scheduled_time', cutoff)
    .is('ride_id', null);

  if (!rides?.length) return;

  await Promise.all(rides.map(async (sr) => {
    await supabase.from('subscription_rides').update({ status: 'missed' }).eq('id', sr.id);

    const riderId = sr.subscriptions?.rider_id;
    if (riderId) {
      fcmService.sendToUser(riderId, 'rider', {
        title: 'Driver Missed Pickup',
        body: 'Your driver missed the pickup. Finding a replacement driver...',
        data: { type: 'SUBSCRIPTION_MISSED', subscription_ride_id: sr.id },
      }).catch(() => {});
    }

    // Track consecutive failure → may grant free ride at 3
    if (sr.subscription_id) {
      subscriptionService.recordSubscriptionFailure(sr.subscription_id).catch((err) =>
        logger.error('SubscriptionScheduler — recordFailure error', { srId: sr.id, error: err.message })
      );
    }

    // Trigger fallback reassignment
    subscriptionService.reassignSubscriptionRide(sr.id, _io).catch((err) =>
      logger.error('SubscriptionScheduler — reassign failed', { srId: sr.id, error: err.message })
    );
  }));

  if (rides.length) logger.info(`SubscriptionScheduler — missed rides detected: ${rides.length}`);
}

// ── CHECK 6 — No driver assigned 30 min before → notify customer ──────────────
async function checkNoDriverNotification() {
  const today = todayStr();
  const timeFrom = timeOffset(25); // window: 25–35 min from now
  const timeTo   = timeOffset(35);

  const { data: rides } = await supabase
    .from('subscription_rides')
    .select('id, subscription_id, scheduled_time, subscriptions!inner(rider_id)')
    .eq('status', 'scheduled')
    .eq('scheduled_date', today)
    .gte('scheduled_time', timeFrom)
    .lte('scheduled_time', timeTo)
    .is('assigned_driver_id', null)       // no driver assigned
    .eq('no_driver_notified', false);     // haven't notified yet

  if (!rides?.length) return;

  await Promise.all(rides.map(async (sr) => {
    const riderId = sr.subscriptions?.rider_id;
    if (!riderId) return;

    await fcmService.sendToUser(riderId, 'rider', {
      title: 'Unable to Fulfill Subscription ⚠️',
      body: 'Sorry, we were unable to fulfill your subscription. Please try booking an on-demand ride.',
      data: { type: 'SUBSCRIPTION_NO_DRIVER', subscription_ride_id: sr.id },
    }).catch(() => {});

    // Mark so we don't send duplicate notifications
    await supabase
      .from('subscription_rides')
      .update({ no_driver_notified: true, status: 'driver_not_found' })
      .eq('id', sr.id);

    // Track consecutive failure → may grant free ride at 3
    if (sr.subscription_id) {
      subscriptionService.recordSubscriptionFailure(sr.subscription_id).catch((err) =>
        logger.error('SubscriptionScheduler — recordFailure (no-driver) error', { srId: sr.id, error: err.message })
      );
    }
  }));

  if (rides.length) logger.info(`SubscriptionScheduler — no-driver notifications sent: ${rides.length}`);
}


async function cleanupExpiredBlocks() {
  const { data: expired } = await supabase
    .from('driver_blocks')
    .select('driver_id')
    .lt('blocked_until', new Date().toISOString());

  if (!expired?.length) return;

  const driverIds = [...new Set(expired.map((b) => b.driver_id))];

  await supabase.from('driver_blocks').delete().lt('blocked_until', new Date().toISOString());

  if (_io) {
    for (const driverId of driverIds) {
      _io.of('/rides').to(`driver:${driverId}`).emit('subscription_block_end', { message: 'On-demand rides unblocked.' });
    }
  }

  if (driverIds.length) logger.info(`SubscriptionScheduler — unblocked drivers: ${driverIds.length}`);
}

// ── Main poll ─────────────────────────────────────────────────────────────────
async function runSchedulerChecks() {
  try {
    await Promise.all([
      check24hReminders(),
      check60mReminders(),
      check30mDriverBlock(),
      checkAutoCreateRides(),
      checkMissedRides(),
      checkNoDriverNotification(),
      cleanupExpiredBlocks(),
    ]);
  } catch (err) {
    logger.error('SubscriptionRideScheduler — unhandled error', { error: err.message });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Start the scheduler
// ──────────────────────────────────────────────────────────────────────────────
function startScheduler(io) {
  _io = io;

  // Every 5 minutes
  cron.schedule('*/5 * * * *', runSchedulerChecks, { timezone: 'Asia/Kolkata' });

  logger.info('SubscriptionRideScheduler — started (every 5 minutes, IST)');
}

module.exports = { startScheduler };
