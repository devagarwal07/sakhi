'use strict';

const crypto = require('crypto');
const axios  = require('axios');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

// ── Razorpay base URL and auth ────────────────────────────────────────────────
function razorpayAuth() {
  return {
    username: process.env.RAZORPAY_KEY_ID,
    password: process.env.RAZORPAY_KEY_SECRET,
  };
}

/**
 * createOrder — creates a Razorpay order
 * @param {number} amountInr  Amount in INR (will be converted to paise)
 * @param {string} receipt    Unique receipt identifier
 */
async function createOrder(amountInr, receipt) {
  try {
    const { data } = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount:   Math.round(amountInr * 100), // paise
        currency: 'INR',
        receipt:  String(receipt).slice(0, 40),
      },
      { auth: razorpayAuth(), timeout: 10_000 }
    );
    return data;
  } catch (err) {
    logger.error('paymentService.createOrder — error', { error: err?.response?.data || err.message });
    throw new AppError('Failed to create payment order. Please try again.', 502, 'PAYMENT_ORDER_FAILED');
  }
}

/**
 * verifySignature — HMAC-SHA256 verification of Razorpay payment
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature   From Razorpay SDK response
 * @returns {boolean}
 */
function verifySignature(orderId, paymentId, signature) {
  const secret   = process.env.RAZORPAY_KEY_SECRET || '';
  const body     = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * GAP 3 — handlePaymentCaptured
 * Called from the Razorpay webhook when payment.captured event fires.
 * Marks the corresponding subscription active if it was pending payment.
 *
 * @param {{ paymentId, orderId, amount, notes }} param0
 */
async function handlePaymentCaptured({ paymentId, orderId, amount, notes }) {
  try {
    logger.info('paymentService.handlePaymentCaptured', { paymentId, orderId, amount });

    // Try to find a subscription in pending_payment status linked to this order
    // The orderId is stored as payment_order_id (set during order creation)
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, rider_id, status')
      .eq('payment_order_id', orderId)
      .eq('status', 'pending_payment')
      .limit(1);

    const sub = subs?.[0];
    if (!sub) {
      logger.warn('paymentService.handlePaymentCaptured — no pending_payment subscription found', { orderId });
      return;
    }

    // Activate subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status:     'active',
        payment_id: paymentId,
      })
      .eq('id', sub.id);

    if (error) {
      logger.error('paymentService.handlePaymentCaptured — failed to activate subscription', { error, subId: sub.id });
      return;
    }

    logger.info('paymentService.handlePaymentCaptured — subscription activated', { subId: sub.id, paymentId });

    // Notify rider
    const fcmService = require('./fcmService');
    await fcmService.sendToUser(sub.rider_id, 'rider', {
      title: 'Payment Received ✅',
      body:  'Your subscription payment was confirmed. Enjoy your rides!',
      data:  { type: 'PROMO_OFFER', subscription_id: sub.id },
    }).catch(() => {});
  } catch (err) {
    logger.error('paymentService.handlePaymentCaptured — unexpected error', { error: err.message });
  }
}

module.exports = { createOrder, verifySignature, handlePaymentCaptured };
