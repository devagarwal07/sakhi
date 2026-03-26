'use strict';

const supabase = require('../config/supabase');
const fareService = require('./fareService');
const fcmService = require('./fcmService');
const mapsService = require('./mapsService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── Haversine (meters) ──────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Parse HH:MM → { hours, minutes } ────────────────────────────────────────
function parseTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return { hours: h, minutes: m };
}

// ──────────────────────────────────────────────────────────────────────────────
// findSubscriptionDriver
// ──────────────────────────────────────────────────────────────────────────────
async function findSubscriptionDriver(pickupLat, pickupLng, pickupTime, daysOfWeek) {
  const { data: candidates } = await supabase
    .from('drivers')
    .select('id, name, driver_locations(lat, lng)')
    .eq('subscription_opt_in', true)
    .eq('is_active', true)
    .eq('gender_verified', true)
    .eq('verification_status', 'approved')
    .eq('kyc_status', 'verified');

  if (!candidates?.length) return null;

  // Get drivers already assigned to conflicting subscription slots
  const { data: conflicts } = await supabase
    .from('subscriptions')
    .select('driver_id, days_of_week, pickup_time')
    .eq('status', 'active')
    .not('driver_id', 'is', null);

  const conflictSet = new Set();
  for (const sub of conflicts || []) {
    const subDays = sub.days_of_week || [];
    const hasOverlap = (daysOfWeek || []).some((d) => subDays.includes(d));
    if (hasOverlap && sub.pickup_time === pickupTime) {
      conflictSet.add(sub.driver_id);
    }
  }

  // Filter and rank by proximity (≤ 5km)
  const ranked = candidates
    .filter((d) => !conflictSet.has(d.id))
    .map((d) => {
      const loc = Array.isArray(d.driver_locations) ? d.driver_locations[0] : d.driver_locations;
      if (!loc) return null;
      const dist = haversine(pickupLat, pickupLng, loc.lat, loc.lng);
      return { ...d, distance_m: dist };
    })
    .filter(Boolean)
    .filter((d) => d.distance_m <= 5000)
    .sort((a, b) => a.distance_m - b.distance_m);

  return ranked[0] || null;
}

// ──────────────────────────────────────────────────────────────────────────────
// generateSubscriptionRides
// ──────────────────────────────────────────────────────────────────────────────
async function generateSubscriptionRides(subscriptionId, payload, driverId) {
  const {
    start_date,
    pickup_time,
    return_pickup_time,
    days_of_week,
    plan_rides,
    is_two_way,
    pickup_lat, pickup_lng, pickup_address,
    drop_lat, drop_lng, drop_address,
  } = payload;

  const rows = [];
  const current = new Date(start_date);
  current.setHours(0, 0, 0, 0);

  let rideCount = 0;
  let lastDate = null;

  // Max iterations to prevent infinite loop (100 weeks)
  const maxIterations = 700;
  let iterations = 0;

  while (rideCount < plan_rides && iterations < maxIterations) {
    iterations++;
    const dow = current.getDay();

    if ((days_of_week || []).includes(dow)) {
      const dateStr = current.toISOString().slice(0, 10);

      rows.push({
        subscription_id:    subscriptionId,
        scheduled_date:     dateStr,
        scheduled_time:     pickup_time,
        is_return:          false,
        status:             'scheduled',
        assigned_driver_id: driverId || null,
        pickup_lat, pickup_lng, pickup_address,
        drop_lat, drop_lng, drop_address,
      });

      if (is_two_way && return_pickup_time) {
        rows.push({
          subscription_id:    subscriptionId,
          scheduled_date:     dateStr,
          scheduled_time:     return_pickup_time,
          is_return:          true,
          status:             'scheduled',
          assigned_driver_id: driverId || null,
          pickup_lat: drop_lat, pickup_lng: drop_lng, pickup_address: drop_address,
          drop_lat: pickup_lat, drop_lng: pickup_lng, drop_address: pickup_address,
        });
      }

      rideCount++;
      lastDate = dateStr;
    }

    current.setDate(current.getDate() + 1);
  }

  // Batch insert
  if (rows.length) {
    const { error } = await supabase.from('subscription_rides').insert(rows);
    if (error) logger.error('subscriptionService.generateSubscriptionRides — insert error', { error });
  }

  // Update subscription with end_date and rides_remaining
  if (lastDate) {
    await supabase.from('subscriptions').update({
      end_date: lastDate,
      rides_remaining: plan_rides,
    }).eq('id', subscriptionId);
  }

  return { count: rows.length, end_date: lastDate };
}

// ──────────────────────────────────────────────────────────────────────────────
// createSubscription
// ──────────────────────────────────────────────────────────────────────────────
async function createSubscription(riderId, payload, paymentId) {
  // 1. Verify rider
  const { data: riders } = await supabase
    .from('users')
    .select('id, gender_verified, verification_status, is_active')
    .eq('id', riderId)
    .limit(1);

  const rider = riders?.[0];
  if (!rider || !rider.gender_verified || rider.verification_status !== 'approved' || !rider.is_active) {
    throw new AppError('Complete identity verification to create subscriptions.', 403, 'VERIFICATION_REQUIRED');
  }

  // 1b. ITEM 12 — Overlap validation: no existing active subscription on same days+time
  const { data: existingSubs } = await supabase
    .from('subscriptions')
    .select('id, days_of_week, pickup_time')
    .eq('rider_id', riderId)
    .in('status', ['active', 'paused']);

  for (const existing of existingSubs || []) {
    const dayOverlap = (payload.days_of_week || []).some((d) => (existing.days_of_week || []).includes(d));
    if (dayOverlap && existing.pickup_time === payload.pickup_time) {
      throw new AppError(
        'You already have an active subscription that overlaps with this schedule.',
        422,
        'SUBSCRIPTION_OVERLAP'
      );
    }
  }

  // 2. Calculate fare
  const { distance_km, duration_min } = await mapsService.getDistanceMatrix(
    payload.pickup_lat, payload.pickup_lng, payload.drop_lat, payload.drop_lng
  );
  const fareConfig = await fareService.getFareConfig('auto');
  const { estimated_fare: per_ride_fare } = fareService.calculateFare(distance_km, duration_min, fareConfig);

  // 3. Total cost
  const multiplier = payload.is_two_way ? 2 : 1;
  const total_cost = parseFloat((per_ride_fare * payload.plan_rides * multiplier).toFixed(2));

  // 4. INSERT subscription
  const { data: subRows, error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      rider_id:           riderId,
      pickup_lat:         payload.pickup_lat,
      pickup_lng:         payload.pickup_lng,
      pickup_address:     payload.pickup_address,
      drop_lat:           payload.drop_lat,
      drop_lng:           payload.drop_lng,
      drop_address:       payload.drop_address,
      pickup_time:        payload.pickup_time,
      return_pickup_time: payload.return_pickup_time || null,
      start_date:         payload.start_date,
      plan_rides:         payload.plan_rides,
      days_of_week:       payload.days_of_week,
      is_two_way:         payload.is_two_way || false,
      per_ride_fare,
      total_cost,
      payment_id:         paymentId,
      status:             'active',
      rides_completed:    0,
    })
    .select('*')
    .single();

  if (subErr) {
    logger.error('subscriptionService.createSubscription — insert error', { error: subErr });
    throw new AppError('Failed to create subscription.', 500, 'SUBSCRIPTION_CREATE_FAILED');
  }

  const sub = subRows;

  // 5. Find subscription driver
  const driver = await findSubscriptionDriver(
    payload.pickup_lat,
    payload.pickup_lng,
    payload.pickup_time,
    payload.days_of_week
  );

  // 6. Assign driver
  if (driver) {
    await supabase.from('subscriptions').update({ driver_id: driver.id }).eq('id', sub.id);
    sub.driver_id = driver.id;
  }

  // 7. Generate ride rows
  await generateSubscriptionRides(sub.id, payload, driver?.id);

  // 8. Notify driver
  if (driver) {
    fcmService.sendToUser(driver.id, 'driver', {
      title: 'New Subscription Route 🗓️',
      body: `You have been assigned a new subscription route. Pickup at ${payload.pickup_address}.`,
      data: { type: 'SUBSCRIPTION_ASSIGNED', subscription_id: sub.id },
    }).catch(() => {});
  }

  logger.info('subscriptionService.createSubscription — created', { subId: sub.id, riderId, driverId: driver?.id });

  return {
    subscription: sub,
    driver_info: driver ? { id: driver.id, name: driver.name } : null,
    per_ride_fare,
    total_cost,
    distance_km,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// pauseSubscription
// ──────────────────────────────────────────────────────────────────────────────
async function pauseSubscription(riderId, subscriptionId) {
  const sub = await getOwnedSubscription(riderId, subscriptionId, ['active']);

  await supabase.from('subscriptions').update({ status: 'paused' }).eq('id', subscriptionId);

  // Mark all future subscription_rides as 'missed' (from tomorrow onward)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  await supabase.from('subscription_rides')
    .update({ status: 'missed' })
    .eq('subscription_id', subscriptionId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', tomorrowStr);

  return { status: 'paused' };
}

// ──────────────────────────────────────────────────────────────────────────────
// resumeSubscription
// ──────────────────────────────────────────────────────────────────────────────
async function resumeSubscription(riderId, subscriptionId) {
  const sub = await getOwnedSubscription(riderId, subscriptionId, ['paused']);

  await supabase.from('subscriptions').update({ status: 'active' }).eq('id', subscriptionId);

  // How many rides remain?
  const { data: remaining } = await supabase
    .from('subscription_rides')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'scheduled');

  const remainingCount = remaining?.length || 0;
  const ridesNeeded = (sub.rides_remaining || 0) - remainingCount;

  // Regenerate missed rides from today onward
  if (ridesNeeded > 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    await generateSubscriptionRides(subscriptionId, {
      ...sub,
      start_date: todayStr,
      plan_rides: ridesNeeded,
    }, sub.driver_id);
  }

  return { status: 'active' };
}

// ──────────────────────────────────────────────────────────────────────────────
// cancelSubscription
// ──────────────────────────────────────────────────────────────────────────────
async function cancelSubscription(riderId, subscriptionId) {
  const sub = await getOwnedSubscription(riderId, subscriptionId, ['active', 'paused']);

  // Block if within 7 days of start_date
  const startDate = new Date(sub.start_date);
  const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceStart < 7) {
    throw new AppError(
      'Subscriptions cannot be cancelled within 7 days of the start date.',
      422,
      'CANCEL_WINDOW_TOO_EARLY'
    );
  }

  await supabase.from('subscriptions').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('id', subscriptionId);

  // Cancel remaining scheduled rides
  await supabase.from('subscription_rides')
    .update({ status: 'cancelled' })
    .eq('subscription_id', subscriptionId)
    .eq('status', 'scheduled');

  // TODO: Prorate refund — log for manual processing
  logger.info('subscriptionService.cancelSubscription — manual refund needed', {
    subscriptionId,
    rides_remaining: sub.rides_remaining,
    per_ride_fare: sub.per_ride_fare,
  });

  return { status: 'cancelled' };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
async function getOwnedSubscription(riderId, subscriptionId, allowedStatuses = []) {
  const { data: rows } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .eq('rider_id', riderId)
    .limit(1);

  const sub = rows?.[0];
  if (!sub) throw new AppError('Subscription not found.', 404, 'SUBSCRIPTION_NOT_FOUND');

  if (allowedStatuses.length && !allowedStatuses.includes(sub.status)) {
    throw new AppError(
      `Cannot perform this action when subscription is '${sub.status}'.`,
      409,
      'INVALID_SUBSCRIPTION_STATUS'
    );
  }
  return sub;
}

// ──────────────────────────────────────────────────────────────────────────────
// reassignSubscriptionRide (fallback on missed pickup)
// ──────────────────────────────────────────────────────────────────────────────
async function reassignSubscriptionRide(subscriptionRideId, io) {
  const { data: srRows } = await supabase
    .from('subscription_rides')
    .select('*, subscriptions!inner(*)')
    .eq('id', subscriptionRideId)
    .limit(1);

  const sr = srRows?.[0];
  if (!sr) return;

  const sub = sr.subscriptions;
  const missedDriverId = sr.assigned_driver_id;

  // Find a replacement driver, excluding the one who missed
  const { data: candidates } = await supabase
    .from('drivers')
    .select('id, name, fcm_token, driver_locations(lat, lng)')
    .eq('subscription_opt_in', true)
    .eq('is_active', true)
    .eq('gender_verified', true)
    .eq('verification_status', 'approved')
    .eq('kyc_status', 'verified')
    .neq('id', missedDriverId);

  // Filter by proximity (5km), no time conflicts
  const { data: conflicts } = await supabase
    .from('subscriptions')
    .select('driver_id, days_of_week, pickup_time')
    .eq('status', 'active')
    .not('driver_id', 'is', null);

  const conflictSet = new Set();
  for (const c of conflicts || []) {
    const hasOverlap = (sub.days_of_week || []).some((d) => (c.days_of_week || []).includes(d));
    if (hasOverlap && c.pickup_time === sub.pickup_time) conflictSet.add(c.driver_id);
  }

  const ranked = (candidates || [])
    .filter((d) => !conflictSet.has(d.id))
    .map((d) => {
      const loc = Array.isArray(d.driver_locations) ? d.driver_locations[0] : d.driver_locations;
      if (!loc) return null;
      const dist = haversine(sub.pickup_lat, sub.pickup_lng, loc.lat, loc.lng);
      return { ...d, distance_m: dist };
    })
    .filter(Boolean)
    .filter((d) => d.distance_m <= 5000)
    .sort((a, b) => a.distance_m - b.distance_m);

  const fallback = ranked[0] || null;

  if (!fallback) {
    logger.warn('subscriptionService.reassignSubscriptionRide — no fallback driver found', { subscriptionRideId });
    fcmService.sendToUser(sub.rider_id, 'rider', {
      title: 'No Driver Available',
      body: 'We could not find a replacement driver for your scheduled ride. Please contact support.',
      data: { type: 'SUBSCRIPTION_NO_DRIVER', subscription_ride_id: subscriptionRideId },
    }).catch(() => {});
    return;
  }

  // Update this ride + all future rides for this subscription
  const todayStr = new Date().toISOString().slice(0, 10);
  await Promise.all([
    supabase.from('subscription_rides').update({ assigned_driver_id: fallback.id, status: 'reassigned' }).eq('id', subscriptionRideId),
    supabase.from('subscription_rides')
      .update({ assigned_driver_id: fallback.id })
      .eq('subscription_id', sub.id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', todayStr),
    supabase.from('subscriptions').update({ driver_id: fallback.id }).eq('id', sub.id),
  ]);

  // Immediately create a ride with the fallback driver
  let distance_km = 0, duration_min = 0;
  try {
    const dist = await mapsService.getDistanceMatrix(sub.pickup_lat, sub.pickup_lng, sub.drop_lat, sub.drop_lng);
    distance_km = dist.distance_km;
    duration_min = dist.duration_min;
  } catch { /* non-fatal */ }

  const { data: rideRows } = await supabase.from('rides').insert({
    rider_id:        sub.rider_id,
    driver_id:       fallback.id,
    subscription_id: sub.id,
    pickup_lat:      sub.pickup_lat,
    pickup_lng:      sub.pickup_lng,
    pickup_address:  sub.pickup_address,
    drop_lat:        sub.drop_lat,
    drop_lng:        sub.drop_lng,
    drop_address:    sub.drop_address,
    estimated_fare:  sub.per_ride_fare,
    status:          'assigned',
    payment_method:  'cash',
    distance_km,
    duration_min,
  }).select('id').single();

  if (rideRows?.id) {
    await supabase.from('subscription_rides').update({ ride_id: rideRows.id }).eq('id', subscriptionRideId);

    if (io) {
      io.of('/rides').to(`rider:${sub.rider_id}`).emit('ride_assigned', { ride_id: rideRows.id, status: 'assigned' });
      io.of('/rides').to(`driver:${fallback.id}`).emit('ride_assigned', { ride_id: rideRows.id, status: 'assigned' });
    }
  }

  fcmService.sendToUser(sub.rider_id, 'rider', {
    title: 'New Driver Found 🚖',
    body: `${fallback.name} is on the way to pick you up!`,
    data: { type: 'SUBSCRIPTION_REASSIGNED', ride_id: rideRows?.id },
  }).catch(() => {});

  logger.info('subscriptionService.reassignSubscriptionRide — reassigned', {
    subscriptionRideId,
    newDriverId: fallback.id,
    rideId: rideRows?.id,
  });
}

module.exports = {
  createSubscription,
  generateSubscriptionRides,
  findSubscriptionDriver,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  reassignSubscriptionRide,
};

