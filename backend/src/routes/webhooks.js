'use strict';

const crypto = require('crypto');
const { Router } = require('express');
const kycService = require('../services/kycService');
const logger = require('../utils/logger');

const router = Router();

// ── HMAC validator ────────────────────────────────────────────────────────────
function validateSignzyHMAC(req, res, next) {
  const signature = req.headers['x-signzy-signature'];
  if (!signature) {
    return res.status(401).json({ error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Signzy-Signature header.' } });
  }

  const secret = process.env.SIGNZY_WEBHOOK_SECRET || '';
  const rawBody = JSON.stringify(req.body); // body already parsed by express.json()
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time compare
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new Error('mismatch');
    }
  } catch {
    logger.warn('webhooks.signzy — HMAC validation failed', { signature });
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature validation failed.' } });
  }

  return next();
}

/**
 * POST /webhooks/signzy
 * Public endpoint — validated by HMAC only.
 */
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

module.exports = router;
