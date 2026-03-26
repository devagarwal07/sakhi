'use strict';

const crypto     = require('crypto');
const { Router } = require('express');
const kycService = require('../services/kycService');
const logger     = require('../utils/logger');
const { webhookLimiter } = require('../middleware/rateLimiter');

const router = Router();

// All webhook routes: 100 req/min per IP
router.use(webhookLimiter);

// ── HMAC: Signzy ──────────────────────────────────────────────────────────────
function validateSignzyHMAC(req, res, next) {
  const signature = req.headers['x-signzy-signature'];
  if (!signature) {
    return res.status(401).json({ error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Signzy-Signature header.' } });
  }

  const secret  = process.env.SIGNZY_WEBHOOK_SECRET || '';
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new Error('mismatch');
    }
  } catch {
    logger.warn('webhooks.signzy — HMAC validation failed', { signature });
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature validation failed.' } });
  }

  return next();
}

// ── HMAC: Razorpay ────────────────────────────────────────────────────────────
function validateRazorpayHMAC(req, res, next) {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(401).json({ error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Razorpay-Signature header.' } });
  }

  const secret   = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  // Use raw body (preserved before JSON parsing) for HMAC computation
  const rawBody  = req.rawBody;
  if (!rawBody) {
    logger.warn('webhooks.razorpay — rawBody not available; check rawBody middleware in app.js');
    return res.status(400).json({ error: { code: 'BODY_ERROR', message: 'Could not read raw body for HMAC.' } });
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new Error('mismatch');
    }
  } catch {
    logger.warn('webhooks.razorpay — HMAC validation failed', { signature });
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Razorpay webhook signature validation failed.' } });
  }

  return next();
}

// ── POST /webhooks/signzy ─────────────────────────────────────────────────────
router.post('/signzy', validateSignzyHMAC, async (req, res) => {
  try {
    const io = req.app.get('io');
    await kycService.handleSignzyWebhook(req.body, io);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('webhooks.signzy — handler error', { error: err.message });
    return res.status(200).json({ received: true }); // Always 200 to Signzy
  }
});

// ── POST /webhooks/razorpay ───────────────────────────────────────────────────
router.post('/razorpay', validateRazorpayHMAC, async (req, res) => {
  try {
    const event   = req.body?.event;
    const payload = req.body?.payload;

    logger.info('webhooks.razorpay — event received', { event });

    // Payment captured
    if (event === 'payment.captured') {
      const paymentId    = payload?.payment?.entity?.id;
      const orderId      = payload?.payment?.entity?.order_id;
      const amount       = payload?.payment?.entity?.amount; // paise
      const notes        = payload?.payment?.entity?.notes || {};

      // Lazy-load paymentService to avoid circular deps
      const paymentService = require('../services/paymentService');
      if (paymentService.handlePaymentCaptured) {
        await paymentService.handlePaymentCaptured({ paymentId, orderId, amount, notes }).catch((e) =>
          logger.error('webhooks.razorpay — handlePaymentCaptured error', { error: e.message })
        );
      }
    }

    // Subscription charged
    if (event === 'subscription.charged') {
      const subscriptionId = payload?.subscription?.entity?.id;
      const paymentId      = payload?.payment?.entity?.id;
      logger.info('webhooks.razorpay — subscription charged', { subscriptionId, paymentId });
      // Further handling can be added here
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('webhooks.razorpay — handler error', { error: err.message });
    return res.status(200).json({ received: true }); // Always 200 to Razorpay
  }
});

module.exports = router;
