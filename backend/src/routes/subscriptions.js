'use strict';

const { Router } = require('express');
const authMiddleware            = require('../middleware/authMiddleware');
const roleGuard                 = require('../middleware/roleGuard');
const subscriptionController    = require('../controllers/subscriptionController');
const { apiLimiter }            = require('../middleware/rateLimiter');

const router = Router();
router.use(apiLimiter);

// Item 13 — Pending-payment retry (must be before /:id to avoid conflict)
router.get('/pending-payment', authMiddleware, roleGuard('rider'), subscriptionController.getPendingPayment);

// ── Two-phase subscription flow ──────────────────────────────────────────────
// Phase 1: Book intent — finds driver, calculates fare, returns subscription_id
router.post('/intent',     authMiddleware, roleGuard('rider'), subscriptionController.createIntent);
// Phase 2: Activate — verify UPI payment, activate subscription + generate rides
router.post('/:id/activate', authMiddleware, roleGuard('rider'), subscriptionController.activateSubscriptionHandler);

router.get('/',            authMiddleware, roleGuard('rider'), subscriptionController.listSubscriptions);
router.get('/:id',         authMiddleware, roleGuard('rider'), subscriptionController.getSubscription);
router.get('/:id/status',  authMiddleware, roleGuard('rider'), subscriptionController.getSubscriptionStatus);
router.patch('/:id/pause', authMiddleware, roleGuard('rider'), subscriptionController.pauseSubscription);
router.patch('/:id/resume',authMiddleware, roleGuard('rider'), subscriptionController.resumeSubscription);
router.patch('/:id/cancel',authMiddleware, roleGuard('rider'), subscriptionController.cancelSubscription);

module.exports = router;
