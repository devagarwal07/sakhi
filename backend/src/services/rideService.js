'use strict';

const fareService = require('./fareService');
const fcmService = require('./fcmService');
const waitingTimerService = require('./waitingTimerService');
const matchingEngine = require('./matchingEngine');
const smsService  = require('./smsService');
const payoutService = require('./payoutService');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const referralService = require('./referralService');

// Lazy-load anomalyService to avoid circular deps
const getAnomalyService = () => require('./anomalyService');

// ── State machine ─────────────────────────────────────────────────────────────
// Maps new_status → required current_status (driver-driven transitions only)
const VALID_TRANSITIONS = {
  driver_en_route: 'assigned',
  arrived:         'driver_en_route',
  in_progress:     'arrived',
  completed:       'in_progress',
};

// ──────────────────────────────────────────────────────────────────────────────
// updateRideStatus
// ──────────────────────────────────────────────────────────────────────────────
async function updateRideStatus(rideId, newStatus, driverId, body, io) {
  // Fetch current ride
  const { data: rides, error: fetchErr } = await supabase
    .from('rides')
    .select(`
      *,
      drivers(name, fcm_token),
      users!rides_rider_id_fkey(id, name, phone)
    `)
    .eq('id', rideId)
    .limit(1);

  if (fetchErr || !rides?.length) {
    throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
  }

  const ride = rides[0];
  const expectedStatus = VALID_TRANSITIONS[newStatus];

  if (!expectedStatus) {
    throw new AppError(`Status '${newStatus}' cannot be set via this endpoint.`, 403, 'TRANSITION_NOT_ALLOWED');
  }

  if (ride.driver_id !== driverId) {
    throw new AppError('You are not the driver of this ride.', 403, 'FORBIDDEN');
  }

  // Optimistic status check
  if (ride.status !== expectedStatus) {
    throw new AppError(
      `Cannot transition to '${newStatus}' from '${ride.status}'.`,
      409,
      'INVALID_STATUS_TRANSITION',
      { current_status: ride.status }
    );
  }

  const emitter = require('../socket/emitter');
  const riderId = ride.rider_id;
  const driverName = ride.drivers?.name || 'Your driver';

  // ── Transition handlers ────────────────────────────────────────────────────

  if (newStatus === 'driver_en_route') {
    await supabase.from('rides').update({ status: 'driver_en_route' }).eq('id', rideId);

    fcmService.sendToUser(riderId, 'rider', {
      title: 'Driver On The Way 🚗',
      body: `${driverName} is on the way! ETA: ~${ride.duration_min ? Math.round(ride.duration_min) : '?'} min`,
      data: { type: 'DRIVER_ARRIVING', ride_id: rideId },
    }).catch(() => {});

    emitter.emitToRide(io, rideId, 'ride:status_update', { status: 'driver_en_route', timestamp: new Date().toISOString() });
  }

  else if (newStatus === 'arrived') {
    const waitingStartAt = new Date().toISOString();
    await supabase.from('rides').update({ status: 'arrived', waiting_start_at: waitingStartAt }).eq('id', rideId);

    fcmService.sendToUser(riderId, 'rider', {
      title: 'Driver Arrived 📍',
      body: 'Your driver has arrived at the pickup point.',
      data: { type: 'DRIVER_ARRIVED', ride_id: rideId },
    }).catch(() => {});

    emitter.emitToRide(io, rideId, 'ride:status_update', { status: 'arrived', timestamp: waitingStartAt });

    // Start waiting tick every 30s
    waitingTimerService.startWaitingTimer(rideId, waitingStartAt, io);
  }

  else if (newStatus === 'in_progress') {
    // Stop waiting timer
    waitingTimerService.stopWaitingTimer(rideId);

    const fareConfig = await fareService.getFareConfig('auto');
    const { waiting_seconds, waiting_charge } = fareService.calculateWaitingCharge(ride.waiting_start_at, fareConfig);
    const updatedFare = parseFloat((parseFloat(ride.estimated_fare || 0) + waiting_charge).toFixed(2));

    await supabase.from('rides').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      waiting_seconds,
      waiting_charge,
      estimated_fare: updatedFare,
    }).eq('id', rideId);

    fcmService.sendToUser(riderId, 'rider', {
      title: 'Trip Started! 🎉',
      body: 'Your trip has started. Sit back and relax.',
      data: { type: 'TRIP_STARTED', ride_id: rideId },
    }).catch(() => {});

    emitter.emitToRide(io, rideId, 'ride:status_update', {
      status: 'in_progress',
      waiting_charge,
      estimated_fare: updatedFare,
      timestamp: new Date().toISOString(),
    });

    // Start anomaly detection
    getAnomalyService().startMonitoring(rideId);
  }

  else if (newStatus === 'completed') {
    const paymentCollected = body?.payment_collected !== false; // default true

    const fareConfig = await fareService.getFareConfig('auto');
    const waitingCharge = parseFloat(ride.waiting_charge || 0);
    const finalFare = parseFloat((parseFloat(ride.estimated_fare || 0)).toFixed(2));

    // 1. Update ride
    const { error: completeErr } = await supabase.from('rides').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      payment_collected: paymentCollected,
      final_fare: finalFare,
    }).eq('id', rideId);

    if (completeErr) throw new AppError('Failed to complete ride.', 500, 'RIDE_COMPLETE_FAILED');

    // 2. Stop anomaly monitoring
    getAnomalyService().stopMonitoring(rideId);

    // 3. Driver earnings
    const gross = finalFare;
    const commission = parseFloat((gross * fareConfig.commission_rate).toFixed(2));
    const net = parseFloat((gross - commission).toFixed(2));
    const today = new Date().toISOString().slice(0, 10);

    await Promise.all([
      supabase.from('driver_earnings').insert({
        driver_id: driverId,
        ride_id: rideId,
        gross,
        commission,
        net,
      }),
      // Upsert commission ledger
      supabase.rpc('upsert_commission_ledger', {
        p_driver_id: driverId,
        p_date: today,
        p_amount: commission,
      }).catch(() =>
        // Fallback if RPC not defined — direct upsert
        supabase.from('commission_ledger').upsert({
          driver_id: driverId,
          date: today,
          active_day: true,
          amount: commission,
          type: 'cash',
          paid: false,
        }, { onConflict: 'driver_id,date' })
      ),
    ]);

    // 4. Loyalty milestone — increment active_days for current month
    const month = today.slice(0, 7); // YYYY-MM
    await supabase.from('loyalty_milestones').upsert({
      driver_id: driverId,
      month,
      active_days: 1,
    }, { onConflict: 'driver_id,month' });
    // Increment (upsert only sets to 1 on conflict if we don't use rpc — just increment separately)
    await supabase.rpc('increment_loyalty_active_days', { p_driver_id: driverId, p_month: month })
      .catch(() => {}); // Non-fatal if RPC not yet created

    // 5. Subscription ride update
    if (ride.subscription_id) {
      const { data: subRides } = await supabase
        .from('subscription_rides')
        .select('id')
        .eq('ride_id', rideId)
        .limit(1);

      if (subRides?.length) {
        await supabase.from('subscription_rides').update({ status: 'completed' }).eq('id', subRides[0].id);
      }

      await supabase.from('subscriptions').update({
        rides_completed: supabase.rpc ? undefined : undefined, // handled below
      }).eq('id', ride.subscription_id);

      await supabase.rpc('increment_subscription_rides', { p_sub_id: ride.subscription_id }).catch(async () => {
        // Fallback
        const { data: sub } = await supabase.from('subscriptions').select('rides_completed, rides_remaining').eq('id', ride.subscription_id).single();
        if (sub) {
          await supabase.from('subscriptions').update({
            rides_completed: (sub.rides_completed || 0) + 1,
            rides_remaining: Math.max(0, (sub.rides_remaining || 0) - 1),
          }).eq('id', ride.subscription_id);
        }
      });
    }

    // 6. FCM to rider
    fcmService.sendToUser(riderId, 'rider', {
      title: 'Trip Completed! ⭐',
      body: `Fare: ₹${finalFare}. Rate your driver!`,
      data: { type: 'TRIP_COMPLETED', ride_id: rideId, final_fare: String(finalFare) },
    }).catch(() => {});

    // 7. Socket
    emitter.emitToRide(io, rideId, 'ride:status_update', {
      status: 'completed',
      final_fare: finalFare,
      payment_collected: paymentCollected,
      timestamp: new Date().toISOString(),
    });

    // 8. Driver referral programme — non-blocking check
    setImmediate(() => referralService.checkDriverReferral(driverId));

    logger.info('rideService.updateRideStatus — completed', { rideId, driverId, finalFare, commission });

    return {
      ride_id: rideId,
      status: 'completed',
      final_fare: finalFare,
      waiting_charge: waitingCharge,
      breakdown: { fare: parseFloat(ride.estimated_fare || 0), waiting_charge: waitingCharge, commission, net },
    };
  }

  return { ride_id: rideId, status: newStatus };
}

// ──────────────────────────────────────────────────────────────────────────────
// cancelRide
// ──────────────────────────────────────────────────────────────────────────────
async function cancelRide(rideId, userId, role, reason, io) {
  const { data: rides } = await supabase
    .from('rides')
    .select('id, rider_id, driver_id, status, subscription_id')
    .eq('id', rideId)
    .limit(1);

  const ride = rides?.[0];
  if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

  // 1. Verify caller is rider or driver on this ride
  if (role === 'rider' && ride.rider_id !== userId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
  if (role === 'driver' && ride.driver_id !== userId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');

  // 2. Block terminal states
  const terminalStatuses = ['completed', 'cancelled', 'no_drivers_available'];
  if (terminalStatuses.includes(ride.status)) {
    throw new AppError(`Cannot cancel a ride with status '${ride.status}'.`, 409, 'RIDE_NOT_CANCELLABLE');
  }

  const emitter = require('../socket/emitter');
  const cancelledBy = role;
  const prevStatus = ride.status;

  // If driver cancels during searching (shouldn't happen) — treat as no-op
  if (role === 'driver' && !['assigned', 'driver_en_route'].includes(prevStatus)) {
    throw new AppError('Driver can only cancel after being assigned.', 409, 'CANCEL_NOT_ALLOWED');
  }

  // Stop waiting timer if active
  waitingTimerService.stopWaitingTimer(rideId);

  // 5. If driver cancels and ride was assigned/en_route — re-enter matching
  if (role === 'driver' && ['assigned', 'driver_en_route'].includes(prevStatus)) {
    logger.info('rideService.cancelRide — driver cancelled, re-entering matching', { rideId });

    // Reset to searching
    await supabase.from('rides').update({
      status: 'searching',
      driver_id: null,
      cancellation_reason: reason || null,
    }).eq('id', rideId);

    // Notify rider
    emitter.emitToRider(ride.rider_id, ride.rider_id, 'ride:status_update', {
      status: 'searching',
      message: 'Your driver cancelled. Finding a new driver...',
    });

    fcmService.sendToUser(ride.rider_id, 'rider', {
      title: 'Driver Cancelled',
      body: 'Your driver cancelled. Finding a new driver...',
      data: { type: 'RIDE_CANCELLED', ride_id: rideId },
    }).catch(() => {});

    setImmediate(() => matchingEngine.startMatching(rideId));
    return { ride_id: rideId, status: 'searching', message: 'Finding a new driver' };
  }

  // Rider cancels — if searching, cancel the matching search
  if (role === 'rider' && prevStatus === 'searching') {
    matchingEngine.cancelSearch(rideId);
  }

  // UPDATE ride as cancelled
  await supabase.from('rides').update({
    status: 'cancelled',
    cancelled_by: cancelledBy,
    cancellation_reason: reason || null,
  }).eq('id', rideId);

  // 7. Emit status update
  emitter.emitToRide(io, rideId, 'ride:status_update', {
    status: 'cancelled',
    cancelled_by: cancelledBy,
    timestamp: new Date().toISOString(),
  });

  // 8. If rider cancelled — notify driver
  if (role === 'rider' && ride.driver_id) {
    emitter.emitToDriver(io, ride.driver_id, 'ride_cancelled', { ride_id: rideId });
  }

  logger.info('rideService.cancelRide', { rideId, cancelledBy, prevStatus, reason });
  return { ride_id: rideId, status: 'cancelled', cancelled_by: cancelledBy };
}

module.exports = { updateRideStatus, cancelRide };
