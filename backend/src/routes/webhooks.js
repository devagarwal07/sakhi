'use strict';

const crypto = require('crypto');
const querystring = require('querystring');
const { Router } = require('express');
const kycService = require('../services/kycService');
const logger = require('../utils/logger');
const { webhookLimiter } = require('../middleware/rateLimiter');

const router = Router();

// All webhook routes: 100 req/min per IP
router.use(webhookLimiter);

// ── POST /webhooks/exotel ────────────────────────────────────────────────────
// Exotel may POST either JSON or x-www-form-urlencoded. We capture rawBody in
// app.js; parse best-effort and always return 200 so call flows aren't blocked.
router.post('/exotel', (req, res) => {
  try {
    const raw = req.rawBody || '';
    let payload = req.body || {};
    if (
      (!payload || Object.keys(payload).length === 0) &&
      typeof raw === 'string' &&
      raw.includes('=')
    ) {
      payload = querystring.parse(raw);
    }

    // Avoid logging full payload (can contain phone numbers). Keep it minimal.
    logger.info('webhooks.exotel — received', {
      keys: Object.keys(payload || {}),
      callSid: payload?.CallSid || payload?.CallSid?.[0] || payload?.CallSid?.Sid,
      status: payload?.Status || payload?.CallStatus || payload?.CallStatus?.[0],
    });
  } catch (err) {
    logger.warn('webhooks.exotel — handler error', { error: err.message });
  }
  return res.status(200).json({ received: true });
});

// ── HMAC: Signzy ──────────────────────────────────────────────────────────────
function validateSignzyHMAC(req, res, next) {
  const signature = req.headers['x-signzy-signature'];
  if (!signature) {
    return res.status(401).json({ error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Signzy-Signature header.' } });
  }

  const secret = process.env.SIGNZY_WEBHOOK_SECRET || '';
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

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  // Use raw body (preserved before JSON parsing) for HMAC computation
  const rawBody = req.rawBody;
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

// ── GET /webhooks/signzy/digilocker-callback ──────────────────────────────────
// DigiLocker redirects back here after the driver grants Aadhaar consent.
// The URL is passed as `successRedirectUrl` / `failureRedirectUrl` in create-url.
// Query params: requestId (echoed), status (if failure route used)
// The driver app's WebView watches for this URL to close and proceed.
router.get('/signzy/digilocker-callback', async (req, res) => {
  try {
    const { requestId, status } = req.query;
    const success = status !== 'failed';
    logger.info('webhooks.digilocker-callback — consent completed', { requestId, success });

    if (requestId) {
      // Mark consent timestamp on the driver record (non-fatal)
      const supabase = require('../config/supabase');
      await supabase
        .from('drivers')
        .update({ digilocker_consent_at: new Date().toISOString() })
        .eq('signzy_request_id', requestId)
        .catch((e) => logger.warn('digilocker-callback — DB update failed', { error: e.message }));
    }

    const icon = success ? '✅' : '❌';
    const heading = success ? 'Aadhaar Linked!' : 'Authorisation Failed';
    const body = success
      ? 'Your DigiLocker Aadhaar has been authorised.<br/>You can close this window to continue.'
      : 'The DigiLocker authorisation was not completed.<br/>Please return to the app and try again.';

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${heading}</title>
          <style>
            body { font-family: -apple-system, sans-serif; display:flex; flex-direction:column;
              align-items:center; justify-content:center; min-height:100vh; margin:0;
              background:#F5F0FF; color:#1E1B2E; text-align:center; padding:24px; }
            .icon { font-size:64px; margin-bottom:24px; }
            h1 { font-size:24px; font-weight:700; margin:0 0 12px; }
            p { color:#6B7280; font-size:15px; line-height:1.6; }
          </style>
        </head>
        <body>
          <div class="icon">${icon}</div>
          <h1>${heading}</h1>
          <p>${body}</p>
        </body>
      </html>
    `);
  } catch (err) {
    logger.error('webhooks.digilocker-callback — error', { error: err.message });
    return res.status(200).send('<p>Verification complete. Please return to the app.</p>');
  }
});

// ── POST /webhooks/signzy/digilocker-match-callback ───────────────────────────
// Signzy calls this endpoint asynchronously after the driver completes consent.
// Receives match scores comparing the driver's pre-filled data vs Aadhaar data.
//
// Body (from Signzy):
//   { event, requestId, status, message, timestamp, internalId,
//     nameMatchScore, dobMatch, faceMatchScore, pincodeMatch }
//
// `internalId` is set to the driver's UUID in create-url, enabling fast DB lookup.
// Falls back to requestId-based lookup if internalId is absent/invalid.
router.post('/signzy/digilocker-match-callback', async (req, res) => {
  // Always respond 200 immediately – Signzy does not retry
  res.status(200).json({ received: true });

  try {
    const {
      event,
      requestId,
      status,
      message,
      internalId,
      nameMatchScore,
      dobMatch,
      faceMatchScore,
      pincodeMatch,
    } = req.body ?? {};

    logger.info('webhooks.digilocker-match-callback — received', {
      event, requestId, status, internalId,
      nameMatchScore, dobMatch, faceMatchScore, pincodeMatch,
    });

    if (status !== 'success' && event !== 'consentComplete') {
      logger.warn('webhooks.digilocker-match-callback — non-success event', { event, status, message });
      return;
    }

    const supabase = require('../config/supabase');
    const updates = {
      digilocker_consent_at: new Date().toISOString(),
    };

    // Persist match scores
    if (nameMatchScore !== undefined) updates.digilocker_name_match_score = nameMatchScore;
    if (dobMatch !== undefined) updates.digilocker_dob_match = dobMatch === true || dobMatch === 'true';
    if (faceMatchScore !== undefined) updates.digilocker_face_match_score = String(faceMatchScore);
    if (pincodeMatch !== undefined) updates.digilocker_pincode_match = pincodeMatch === true || pincodeMatch === 'true';

    // Prefer internalId (= driverId UUID) for lookup — fast and unambiguous
    const isValidUuid = internalId && /^[0-9a-f-]{36}$/i.test(internalId);
    if (isValidUuid) {
      const { error } = await supabase.from('drivers').update(updates).eq('id', internalId);
      if (error) logger.warn('digilocker-match-callback — update by internalId failed', { error: error.message });
      else logger.info('digilocker-match-callback — scores persisted', { driverId: internalId });
    } else if (requestId) {
      const { error } = await supabase.from('drivers').update(updates).eq('signzy_request_id', requestId);
      if (error) logger.warn('digilocker-match-callback — update by requestId failed', { error: error.message });
      else logger.info('digilocker-match-callback — scores persisted by requestId', { requestId });
    }
  } catch (err) {
    logger.error('webhooks.digilocker-match-callback — handler error', { error: err.message });
  }
});

// ── POST /webhooks/razorpay ───────────────────────────────────────────────────
router.post('/razorpay', validateRazorpayHMAC, async (req, res) => {
  try {
    const event = req.body?.event;
    const payload = req.body?.payload;

    logger.info('webhooks.razorpay — event received', { event });

    // Payment captured
    if (event === 'payment.captured') {
      const paymentId = payload?.payment?.entity?.id;
      const orderId = payload?.payment?.entity?.order_id;
      const amount = payload?.payment?.entity?.amount; // paise
      const notes = payload?.payment?.entity?.notes || {};

      const paymentService = require('../services/paymentService');
      const supabase = require('../config/supabase');
      const io = req.app.get('io');

      // ── 1. Check if this order belongs to a RIDE ─────────────────────────
      const { data: rides } = await supabase
        .from('rides')
        .select('id, driver_id, rider_id, payment_status')
        .eq('razorpay_order_id', orderId)
        .limit(1);

      const ride = rides?.[0];
      if (ride && ride.payment_status !== 'paid') {
        await supabase.from('rides').update({
          payment_status: 'paid',
          razorpay_payment_id: paymentId,
        }).eq('id', ride.id);

        // Notify driver via socket
        if (io && ride.driver_id) {
          io.of('/rides').to(`driver:${ride.driver_id}`).emit('payment:success', { ride_id: ride.id });
        }

        logger.info('webhooks.razorpay — ride payment captured', { rideId: ride.id, paymentId });
      } else {
        // ── 2. Otherwise handle as subscription payment ─────────────────────
        if (paymentService.handlePaymentCaptured) {
          await paymentService.handlePaymentCaptured({ paymentId, orderId, amount, notes }).catch((e) =>
            logger.error('webhooks.razorpay — handlePaymentCaptured error', { error: e.message })
          );
        }
      }
    }

    // Subscription charged
    if (event === 'subscription.charged') {
      const subscriptionId = payload?.subscription?.entity?.id;
      const paymentId = payload?.payment?.entity?.id;
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
