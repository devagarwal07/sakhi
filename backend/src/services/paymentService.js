'use strict';

const axios    = require('axios');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

// ── PhonePe New API Config (OAuth2 + Order Token) ────────────────────────────
const PHONEPE_CLIENT_ID      = process.env.PHONEPE_CLIENT_ID;       // SU2605301736448889015067
const PHONEPE_CLIENT_SECRET  = process.env.PHONEPE_CLIENT_SECRET;   // 82bae344-a211-48af-ab42-42d059557c29
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || '1';
const PHONEPE_ENV            = (process.env.PHONEPE_ENV || 'PRODUCTION').toUpperCase();

// Production API base (no sandbox for these credentials)
const PHONEPE_AUTH_URL  = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
const PHONEPE_ORDER_URL = 'https://api.phonepe.com/apis/pg/checkout/v2/sdk/order';
const PHONEPE_STATUS_URL_BASE = 'https://api.phonepe.com/apis/pg/checkout/v2/order';

// ── In-memory token cache ─────────────────────────────────────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0; // epoch seconds

/**
 * getAuthToken — fetches (or returns cached) PhonePe OAuth2 Bearer token.
 * Token is valid for ~7 days; we refresh 10 minutes before expiry.
 */
async function getAuthToken() {
  const nowSec = Math.floor(Date.now() / 1000);
  const BUFFER = 600; // refresh 10 min before expiry

  if (_cachedToken && _tokenExpiresAt && nowSec < (_tokenExpiresAt - BUFFER)) {
    return _cachedToken;
  }

  try {
    const params = new URLSearchParams({
      client_id:      PHONEPE_CLIENT_ID,
      client_version: PHONEPE_CLIENT_VERSION,
      client_secret:  PHONEPE_CLIENT_SECRET,
      grant_type:     'client_credentials',
    });

    const { data } = await axios.post(PHONEPE_AUTH_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15_000,
    });

    if (!data?.access_token) {
      throw new AppError('PhonePe auth failed — no access_token in response.', 502, 'PHONEPE_AUTH_FAILED');
    }

    _cachedToken     = data.access_token;
    // expires_at is epoch seconds per docs
    _tokenExpiresAt  = data.expires_at || (nowSec + 7 * 24 * 3600);

    logger.info('paymentService.getAuthToken — token refreshed', {
      expires_at: _tokenExpiresAt,
      token_type: data.token_type,
    });

    return _cachedToken;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('paymentService.getAuthToken — error', {
      error: err?.response?.data || err.message,
    });
    throw new AppError('Unable to authenticate with PhonePe. Please try again.', 502, 'PHONEPE_AUTH_FAILED');
  }
}

/**
 * createOrder — creates a PhonePe order token via the new v2 API.
 *
 * @param {number} amountInr              Amount in INR (converted to paise internally)
 * @param {string} merchantOrderId        Unique order identifier (max 64 chars, alphanumeric + - _)
 * @param {object} [userInfo]             Optional: { phone, name, userId }
 * @returns {{ transaction_id, order_id, token, amount_paise, expires_at }}
 */
async function createOrder(amountInr, merchantOrderId, _callbackUrl, userInfo = {}, paymentModeOptions = {}) {
  try {
    const token = await getAuthToken();

    // Sanitize merchantOrderId — alphanumeric, hyphen, underscore only
    const safeOrderId = String(merchantOrderId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);

    const payload = {
      merchantOrderId: safeOrderId,
      amount:          Math.round(amountInr * 100), // paise
      expireAfter:     1200, // 20 minutes
      metaInfo: {
        udf1: userInfo.userId  || '',
        udf2: userInfo.phone   || '',
        udf3: userInfo.name    || '',
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
      },
    };

    const { data } = await axios.post(PHONEPE_ORDER_URL, payload, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `O-Bearer ${token}`,
      },
      timeout: 15_000,
    });

    // Response: { orderId, state, expireAt, token }
    if (!data?.token || !data?.orderId) {
      logger.error('paymentService.createOrder — unexpected PhonePe response', { data });
      throw new AppError('Failed to create payment order. Please try again.', 502, 'PAYMENT_ORDER_FAILED');
    }

    const pMode = paymentModeOptions?.type === 'UPI_INTENT'
      ? { type: 'UPI_INTENT', targetApp: paymentModeOptions.targetApp }
      : { type: 'PAY_PAGE' };

    // Build the SDK payload (JSON stringified) for react-native-phonepe-pg startTransaction()
    // Per docs: { orderId, merchantId (clientId), token, paymentMode: { type: 'PAY_PAGE' } }
    const sdkPayload = JSON.stringify({
      orderId:     data.orderId,
      merchantId:  PHONEPE_CLIENT_ID,
      token:       data.token,
      paymentMode: pMode,
    });
    const base64SdkPayload = Buffer.from(sdkPayload).toString('base64');

    logger.info('paymentService.createOrder — order created', {
      orderId:         data.orderId,
      merchantOrderId: safeOrderId,
      amount:          amountInr,
    });

    return {
      transaction_id:  safeOrderId,       // used as merchant reference
      order_id:        data.orderId,       // PhonePe's orderId (OMO...)
      token:           data.token,
      base64_payload:  base64SdkPayload,   // passed to PhonePe SDK on mobile
      sdk_payload:     sdkPayload,         // raw JSON string for PhonePe SDK v2
      amount_paise:    Math.round(amountInr * 100),
      expires_at:      data.expireAt,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('paymentService.createOrder — error', {
      error: err?.response?.data || err.message,
    });
    throw new AppError('Failed to create payment order. Please try again.', 502, 'PAYMENT_ORDER_FAILED');
  }
}

/**
 * verifyPayment — checks the PhonePe order status via the v2 API.
 *
 * @param {string} merchantOrderId   The merchantOrderId used when creating the order
 * @returns {{ success: boolean, code: string, state: string, orderId: string }}
 */
async function verifyPayment(merchantOrderId) {
  try {
    const token = await getAuthToken();

    const safeOrderId = String(merchantOrderId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    const url = `${PHONEPE_STATUS_URL_BASE}/${safeOrderId}`;

    const { data } = await axios.get(url, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `O-Bearer ${token}`,
      },
      timeout: 10_000,
    });

    // state: PENDING | COMPLETED | FAILED
    const success = data?.state === 'COMPLETED';
    logger.info('paymentService.verifyPayment — status checked', {
      merchantOrderId: safeOrderId,
      state:           data?.state,
      orderId:         data?.orderId,
    });

    return {
      success,
      state:           data?.state   || 'UNKNOWN',
      code:            data?.state   || 'UNKNOWN', // backward compat alias
      orderId:         data?.orderId || safeOrderId,
      transactionId:   merchantOrderId,
      rawData:         data,
    };
  } catch (err) {
    logger.error('paymentService.verifyPayment — error', {
      error: err?.response?.data || err.message,
    });
    throw new AppError('Payment verification failed. Please contact support.', 502, 'PAYMENT_VERIFY_FAILED');
  }
}

/**
 * handlePaymentCaptured (webhook handler)
 * Called from the PhonePe webhook when payment is captured.
 */
async function handlePaymentCaptured({ transactionId, merchantTransactionId, amount, code, state }) {
  try {
    const isSuccess = code === 'PAYMENT_SUCCESS' || state === 'COMPLETED';
    logger.info('paymentService.handlePaymentCaptured', {
      transactionId,
      merchantTransactionId,
      amount,
      code,
      state,
    });

    if (!isSuccess) {
      logger.warn('paymentService.handlePaymentCaptured — payment not successful', { code, state });
      return;
    }

    // Try to find a subscription in pending_payment status linked to this transaction
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, rider_id, status')
      .eq('payment_order_id', merchantTransactionId)
      .eq('status', 'pending_payment')
      .limit(1);

    const sub = subs?.[0];
    if (!sub) {
      logger.warn('paymentService.handlePaymentCaptured — no pending_payment subscription found', {
        merchantTransactionId,
      });
      return;
    }

    // Activate subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status:     'active',
        payment_id: transactionId || merchantTransactionId,
      })
      .eq('id', sub.id);

    if (error) {
      logger.error('paymentService.handlePaymentCaptured — failed to activate subscription', {
        error,
        subId: sub.id,
      });
      return;
    }

    logger.info('paymentService.handlePaymentCaptured — subscription activated', {
      subId: sub.id,
      transactionId,
    });

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

// Keep generateChecksum exported for backward compat (webhooks.js might use it)
function generateChecksum() { return ''; }

module.exports = { createOrder, verifyPayment, handlePaymentCaptured, generateChecksum, getAuthToken };
