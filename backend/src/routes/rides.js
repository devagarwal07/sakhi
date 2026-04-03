'use strict';

const { Router } = require('express');
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

module.exports = router;
