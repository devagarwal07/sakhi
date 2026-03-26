'use strict';

const { z } = require('zod');
const paymentService = require('../services/paymentService');
const subscriptionService = require('../services/subscriptionService');
const AppError = require('../utils/AppError');

const orderSchema = z.object({
  amount:               z.number().positive(),
  subscription_id_temp: z.string().min(1),
});

const verifySchema = z.object({
  order_id:              z.string().min(1),
  payment_id:            z.string().min(1),
  signature:             z.string().min(1),
  subscription_payload:  z.object({}).passthrough(), // full subscription payload
});

function handleError(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() } });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  return next(err);
}

// ── POST /payments/order ──────────────────────────────────────────────────────
async function createOrder(req, res, next) {
  try {
    const { amount, subscription_id_temp } = orderSchema.parse(req.body);
    const order = await paymentService.createOrder(amount, subscription_id_temp);
    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount / 100, // back to INR
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /payments/verify ─────────────────────────────────────────────────────
async function verifyPayment(req, res, next) {
  try {
    const { order_id, payment_id, signature, subscription_payload } = verifySchema.parse(req.body);

    const valid = paymentService.verifySignature(order_id, payment_id, signature);
    if (!valid) {
      throw new AppError('Payment verification failed. Signature mismatch.', 400, 'PAYMENT_VERIFICATION_FAILED');
    }

    const riderId = req.user.userId;
    const result = await subscriptionService.createSubscription(riderId, subscription_payload, payment_id);

    return res.status(201).json({
      subscription_id:  result.subscription.id,
      status:           result.subscription.status,
      driver_info:      result.driver_info,
      schedule_summary: {
        plan_rides:     subscription_payload.plan_rides,
        per_ride_fare:  result.per_ride_fare,
        total_cost:     result.total_cost,
        distance_km:    result.distance_km,
        is_two_way:     subscription_payload.is_two_way,
      },
    });
  } catch (err) { return handleError(err, res, next); }
}

module.exports = { createOrder, verifyPayment };
