'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const paymentController = require('../controllers/paymentController');

const router = Router();

router.post('/order',  authMiddleware, roleGuard('rider'), paymentController.createOrder);
router.post('/verify', authMiddleware, roleGuard('rider'), paymentController.verifyPayment);

module.exports = router;
