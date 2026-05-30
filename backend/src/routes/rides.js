'use strict';

const { Router } = require('express');
const { z } = require('zod');
const supabase = require('../config/supabase');
const authMiddleware  = require('../middleware/authMiddleware');
const roleGuard       = require('../middleware/roleGuard');
const rideController  = require('../controllers/rideController');
const { estimateLimiter, apiLimiter } = require('../middleware/rateLimiter');

const router = Router();

// General API rate limit on all ride routes
router.use(apiLimiter);

/** GET /rides/estimate — rider or driver may check fare */
router.get('/estimate',       authMiddleware, roleGuard('rider', 'driver'), estimateLimiter, rideController.estimateFare);

/** POST /rides — book a new ride (rider only) */
router.post('/',              authMiddleware, roleGuard('rider'),           rideController.createRide);

/** POST /rides/subscription/:id/initiate — driver starts subscription leg */
router.post('/subscription/:id/initiate', authMiddleware, roleGuard('driver'), rideController.initiateSubscriptionRide);

/** GET /rides/active — fetch current active ride for driver/rider */
router.get('/active',          authMiddleware, roleGuard('rider', 'driver'), rideController.getActiveRide);

/** GET /rides/nearby-drivers — fetch nearby active drivers for map visualization */
router.get('/nearby-drivers',  authMiddleware, roleGuard('rider'),           rideController.getNearbyDrivers);

/** GET /rides/:id — fetch full ride details */
router.get('/:id',            authMiddleware,                               rideController.getRide);

/** GET /rides/:id/chat — fetch full chat history */
router.get('/:id/chat',       authMiddleware, roleGuard('rider', 'driver'), rideController.getChatHistory);

/** PATCH /rides/:id/status — driver updates status */
router.patch('/:id/status',   authMiddleware, roleGuard('driver'),          rideController.updateStatus);

/** PATCH /rides/:id/cancel — rider or driver cancels */
router.patch('/:id/cancel',   authMiddleware, roleGuard('rider', 'driver'), rideController.cancelRide);

/** POST /rides/:id/accept — driver accepts a ride request */
router.post('/:id/accept',    authMiddleware, roleGuard('driver'),          rideController.acceptRide);

/** POST /rides/:id/reject — driver rejects a ride request */
router.post('/:id/reject',    authMiddleware, roleGuard('driver'),          rideController.rejectRide);

/** POST /rides/:id/payment/order  — create Razorpay order for ride fare (rider books, driver can also trigger if applicable) */
router.post('/:id/payment/order',  authMiddleware, roleGuard('rider', 'driver'), rideController.createRidePaymentOrder);

/** POST /rides/:id/payment/verify — verify Razorpay signature and mark ride paid */
router.post('/:id/payment/verify', authMiddleware, roleGuard('rider', 'driver'), rideController.verifyRidePayment);

/** GET /rides/:id/fare-summary — driver fetches fare breakdown after completion */
router.get('/:id/fare-summary',    authMiddleware, roleGuard('driver', 'rider'), rideController.fareSummary);

/** POST /rides/:id/cash-collected — driver confirms cash payment received */
router.post('/:id/cash-collected', authMiddleware, roleGuard('driver'), rideController.cashCollected);

/** POST /rides/:id/rate-rider — driver rates the rider */
router.post('/:id/rate-rider',     authMiddleware, roleGuard('driver'), rideController.rateRider);

/** POST /rides/:id/rating — rider rates the driver */
router.post('/:id/rating',         authMiddleware, roleGuard('rider'), rideController.rateRide);

/** POST /rides/:id/share-sms — rider shares live tracking via SMS emergency template */
router.post('/:id/share-sms', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const parsed = z.object({
      phone: z.string().min(10).max(15)
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'phone is required and must be a valid 10-15 digit string' });
    }

    const { phone } = parsed.data;
    const rideId = req.params.id;

    // Fetch ride details along with rider name
    const { data: ride, error } = await supabase
      .from('rides')
      .select('*, users(name)')
      .eq('id', rideId)
      .eq('rider_id', req.user.userId)
      .single();

    if (error || !ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const riderName = ride.users?.name || 'Your friend';
    const currentLoc = ride.current_lat && ride.current_lng 
      ? `${ride.current_lat},${ride.current_lng}` 
      : 'active-ride';
    
    // Generate tracking URL
    const trackUrl = `https://sakhimobility.org/track/${rideId}`;

    const smsService = require('../services/smsService');
    
    // Exact matching pattern for DLT:
    // SAKHI MOBILITY:{#var#} shared live ride tracking. Current location:{#var#} . Please track here:{#var#}
    const formattedMessage = `SAKHI MOBILITY:${riderName} shared live ride tracking. Current location:${currentLoc} . Please track here:${trackUrl}`;

    const smsResult = await smsService.sendSMS(phone, formattedMessage, smsService.FORTIUS_TEMPLATES.SAKHI_SOS_TRACK);

    if (smsResult.sent) {
      return res.json({ success: true, message: 'Tracking link sent successfully via SMS' });
    } else {
      return res.status(500).json({ success: false, error: smsResult.reason });
    }
  } catch (err) {
    return next(err);
  }
});

/** POST /rides/promo/validate — validate a promo code without recording usage (dry-run) */
router.post('/promo/validate', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { promo_code, fare } = z.object({
      promo_code: z.string().min(1).max(40),
      fare:       z.coerce.number().min(0),
    }).parse(req.body);

    const fareService = require('../services/fareService');
    const result = await fareService.applyPromo(fare, promo_code, req.user.userId, null, true /* dryRun */);

    return res.json({
      valid:          result.promo_applied,
      discounted_fare: result.discounted_fare,
      promo_discount:  result.promo_discount,
      promo_data:      result.promo_data,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'promo_code and fare are required', details: err.flatten() } });
    }
    // AppErrors (PROMO_INVALID, PROMO_EXHAUSTED, etc.) — return structured 400
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, valid: false } });
    }
    return next(err);
  }
});

module.exports = router;
