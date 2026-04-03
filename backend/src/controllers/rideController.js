'use strict';

const { z } = require('zod');
const supabase = require('../config/supabase');
const mapsService = require('../services/mapsService');
const fareService = require('../services/fareService');
const rideService = require('../services/rideService');
const matchingEngine = require('../services/matchingEngine');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── Zod schemas ───────────────────────────────────────────────────────────────
const latLngSchema = z.object({
  pickup_lat:  z.coerce.number().min(-90).max(90),
  pickup_lng:  z.coerce.number().min(-180).max(180),
  drop_lat:    z.coerce.number().min(-90).max(90),
  drop_lng:    z.coerce.number().min(-180).max(180),
  promo_code:  z.string().optional(),
});

const rideBookingSchema = z.object({
  pickup_lat:      z.number().min(-90).max(90),
  pickup_lng:      z.number().min(-180).max(180),
  pickup_address:  z.string().optional(),
  drop_lat:        z.number().min(-90).max(90),
  drop_lng:        z.number().min(-180).max(180),
  drop_address:    z.string().optional(),
  payment_method:  z.enum(['cash']).default('cash'),
  promo_code:      z.string().optional(),
});

const statusSchema = z.object({
  status:            z.enum(['driver_en_route', 'arrived', 'in_progress', 'completed']),
  payment_collected: z.boolean().optional(),
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
    const { pickup_lat, pickup_lng, drop_lat, drop_lng, promo_code } = latLngSchema.parse(req.query);

    const { distance_km, duration_min } = await mapsService.getDistanceMatrix(pickup_lat, pickup_lng, drop_lat, drop_lng);
    const fareConfig = await fareService.getFareConfig('auto');
    const { estimated_fare, breakdown } = fareService.calculateFare(distance_km, duration_min, fareConfig);

    let finalFare = estimated_fare;
    let promo_discount = 0;
    let promo_applied = false;

    if (promo_code) {
      const r = await fareService.applyPromo(estimated_fare, promo_code);
      finalFare = r.discounted_fare;
      promo_discount = r.promo_discount;
      promo_applied = r.promo_applied;
    }

    return res.status(200).json({
      estimated_fare: finalFare,
      distance_km,
      duration_min,
      breakdown: { ...breakdown, promo_discount },
      promo_applied,
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
    const { estimated_fare } = fareService.calculateFare(distance_km, duration_min, fareConfig);
    let finalFare = estimated_fare;
    if (body.promo_code) {
      const r = await fareService.applyPromo(estimated_fare, body.promo_code);
      finalFare = r.discounted_fare;
    }

    const { data: rideRows, error: insertErr } = await supabase.from('rides').insert({
      rider_id: riderId, pickup_lat: body.pickup_lat, pickup_lng: body.pickup_lng, pickup_address,
      drop_lat: body.drop_lat, drop_lng: body.drop_lng, drop_address,
      estimated_fare: finalFare, distance_km, duration_min, route_polyline,
      status: 'searching', payment_method: body.payment_method,
    }).select('id').single();

    if (insertErr) throw new AppError('Failed to create ride.', 500, 'RIDE_CREATE_FAILED');

    const rideId = rideRows.id;
    setImmediate(() => matchingEngine.startMatching(rideId));

    logger.info('rideController.createRide', { rideId, riderId });
    return res.status(201).json({ ride_id: rideId, status: 'searching', estimated_fare: finalFare, distance_km, duration_min, pickup_address, drop_address });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /rides/:id/status
// ──────────────────────────────────────────────────────────────────────────────
async function updateStatus(req, res, next) {
  try {
    const { status, payment_collected } = statusSchema.parse(req.body);
    const io = req.app.get('io');
    const result = await rideService.updateRideStatus(req.params.id, status, req.user.userId, { payment_collected }, io);
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
        drivers(id, name, phone, vehicle_type, vehicle_reg_no, vehicle_color, vehicle_model, profile_photo_url)
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
// GET /rides/:id/fare-summary  — driver fetches breakdown after trip completes
// ──────────────────────────────────────────────────────────────────────────────
async function fareSummary(req, res, next) {
  try {
    const { id } = req.params;
    const { data: rides } = await supabase
      .from('rides')
      .select('id, estimated_fare, base_fare, wait_charge, platform_commission, net_fare, payment_method, payment_status, drop_address')
      .eq('id', id)
      .limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

    const netFare = ride.net_fare ?? ride.estimated_fare ?? 0;
    return res.status(200).json({
      ride_id:             id,
      base_fare:           ride.base_fare           ?? ride.estimated_fare ?? 0,
      wait_charge:         ride.wait_charge          ?? 0,
      platform_commission: ride.platform_commission  ?? 0,
      net_fare:            netFare,
      payment_method:      ride.payment_method       ?? 'cash',
      payment_status:      ride.payment_status       ?? 'pending',
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/cash-collected  — driver confirms cash received
// ──────────────────────────────────────────────────────────────────────────────
async function cashCollected(req, res, next) {
  try {
    const { id } = req.params;
    const driverId = req.user.userId;
    const io = req.app.get('io');

    const { data: rides } = await supabase
      .from('rides').select('id, driver_id, rider_id, status, payment_method')
      .eq('id', id).limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.status !== 'completed') throw new AppError('Ride not yet completed.', 422, 'RIDE_NOT_COMPLETED');

    await supabase.from('rides').update({ payment_status: 'collected' }).eq('id', id);

    // Notify rider their cash payment was confirmed
    if (io && ride.rider_id) {
      io.to(`user:${ride.rider_id}`).emit('payment:success', { ride_id: id });
    }

    logger.info('rideController.cashCollected', { rideId: id, driverId });
    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/rate-rider  — driver rates the rider
// ──────────────────────────────────────────────────────────────────────────────
async function rateRider(req, res, next) {
  try {
    const { rating } = ratingSchema.parse(req.body);
    const { id } = req.params;
    const driverId = req.user.userId;

    const { data: rides } = await supabase
      .from('rides').select('id, driver_id, rider_id, status')
      .eq('id', id).limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.status !== 'completed') throw new AppError('Can only rate after completion.', 422, 'RIDE_NOT_COMPLETED');

    await supabase.from('rides').update({ driver_rating_for_rider: rating }).eq('id', id);

    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/payment/order  — create a Razorpay order for online payment
// ──────────────────────────────────────────────────────────────────────────────
async function createRidePaymentOrder(req, res, next) {
  try {
    const { id } = req.params;
    const riderId = req.user.userId;
    const paymentService = require('../services/paymentService');

    const { data: rides } = await supabase
      .from('rides').select('id, rider_id, net_fare, estimated_fare, payment_method, payment_status')
      .eq('id', id).limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.rider_id !== riderId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.payment_status === 'paid') throw new AppError('Already paid.', 409, 'ALREADY_PAID');

    const amount = ride.net_fare ?? ride.estimated_fare ?? 0;
    const order  = await paymentService.createOrder(amount, `ride_${id}`);

    // Store order_id on the ride for verification
    await supabase.from('rides').update({ razorpay_order_id: order.id }).eq('id', id);

    logger.info('rideController.createRidePaymentOrder', { rideId: id, orderId: order.id });

    return res.status(200).json({
      order_id:  order.id,
      amount:    order.amount,       // in paise
      currency:  order.currency,
      key_id:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides/:id/payment/verify — verify Razorpay signature, mark ride paid
// ──────────────────────────────────────────────────────────────────────────────
async function verifyRidePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const riderId = req.user.userId;
    const io = req.app.get('io');
    const paymentService = require('../services/paymentService');

    const { data: rides } = await supabase
      .from('rides').select('id, rider_id, driver_id, payment_status')
      .eq('id', id).limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.rider_id !== riderId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
    if (ride.payment_status === 'paid') return res.status(200).json({ success: true, message: 'Already paid.' });

    const valid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) throw new AppError('Payment signature verification failed.', 400, 'INVALID_SIGNATURE');

    // Mark ride paid
    await supabase.from('rides').update({
      payment_status:    'paid',
      razorpay_order_id,
      razorpay_payment_id,
    }).eq('id', id);

    // Notify driver
    if (io && ride.driver_id) {
      io.to(`driver:${ride.driver_id}`).emit('payment:success', { ride_id: id });
    }

    logger.info('rideController.verifyRidePayment', { rideId: id, paymentId: razorpay_payment_id });
    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(err, res, next);
  }
}

module.exports = {
  estimateFare, createRide, updateStatus, cancelRide,
  acceptRide, rejectRide, getRide, rateRide, getChatHistory,
  fareSummary, cashCollected, rateRider,
  createRidePaymentOrder, verifyRidePayment,
};
