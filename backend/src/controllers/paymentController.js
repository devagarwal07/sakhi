'use strict';

const { z } = require('zod');
const paymentService      = require('../services/paymentService');
const subscriptionService = require('../services/subscriptionService');
const AppError            = require('../utils/AppError');
const supabase            = require('../config/supabase');
const logger              = require('../utils/logger');

const orderSchema = z.object({
  amount:               z.number().positive(),
  subscription_id_temp: z.string().min(1),
  paymentMode:          z.string().optional(),
  targetApp:            z.string().optional(),
});

const verifySchema = z.object({
  transaction_id:        z.string().min(1),
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
    const { amount, subscription_id_temp, paymentMode, targetApp } = orderSchema.parse(req.body);
    const riderId = req.user.userId;

    // merchantOrderId: alphanumeric + hyphen/underscore only, max 64 chars
    const merchantOrderId = `sub-${subscription_id_temp}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

    const { data: userRows } = await supabase
      .from('users')
      .select('phone, name')
      .eq('id', riderId)
      .limit(1);
    const userInfo = { userId: riderId, phone: userRows?.[0]?.phone || '', name: userRows?.[0]?.name || '' };

    const paymentModeOptions = { type: paymentMode, targetApp };

    const result = await paymentService.createOrder(
      amount,
      merchantOrderId,
      null, // callback handled via PhonePe dashboard webhook config
      userInfo,
      paymentModeOptions
    );

    return res.status(200).json({
      transaction_id:  result.transaction_id, // = merchantOrderId
      order_id:        result.order_id,       // PhonePe OMO... id
      base64_payload:  result.base64_payload,
      sdk_payload:     result.sdk_payload,
      amount:          amount, // INR
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /payments/verify ─────────────────────────────────────────────────────
async function verifyPayment(req, res, next) {
  try {
    const { transaction_id, subscription_payload } = verifySchema.parse(req.body);

    const result = await paymentService.verifyPayment(transaction_id);
    if (!result.success) {
      throw new AppError(`Payment verification failed: state=${result.state}`, 400, 'PAYMENT_VERIFICATION_FAILED');
    }

    const riderId = req.user.userId;

    let createResult;
    try {
      createResult = await subscriptionService.createSubscription(riderId, subscription_payload, transaction_id);
    } catch (createErr) {
      // Payment verified but subscription creation failed — save pending_payment row so rider can retry
      await supabase.from('subscriptions').insert({
        rider_id:           riderId,
        pickup_lat:         subscription_payload.pickup_lat,
        pickup_lng:         subscription_payload.pickup_lng,
        pickup_address:     subscription_payload.pickup_address || '',
        drop_lat:           subscription_payload.drop_lat,
        drop_lng:           subscription_payload.drop_lng,
        drop_address:       subscription_payload.drop_address || '',
        pickup_time:        subscription_payload.pickup_time,
        return_pickup_time: subscription_payload.return_pickup_time || null,
        start_date:         subscription_payload.start_date,
        plan_rides:         subscription_payload.plan_rides,
        days_of_week:       subscription_payload.days_of_week,
        is_two_way:         subscription_payload.is_two_way || false,
        total_cost:         0,
        status:             'pending_payment',
        payment_id:         transaction_id,
        payment_order_id:   transaction_id,
        rides_completed:    0,
      }).catch((dbErr) =>
        require('../utils/logger').error('verifyPayment — failed to save pending_payment row', { error: dbErr.message })
      );
      throw createErr;
    }

    return res.status(201).json({
      subscription_id:  createResult.subscription.id,
      status:           createResult.subscription.status,
      driver_info:      createResult.driver_info,
      schedule_summary: {
        plan_rides:     subscription_payload.plan_rides,
        per_ride_fare:  createResult.per_ride_fare,
        total_cost:     createResult.total_cost,
        distance_km:    createResult.distance_km,
        is_two_way:     subscription_payload.is_two_way,
      },
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /payments/commission/order — driver creates platform commission order ────
async function createCommissionOrder(req, res, next) {
  try {
    const { amount, period } = req.body;
    if (!amount || amount <= 0) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' } });
    }
    const driverId = req.user.userId;
    // merchantOrderId: alphanumeric + hyphen/underscore only, max 64 chars
    const merchantOrderId = `comm-${driverId.slice(0, 20)}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

    const result = await paymentService.createOrder(
      amount,
      merchantOrderId,
      null // webhook configured via PhonePe dashboard
    );

    return res.status(200).json({
      transaction_id:  result.transaction_id,
      order_id:        result.order_id,
      base64_payload:  result.base64_payload,
      amount:          amount,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /payments/commission/verify — driver verifies commission payment ─────
async function verifyCommissionPayment(req, res, next) {
  try {
    const { transaction_id, period, amount } = req.body;
    if (!transaction_id) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'transaction_id is required.' } });
    }
    const driverId = req.user.userId;

    const result = await paymentService.verifyPayment(transaction_id);
    if (!result.success) {
      throw new AppError(`Payment verification failed: state=${result.state}`, 400, 'PAYMENT_VERIFICATION_FAILED');
    }

    // Log the commission payment (non-fatal — table may not exist yet)
    await supabase.from('driver_commission_payments').insert({
      driver_id:           driverId,
      period:              period ?? 'daily',
      amount_inr:          amount ?? 0,
      razorpay_order_id:   transaction_id,   // reuse existing column to store PhonePe txn_id
      razorpay_payment_id: transaction_id,
      status:              'paid',
      paid_at:             new Date().toISOString(),
    }).catch(() => { /* non-fatal if table doesn't exist */ });

    return res.status(200).json({ success: true, payment_id: transaction_id });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /payments/phonepe/callback — PhonePe server-to-server webhook ────────
// PhonePe new API webhook sends JSON body (not base64). Handles both old and new formats.
async function phonePeCallback(req, res, next) {
  try {
    let decoded = req.body;

    // Legacy format: base64-encoded body in { response } field
    if (decoded?.response && typeof decoded.response === 'string') {
      try {
        decoded = JSON.parse(Buffer.from(decoded.response, 'base64').toString('utf8'));
      } catch (_) { /* ignore parse error */ }
    }

    logger.info('phonePeCallback — received', { state: decoded?.state, type: decoded?.type });

    // New API format: { orderId, state, merchantOrderId, ... }
    const state              = decoded?.state;
    const merchantOrderId    = decoded?.merchantOrderId || decoded?.data?.merchantTransactionId;
    const transactionId      = decoded?.transactionId  || decoded?.data?.transactionId || merchantOrderId;
    const amount             = decoded?.amount         || decoded?.data?.amount;

    // Old API format: code === 'PAYMENT_SUCCESS'
    const code               = decoded?.code;

    const isSuccess = state === 'COMPLETED' || code === 'PAYMENT_SUCCESS';

    if (isSuccess && merchantOrderId) {
      await paymentService.handlePaymentCaptured({
        transactionId,
        merchantTransactionId: merchantOrderId,
        amount,
        code,
        state,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('phonePeCallback — error', { error: err.message });
    return res.status(200).json({ success: true }); // always return 200 to PhonePe
  }
}

// ── POST /payments/cancellation-fine/order — rider creates a PhonePe order for ₹20 fine ────
async function createCancellationFineOrder(req, res, next) {
  try {
    const riderId = req.user.userId;

    // Verify fine is actually pending
    const { data: userRows } = await supabase
      .from('users')
      .select('cancellation_fine_pending, cancellation_fine_amount')
      .eq('id', riderId)
      .limit(1);

    const user = userRows?.[0];
    if (!user?.cancellation_fine_pending) {
      return res.status(400).json({ error: { code: 'NO_FINE_PENDING', message: 'No cancellation fine is pending.' } });
    }

    const fineAmount = user.cancellation_fine_amount || 20;
    const merchantOrderId = `fine-${riderId.slice(0, 20)}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

    const result = await paymentService.createOrder(fineAmount, merchantOrderId, null, { userId: riderId });

    return res.status(200).json({
      transaction_id:  result.transaction_id,
      order_id:        result.order_id,
      base64_payload:  result.base64_payload,
      amount:          fineAmount,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /payments/cancellation-fine/verify — verify fine payment and clear flag ────────────
async function verifyCancellationFine(req, res, next) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'transaction_id is required.' } });
    }
    const riderId = req.user.userId;

    const result = await paymentService.verifyPayment(transaction_id);
    if (!result.success) {
      throw new AppError(`Fine payment verification failed: state=${result.state}`, 400, 'PAYMENT_VERIFICATION_FAILED');
    }

    // Clear the fine flag — rider can now book again
    await supabase.from('users').update({
      cancellation_fine_pending: false,
      cancellation_fine_amount:  0,
    }).eq('id', riderId);

    // Log fine payment for audit
    await supabase.from('cancellation_fine_payments').insert({
      rider_id:       riderId,
      amount:         result.rawData?.amount ? result.rawData.amount / 100 : 20,
      transaction_id,
      paid_at:        new Date().toISOString(),
    }).catch(() => {}); // non-fatal if table doesn't exist yet

    logger.info('paymentController.verifyCancellationFine — fine cleared', { riderId, transaction_id });
    return res.status(200).json({ success: true, message: 'Fine paid. You can now book rides.' });
  } catch (err) { return handleError(err, res, next); }
}

module.exports = {
  createOrder,
  verifyPayment,
  createCommissionOrder,
  verifyCommissionPayment,
  phonePeCallback,
  createCancellationFineOrder,
  verifyCancellationFine,
};

