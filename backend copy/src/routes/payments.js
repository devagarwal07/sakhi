'use strict';

const { Router }     = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const paymentController = require('../controllers/paymentController');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = Router();
router.use(apiLimiter);

/** POST /payments/order  — rider creates a subscription payment order */
router.post('/order',  authMiddleware, roleGuard('rider'), paymentController.createOrder);

/** POST /payments/verify — rider verifies subscription payment */
router.post('/verify', authMiddleware, roleGuard('rider'), paymentController.verifyPayment);

/** POST /payments/commission/order  — driver creates a Razorpay order for platform commission */
router.post('/commission/order',  authMiddleware, roleGuard('driver'), paymentController.createCommissionOrder);

/** POST /payments/commission/verify — driver verifies commission payment signature */
router.post('/commission/verify', authMiddleware, roleGuard('driver'), paymentController.verifyCommissionPayment);

module.exports = router;
