'use strict';

const { Router }     = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const paymentController = require('../controllers/paymentController');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = Router();
router.use(apiLimiter);

/** POST /payments/order  — rider creates a PhonePe subscription payment order */
router.post('/order',  authMiddleware, roleGuard('rider'), paymentController.createOrder);

/** POST /payments/verify — rider verifies subscription payment via PhonePe status API */
router.post('/verify', authMiddleware, roleGuard('rider'), paymentController.verifyPayment);

/** POST /payments/commission/order  — driver creates a PhonePe order for platform commission */
router.post('/commission/order',  authMiddleware, roleGuard('driver'), paymentController.createCommissionOrder);

/** POST /payments/commission/verify — driver verifies PhonePe commission payment */
router.post('/commission/verify', authMiddleware, roleGuard('driver'), paymentController.verifyCommissionPayment);

/** POST /payments/phonepe/callback — PhonePe server-to-server payment status webhook (no auth required) */
router.post('/phonepe/callback', paymentController.phonePeCallback);

module.exports = router;
