'use strict';

const crypto = require('crypto');
const axios = require('axios');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

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
 * @returns Razorpay order object
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
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { createOrder, verifySignature };
