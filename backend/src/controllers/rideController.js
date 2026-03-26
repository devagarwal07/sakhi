'use strict';

const { z } = require('zod');
const supabase = require('../config/supabase');
const mapsService = require('../services/mapsService');
const fareService = require('../services/fareService');
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

// ──────────────────────────────────────────────────────────────────────────────
// GET /rides/estimate
// ──────────────────────────────────────────────────────────────────────────────
async function estimateFare(req, res, next) {
  try {
    const params = latLngSchema.parse(req.query);
    const { pickup_lat, pickup_lng, drop_lat, drop_lng, promo_code } = params;

    // 1. Distance + duration
    const { distance_km, duration_min } = await mapsService.getDistanceMatrix(
      pickup_lat, pickup_lng, drop_lat, drop_lng
    );

    // 2. Base fare
    const fareConfig = await fareService.getFareConfig('auto');
    const { estimated_fare, breakdown } = fareService.calculateFare(distance_km, duration_min, fareConfig);

    // 3. Promo (optional)
    let finalFare = estimated_fare;
    let promo_discount = 0;
    let promo_applied = false;

    if (promo_code) {
      const promoResult = await fareService.applyPromo(estimated_fare, promo_code);
      finalFare = promoResult.discounted_fare;
      promo_discount = promoResult.promo_discount;
      promo_applied = promoResult.promo_applied;
    }

    return res.status(200).json({
      estimated_fare: finalFare,
      distance_km,
      duration_min,
      breakdown: { ...breakdown, promo_discount },
      promo_applied,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters.', details: err.flatten() },
      });
    }
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    return next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /rides  — Book a new ride
// ──────────────────────────────────────────────────────────────────────────────
async function createRide(req, res, next) {
  try {
    const body = rideBookingSchema.parse(req.body);
    const riderId = req.user.userId;

    // 1. Fetch rider
    const { data: riders } = await supabase
      .from('users')
      .select('id, gender_verified, verification_status, is_active')
      .eq('id', riderId)
      .limit(1);

    const rider = riders?.[0];
    if (!rider) throw new AppError('Rider not found.', 404, 'USER_NOT_FOUND');

    // 2. Verification gate
    if (!rider.gender_verified || rider.verification_status !== 'approved' || !rider.is_active) {
      return res.status(403).json({
        error: {
          code: 'VERIFICATION_REQUIRED',
          message: 'Complete identity verification to book rides.',
          details: {
            gender_verified: rider.gender_verified,
            verification_status: rider.verification_status,
          },
        },
      });
    }

    // 3. Active ride check
    const { data: activeRides } = await supabase
      .from('rides')
      .select('id')
      .eq('rider_id', riderId)
      .in('status', ['searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress'])
      .limit(1);

    if (activeRides && activeRides.length > 0) {
      return res.status(409).json({
        error: { code: 'ACTIVE_RIDE_EXISTS', message: 'You already have an active ride.', details: { ride_id: activeRides[0].id } },
      });
    }

    // 4 & 5. Resolve addresses
    const [pickup_address, drop_address] = await Promise.all([
      body.pickup_address || mapsService.reverseGeocode(body.pickup_lat, body.pickup_lng),
      body.drop_address  || mapsService.reverseGeocode(body.drop_lat, body.drop_lng),
    ]);

    // 6. Distance + duration
    const { distance_km, duration_min } = await mapsService.getDistanceMatrix(
      body.pickup_lat, body.pickup_lng, body.drop_lat, body.drop_lng
    );

    // 7. Polyline (non-fatal)
    const route_polyline = await mapsService.getRoutePolyline(
      body.pickup_lat, body.pickup_lng, body.drop_lat, body.drop_lng
    );

    // 8. Fare
    const fareConfig = await fareService.getFareConfig('auto');
    const { estimated_fare } = fareService.calculateFare(distance_km, duration_min, fareConfig);

    let finalFare = estimated_fare;
    if (body.promo_code) {
      const promoResult = await fareService.applyPromo(estimated_fare, body.promo_code);
      finalFare = promoResult.discounted_fare;
    }

    // 9. Insert ride
    const { data: rideRows, error: insertErr } = await supabase
      .from('rides')
      .insert({
        rider_id:        riderId,
        pickup_lat:      body.pickup_lat,
        pickup_lng:      body.pickup_lng,
        pickup_address,
        drop_lat:        body.drop_lat,
        drop_lng:        body.drop_lng,
        drop_address,
        estimated_fare:  finalFare,
        distance_km,
        duration_min,
        route_polyline,
        status:          'searching',
        payment_method:  body.payment_method,
      })
      .select('id')
      .single();

    if (insertErr) {
      logger.error('rideController.createRide — DB insert error', { error: insertErr });
      throw new AppError('Failed to create ride.', 500, 'RIDE_CREATE_FAILED');
    }

    const rideId = rideRows.id;

    // 10. Trigger matching engine (async, non-blocking)
    setImmediate(() => matchingEngine.startMatching(rideId));

    logger.info('rideController.createRide — ride created', { rideId, riderId });

    // 11. Return
    return res.status(201).json({
      ride_id:        rideId,
      status:         'searching',
      estimated_fare: finalFare,
      distance_km,
      duration_min,
      pickup_address,
      drop_address,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.', details: err.flatten() },
      });
    }
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    return next(err);
  }
}

module.exports = { estimateFare, createRide };
