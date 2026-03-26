'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const rideController = require('../controllers/rideController');

const router = Router();

/**
 * GET /rides/estimate
 * Auth required (rider or driver may check fare)
 */
router.get(
  '/estimate',
  authMiddleware,
  roleGuard('rider', 'driver'),
  rideController.estimateFare
);

/**
 * POST /rides
 * Book a new on-demand ride — riders only
 */
router.post(
  '/',
  authMiddleware,
  roleGuard('rider'),
  rideController.createRide
);

module.exports = router;
