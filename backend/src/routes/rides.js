'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const rideController = require('../controllers/rideController');

const router = Router();

/** GET /rides/:id/estimate — rider or driver may check fare */
router.get('/estimate',       authMiddleware, roleGuard('rider', 'driver'), rideController.estimateFare);

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

/** POST /rides/:id/rating — rider rates the driver after completion */
router.post('/:id/rating',    authMiddleware, roleGuard('rider'),           rideController.rateRide);

module.exports = router;
