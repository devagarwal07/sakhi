'use strict';

const { z }      = require('zod');
const crypto     = require('crypto');
const supabase    = require('../config/supabase');
const mapsService = require('../services/mapsService');
const fareService = require('../services/fareService');
const rideService = require('../services/rideService');
const matchingEngine = require('../services/matchingEngine');
const AppError    = require('../utils/AppError');
const logger      = require('../utils/logger');

// ── Zod schemas ───────────────────────────────────────────────────────────────
const latLngSchema = z.object({
  pickup_lat:  z.coerce.number().min(-90).max(90),
  pickup_lng:  z.coerce.number().min(-180).max(180),
  drop_lat:    z.coerce.number().min(-90).max(90),
  drop_lng:    z.coerce.number().min(-180).max(180),
  stop_lat:    z.coerce.number().min(-90).max(90).optional(),
  stop_lng:    z.coerce.number().min(-180).max(180).optional(),
  promo_code:  z.string().optional(),
});

const rideBookingSchema = z.object({
  pickup_lat:      z.number().min(-90).max(90),
  pickup_lng:      z.number().min(-180).max(180),
  pickup_address:  z.string().optional(),
  drop_lat:        z.number().min(-90).max(90),
  drop_lng:        z.number().min(-180).max(180),
  drop_address:    z.string().optional(),
  stop_lat:        z.number().min(-90).max(90).optional(),
  stop_lng:        z.number().min(-180).max(180).optional(),
  stop_address:    z.string().optional(),
  payment_method:  z.enum(['cash']).default('cash'),
  promo_code:      z.string().optional(),
});

const statusSchema = z.object({
  status:            z.enum(['driver_en_route', 'arrived', 'in_progress', 'completed']),
  payment_collected: z.boolean().optional(),
  pin:               z.string().length(4).optional(), // required when status === 'in_progress'
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

const ratingSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// ── Error helper ──────────────────────────────────────────────────────────────
function handleError(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() } });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  return next(err);
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /rides/estimate
// ──────────────────────────────────────────────────────────────────────────────
async function estimateFare(req, res, next) {
  try {
    const { pickup_lat, pickup_lng, drop_lat, drop_lng, stop_lat, stop_lng, promo_code } = latLngSchema.parse(req.query);

    // Multi-leg: pickup → stop → dropoff (or single leg if no stop)
    let distance_km, duration_min;
    if (stop_lat != null && stop_lng != null) {
      const [leg1, leg2] = await Promise.all([
        mapsService.getDistanceMatrix(pickup_lat, pickup_lng, stop_lat,  stop_lng),
        mapsService.getDistanceMatrix(stop_lat,  stop_lng,  drop_lat,  drop_lng),
      ]);
      distance_km  = (leg1.distance_km  + leg2.distance_km);
      duration_min = (leg1.duration_min + leg2.duration_min);
    } else {
      ({ distance_km, duration_min } = await mapsService.getDistanceMatrix(pickup_lat, pickup_lng, drop_lat, drop_lng));
    }

    const fareConfig = await fareService.getFareConfig('auto');
    const { estimated_fare, breakdown } = fareService.calculateFare(distance_km, duration_min, fareConfig);

    // Night fare
    const night = fareService.isNightFare?.() ?? false;
    const nightMultiplier = fareService.NIGHT_FARE_MULTIPLIER ?? 1.5;

    let finalFare = night ? Math.round(estimated_fare * nightMultiplier) : estimated_fare;
    let promo_discount = 0;
    let promo_applied = false;

    if (promo_code) {
      // dryRun=true so estimate never records usage
      const userId = req.user?.userId;
      const r = await fareService.applyPromo(finalFare, promo_code, userId, null, true);
      finalFare = r.discounted_fare;
      promo_discount = r.promo_discount;
      promo_applied = r.promo_applied;
    }

    // Free ride eligibility
    let free_ride = false;
    const riderId = req.user?.userId;
    if (riderId) {
      const { data: riderRows } = await supabase
        .from('users').select('free_ride_eligible').eq('id', riderId).limit(1);
      if (riderRows?.[0]?.free_ride_eligible) {
        free_ride = true;
        promo_discount = finalFare;
        finalFare = 0;
      }
    }

    return res.status(200).json({
      estimated_fare: finalFare,
      distance_km,
      duration_min,
      breakdown:  { ...breakdown, promo_discount },
      promo_applied,
      free_ride,
      is_night_fare:    night,
      night_multiplier: night ? nightMultiplier : 1,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}


// ──────────────────────────────────────────────────────────────────────────────
// POST /rides
// ──────────────────────────────────────────────────────────────────────────────
async function createRide(req, res, next) {
  try {
    const body = rideBookingSchema.parse(req.body);
    const riderId = req.user.userId;

    const { data: riders } = await supabase.from('users').select('id, gender_verified, verification_status, is_active').eq('id', riderId).limit(1);
    const rider = riders?.[0];
    if (!rider) throw new AppError('Rider not found.', 404, 'USER_NOT_FOUND');

    if (!rider.gender_verified || rider.verification_status !== 'approved' || !rider.is_active) {
      return res.status(403).json({
        error: { code: 'VERIFICATION_REQUIRED', message: 'Complete identity verification to book rides.', details: {} },
      });
    }

    const { data: activeRides } = await supabase
      .from('rides').select('id').eq('rider_id', riderId)
      .in('status', ['searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress']).limit(1);

    if (activeRides?.length) {
      return res.status(409).json({ error: { code: 'ACTIVE_RIDE_EXISTS', message: 'You already have an active ride.', details: { ride_id: activeRides[0].id } } });
    }

    const [pickup_address, drop_address] = await Promise.all([
      body.pickup_address || mapsService.reverseGeocode(body.pickup_lat, body.pickup_lng),
      body.drop_address  || mapsService.reverseGeocode(body.drop_lat, body.drop_lng),
    ]);

    const { distance_km, duration_min } = await mapsService.getDistanceMatrix(body.pickup_lat, body.pickup_lng, body.drop_lat, body.drop_lng);
    const route_polyline = await mapsService.getRoutePolyline(body.pickup_lat, body.pickup_lng, body.drop_lat, body.drop_lng);

    const fareConfig = await fareService.getFareConfig('auto');
    const { estimated_fare } = fareService.calculateFare(distance_km, duration_min);
    let finalFare = estimated_fare;
    let promoDiscount = 0;
    if (body.promo_code) {
      // dryRun=false — will record usage once rideId is available (post-insert below)
      const r = await fareService.applyPromo(estimated_fare, body.promo_code, riderId, null, true /* pre-insert: dry-run */);
      finalFare = r.discounted_fare;
      promoDiscount = r.promo_discount;
    }

    // ── Free ride — consume the flag at booking time ────────────────────────
    const { data: riderFreeCheck } = await supabase
      .from('users').select('free_ride_eligible').eq('id', riderId).limit(1);
    const isFreeRide = riderFreeCheck?.[0]?.free_ride_eligible === true;
    if (isFreeRide) {
      finalFare = 0;
      // Consume the flag atomically before inserting the ride
      await supabase.from('users').update({ free_ride_eligible: false }).eq('id', riderId);
      logger.info('rideController.createRide — free ride applied', { riderId });
    }

    const { data: rideRows, error: insertErr } = await supabase.from('rides').insert({

      rider_id: riderId, pickup_lat: body.pickup_lat, pickup_lng: body.pickup_lng, pickup_address,
      drop_lat: body.drop_lat, drop_lng: body.drop_lng, drop_address,
      estimated_fare: finalFare, distance_km, duration_min, route_polyline,
      status: 'searching', payment_method: body.payment_method,
      ride_start_pin: String(crypto.randomInt(1000, 9999)), // 4-digit PIN for trip start
    }).select('id, ride_start_pin').single();

    if (insertErr) throw new AppError('Failed to create ride.', 500, 'RIDE_CREATE_FAILED');

    const rideId = rideRows.id;
    const ridePin = rideRows.ride_start_pin;

    // Now record promo usage against the real rideId
    if (body.promo_code && promoDiscount > 0) {
      fareService.applyPromo(estimated_fare, body.promo_code, riderId, rideId, false).catch((e) =>
        logger.warn('rideController.createRide — promo usage record failed', { error: e.message })
      );
    }

    setImmediate(() => matchingEngine.startMatching(rideId));

    logger.info('rideController.createRide', { rideId, riderId });
    return res.status(201).json({
      ride_id: rideId,
      status:  'searching',
      ride_start_pin: ridePin,   // shown to rider — share with driver at pickup
      estimated_fare: finalFare,
      distance_km,
      duration_min,
      pickup_address,
      drop_address,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /rides/:id/status
// ──────────────────────────────────────────────────────────────────────────────
async function updateStatus(req, res, next) {
  try {
    const { status, payment_collected, pin } = statusSchema.parse(req.body);
    const io = req.app.get('io');
    const result = await rideService.updateRideStatus(
      req.params.id, status, req.user.userId,
      { payment_collected, pin },
      io
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /rides/:id/cancel
// ──────────────────────────────────────────────────────────────────────────────
async function cancelRide(req, res, next) {
  try {
    const { reason } = cancelSchema.parse(req.body);
    const io = req.app.get('io');
    const result = await rideService.cancelRide(req.params.id, req.user.userId, req.user.role, reason, io);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/accept
// ──────────────────────────────────────────────────────────────────────────────
async function acceptRide(req, res, next) {
  try {
    await matchingEngine.handleDriverAccept(req.params.id, req.user.userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/reject
// ──────────────────────────────────────────────────────────────────────────────
async function rejectRide(req, res, next) {
  try {
    await matchingEngine.handleDriverReject(req.params.id, req.user.userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /rides/:id
// ──────────────────────────────────────────────────────────────────────────────
async function getRide(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const { data: rides } = await supabase
      .from('rides')
      .select(`
        *,
        users!rides_rider_id_fkey(id, name, phone),
        drivers(id, name, phone, vehicle_type, vehicle_reg_no, vehicle_color, vehicle_model, profile_photo_url, upi_id)
      `)
      .eq('id', id)
      .limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

    // Access control
    if (role !== 'admin' && ride.rider_id !== userId && ride.driver_id !== userId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    // Mask phone to last 4 digits
    if (ride.users?.phone) {
      ride.users.phone = '****' + ride.users.phone.slice(-4);
    }
    if (ride.drivers?.phone) {
      ride.drivers.phone = '****' + ride.drivers.phone.slice(-4);
    }

    // PIN visibility: rider sees their own PIN; driver never sees it (they enter it manually)
    if (role === 'driver') {
      delete ride.ride_start_pin;
    }

    return res.status(200).json(ride);
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/rating
// ──────────────────────────────────────────────────────────────────────────────
async function rateRide(req, res, next) {
  try {
    const { rating, comment } = ratingSchema.parse(req.body);
    const { id } = req.params;
    const riderId = req.user.userId;

    const { data: rides } = await supabase
      .from('rides')
      .select('id, status, driver_id, rider_id, completed_at')
      .eq('id', id)
      .limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.rider_id !== riderId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.status !== 'completed') throw new AppError('Can only rate a completed ride.', 422, 'RIDE_NOT_COMPLETED');

    // 24-hour rating window
    if (ride.completed_at) {
      const completedAt = new Date(ride.completed_at).getTime();
      if (Date.now() - completedAt > 24 * 60 * 60 * 1000) {
        throw new AppError('Rating window of 24 hours has expired.', 422, 'RATING_WINDOW_EXPIRED');
      }
    }

    await supabase.from('rides').update({ rider_rating: rating, rider_comment: comment || null }).eq('id', id);

    // Recompute driver avg_rating
    if (ride.driver_id) {
      const { data: avgResult } = await supabase
        .from('rides')
        .select('rider_rating')
        .eq('driver_id', ride.driver_id)
        .not('rider_rating', 'is', null);

      if (avgResult?.length) {
        const avg = avgResult.reduce((sum, r) => sum + r.rider_rating, 0) / avgResult.length;
        await supabase.from('drivers').update({ avg_rating: parseFloat(avg.toFixed(2)) }).eq('id', ride.driver_id);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /rides/:id/chat
// ──────────────────────────────────────────────────────────────────────────────
async function getChatHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Verify access
    const { data: rides } = await supabase
      .from('rides')
      .select('rider_id, driver_id')
      .eq('id', id)
      .limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (role !== 'admin' && ride.rider_id !== userId && ride.driver_id !== userId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    const { data: messages, error } = await supabase
      .from('ride_chat_messages')
      .select('id, sender_role, message_en, message_kn, sent_at')
      .eq('ride_id', id)
      .order('sent_at', { ascending: true });

    if (error) throw new AppError('Failed to fetch chat history.', 500, 'DB_ERROR');

    return res.status(200).json({ ride_id: id, messages: messages || [] });
  } catch (err) {
    return handleError(err, res, next);
  }
}



// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/payment/order  — create a PhonePe order for online payment
// ──────────────────────────────────────────────────────────────────────────────
async function createRidePaymentOrder(req, res, next) {
  try {
    const { id } = req.params;
    const callerId = req.user.userId;
    const paymentService = require('../services/paymentService');

    const { data: rides } = await supabase
      .from('rides').select('id, rider_id, driver_id, net_fare, estimated_fare, payment_method, payment_status')
      .eq('id', id).limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

    // Allow either the rider or the assigned driver to create the order
    const isRider  = ride.rider_id  === callerId;
    const isDriver = ride.driver_id === callerId;
    if (!isRider && !isDriver) throw new AppError('Forbidden.', 403, 'FORBIDDEN');

    if (ride.payment_status === 'paid') throw new AppError('Already paid.', 409, 'ALREADY_PAID');

    const amount = ride.net_fare ?? ride.estimated_fare ?? 0;
    // merchantOrderId: alphanumeric + hyphen/underscore, max 64 chars
    const merchantOrderId = `ride-${id}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

    const result = await paymentService.createOrder(
      amount,
      merchantOrderId,
      null // webhook configured via PhonePe dashboard
    );

    // Store transaction_id on the ride for verification
    await supabase.from('rides').update({ razorpay_order_id: result.transaction_id }).eq('id', id);

    logger.info('rideController.createRidePaymentOrder', { rideId: id, transactionId: result.transaction_id });

    return res.status(200).json({
      transaction_id: result.transaction_id,
      order_id:       result.order_id,
      base64_payload: result.base64_payload,
      amount:         amount,  // in INR
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/payment/verify — verify PhonePe payment, mark ride paid
// ──────────────────────────────────────────────────────────────────────────────
async function verifyRidePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { transaction_id } = req.body;
    const riderId = req.user.userId;
    const io = req.app.get('io');
    const paymentService = require('../services/paymentService');

    if (!transaction_id) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'transaction_id is required.' } });
    }

    const { data: rides } = await supabase
      .from('rides').select('id, rider_id, driver_id, payment_status')
      .eq('id', id).limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    
    const isRider  = ride.rider_id  === riderId;
    const isDriver = ride.driver_id === riderId;
    if (!isRider && !isDriver) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    
    if (ride.payment_status === 'paid') return res.status(200).json({ success: true, message: 'Already paid.' });

    const result = await paymentService.verifyPayment(transaction_id);
    if (!result.success) {
      throw new AppError(`Payment verification failed: state=${result.state}`, 400, 'INVALID_PAYMENT');
    }

    // Mark ride paid (store transaction_id in existing razorpay columns for DB compatibility)
    await supabase.from('rides').update({
      payment_status:      'paid',
      razorpay_order_id:   transaction_id,
      razorpay_payment_id: transaction_id,
    }).eq('id', id);

    // Notify driver
    if (io && ride.driver_id) {
      io.to(`driver:${ride.driver_id}`).emit('payment:success', { ride_id: id });
    }

    logger.info('rideController.verifyRidePayment', { rideId: id, transactionId: transaction_id });
    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /rides/:id/fare-summary  — fare breakdown for PaymentDetailsScreen
// ──────────────────────────────────────────────────────────────────────────────
async function fareSummary(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const role   = req.user.role;

    // Fetch the ride record + driver_earnings in parallel
    const [{ data: rideRows }, { data: earningsRows }] = await Promise.all([
      supabase
        .from('rides')
        .select('id, rider_id, driver_id, status, payment_method, payment_status, pickup_address, drop_address, fare_breakdown, total_fare, distance_km, duration_min, started_at, completed_at')
        .eq('id', id)
        .limit(1),
      supabase
        .from('driver_earnings')
        .select('gross, commission, net, waiting_charge, ride_id')
        .eq('ride_id', id)
        .limit(1),
    ]);

    const ride     = rideRows?.[0];
    const earnings = earningsRows?.[0];

    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

    // Access guard
    if (role === 'driver' && ride.driver_id !== userId)
      throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (role === 'rider' && ride.rider_id !== userId)
      throw new AppError('Forbidden.', 403, 'FORBIDDEN');

    const fareBreakdown = ride.fare_breakdown ?? {};
    // Night fare: check if ride started between 22:00 and 06:00
    const startHour = ride.started_at ? new Date(ride.started_at).getHours() : -1;
    const isNightRide = startHour >= 22 || startHour < 6;
    const nightMultiplier = fareService.NIGHT_FARE_MULTIPLIER ?? 1.5;

    return res.status(200).json({
      ride_id:          id,
      status:           ride.status,
      payment_method:   ride.payment_method  ?? 'cash',
      payment_status:   ride.payment_status  ?? 'pending',
      pickup_address:   ride.pickup_address,
      drop_address:     ride.drop_address,
      distance_km:      ride.distance_km    ?? 0,
      duration_min:     ride.duration_min   ?? 0,
      base_fare:        earnings?.gross     ?? fareBreakdown.base     ?? ride.total_fare ?? 0,
      distance_fare:    fareBreakdown.distance_fare ?? fareBreakdown.distance ?? 0,
      waiting_fare:     earnings?.waiting_charge     ?? fareBreakdown.waiting  ?? 0,
      commission:       earnings?.commission         ?? 0,
      take_home:        earnings?.net                ?? 0,
      total_fare:       ride.total_fare              ?? earnings?.gross ?? 0,
      // Night fare info
      is_night_fare:    isNightRide,
      night_multiplier: isNightRide ? nightMultiplier : 1,
      started_at:       ride.started_at,
      completed_at:     ride.completed_at,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/cash-collected  — driver confirms physical cash received
// ──────────────────────────────────────────────────────────────────────────────
async function cashCollected(req, res, next) {
  try {
    const { id } = req.params;
    const driverId = req.user.userId;

    // Validate access
    const { data: rows } = await supabase
      .from('rides')
      .select('id, rider_id, driver_id, status, payment_method')
      .eq('id', id)
      .limit(1);

    const ride = rows?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.payment_method !== 'cash')
      throw new AppError('This ride uses online payment.', 400, 'WRONG_PAYMENT_METHOD');

    await supabase
      .from('rides')
      .update({ payment_status: 'collected', collected_at: new Date().toISOString() })
      .eq('id', id);

    // Notify rider that cash was acknowledged
    const io = req.app.get('io');
    if (io && ride.rider_id) {
      io.of('/rides').to(`rider:${ride.rider_id}`).emit('payment:success', {
        ride_id:  id,
        method:   'cash',
      });
    }

    logger.info('rideController.cashCollected', { rideId: id, driverId });
    return res.status(200).json({ ok: true });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/rate-rider  — driver rates the rider post-trip
// ──────────────────────────────────────────────────────────────────────────────
const rateRiderSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

async function rateRider(req, res, next) {
  try {
    const { id } = req.params;
    const driverId = req.user.userId;
    const { rating, comment } = rateRiderSchema.parse(req.body);

    // Validate ride access + get rider_id
    const { data: rows } = await supabase
      .from('rides')
      .select('id, rider_id, driver_id, status')
      .eq('id', id)
      .limit(1);

    const ride = rows?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.status !== 'completed') throw new AppError('Ride not yet completed.', 400, 'INVALID_STATUS');

    // Upsert rider rating (idempotent)
    await supabase
      .from('rider_ratings')
      .upsert(
        {
          ride_id:   id,
          rider_id:  ride.rider_id,
          driver_id: driverId,
          rating,
          comment:   comment ?? null,
          rated_at:  new Date().toISOString(),
        },
        { onConflict: 'ride_id' }
      );

    logger.info('rideController.rateRider', { rideId: id, driverId, rating });
    return res.status(200).json({ ok: true });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/subscription/:id/initiate  — driver starts a subscription ride leg
// ──────────────────────────────────────────────────────────────────────────────
async function initiateSubscriptionRide(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { id } = req.params;

    const { data: row, error: fetchErr } = await supabase
      .from('subscription_rides')
      .select('id, assigned_driver_id, status, subscription_id')
      .eq('id', id)
      .limit(1);

    const sr = row?.[0];
    if (fetchErr || !sr) throw new AppError('Subscription ride not found.', 404, 'NOT_FOUND');
    if (sr.assigned_driver_id && sr.assigned_driver_id !== driverId) {
      throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    }

    await supabase
      .from('subscription_rides')
      .update({
        status: 'in_progress',
        assigned_driver_id: driverId,
      })
      .eq('id', id);

    return res.status(200).json({ ok: true, subscription_ride_id: id });
  } catch (err) { return handleError(err, res, next); }
}

async function getActiveRide(req, res, next) {
  try {
    const { userId, role } = req.user;
    let query = supabase
      .from('rides')
      .select(`
        *,
        users!rides_rider_id_fkey(id, name, phone),
        drivers(id, name, phone, vehicle_type, vehicle_reg_no, vehicle_color, vehicle_model, profile_photo_url, upi_id)
      `);

    if (role === 'rider') {
      query = query
        .eq('rider_id', userId)
        .in('status', ['searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress']);
    } else if (role === 'driver') {
      query = query
        .eq('driver_id', userId)
        .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress']);
    } else {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const { data: rides, error } = await query.limit(1);
    if (error) throw error;

    const ride = rides?.[0];
    if (!ride) {
      return res.status(200).json(null);
    }

    // Mask phone to last 4 digits
    if (ride.users?.phone) {
      ride.users.phone = '****' + ride.users.phone.slice(-4);
    }
    if (ride.drivers?.phone) {
      ride.drivers.phone = '****' + ride.drivers.phone.slice(-4);
    }

    // PIN visibility
    if (role === 'driver') {
      delete ride.ride_start_pin;
    }

    return res.status(200).json(ride);
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /rides/nearby-drivers  — rider fetches nearby drivers for map visualization
// ──────────────────────────────────────────────────────────────────────────────
async function getNearbyDrivers(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from('drivers')
      .select(`
        id,
        driver_locations!inner(lat, lng, updated_at)
      `)
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('gender_verified', true)
      .eq('verification_status', 'approved')
      .gte('driver_locations.updated_at', fiveMinsAgo);

    if (error || !rows) {
      logger.error('rideController.getNearbyDrivers — DB error', { error });
      return res.status(200).json([]);
    }

    const drivers = [];
    for (const d of rows) {
      const loc = Array.isArray(d.driver_locations) ? d.driver_locations[0] : d.driver_locations;
      
      // Simple rough filter for around 5km (~0.045 degrees)
      const latDiff = Math.abs(loc.lat - lat);
      const lngDiff = Math.abs(loc.lng - lng);
      
      if (latDiff < 0.045 && lngDiff < 0.045) {
        drivers.push({
          id: d.id,
          lat: loc.lat,
          lng: loc.lng
        });
      }
    }

    return res.status(200).json(drivers);
  } catch (err) {
    return handleError(err, res, next);
  }
}

module.exports = {
  estimateFare, createRide, updateStatus, cancelRide,
  acceptRide, rejectRide, getRide, rateRide, getChatHistory,
  fareSummary, cashCollected, rateRider,
  createRidePaymentOrder, verifyRidePayment,
  initiateSubscriptionRide, getActiveRide, getNearbyDrivers,
};
