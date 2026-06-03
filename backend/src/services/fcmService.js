'use strict';

/**
 * FCM Push Notification Service — Production implementation.
 * Wraps Firebase Admin SDK for single, multicast, and broadcast sends.
 * All failures are non-fatal — callers should .catch(() => {}) on most uses.
 */

const logger   = require('../utils/logger');
const supabase = require('../config/supabase');

// ── Firebase Admin SDK lazy initialisation ────────────────────────────────────
let _messaging = null;

function getMessaging() {
  if (_messaging) return _messaging;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SA_KEY;
      if (!raw) {
        logger.warn('fcmService — FIREBASE_SA_KEY not set; FCM disabled');
        return null;
      }
      
      let serviceAccount;
      try {
        if (raw.trim().startsWith('{')) {
          serviceAccount = JSON.parse(raw);
        } else {
          // Assume base64
          serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        }
      } catch (parseErr) {
        logger.error('fcmService — FIREBASE_SA_KEY parse failed.', { error: parseErr.message });
        return null;
      }
      
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    _messaging = admin.messaging();
    return _messaging;
  } catch (err) {
    logger.error('fcmService — Firebase init error', { error: err.message });
    return null;
  }
}

function isMessagingReady() {
  return Boolean(getMessaging());
}

// ── Internal: log to notifications_log (non-fatal) ────────────────────────────
async function _logNotification(userId, type, title, body) {
  await supabase.from('notifications_log').insert({
    user_id: userId,
    type:    type || 'general',
    title,
    body,
    read:    false,
  }).catch(() => {});
}

// ── Internal: clear an invalid FCM token ─────────────────────────────────────
async function _clearToken(userId, role) {
  const table = role === 'rider' ? 'users' : 'drivers';
  await supabase.from(table).update({ fcm_token: null }).eq('id', userId).catch(() => {});
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendToUser
// Send a push notification to a single user (rider or driver).
// ──────────────────────────────────────────────────────────────────────────────
async function sendToUser(userId, role, { title, body, data = {} }) {
  try {
    const table = role === 'rider' ? 'users' : 'drivers';
    const { data: rows } = await supabase
      .from(table)
      .select('fcm_token')
      .eq('id', userId)
      .limit(1);

    const token = rows?.[0]?.fcm_token;

    if (!token) {
      logger.warn('fcmService.sendToUser — no FCM token', { userId, role });
      return { sent: false, reason: 'no_token' };
    }

    const messaging = getMessaging();
    if (!messaging) return { sent: false, reason: 'not_initialized' };

    // FCM requires all data values to be strings.
    // IMPORTANT: We embed title/body into the data payload and OMIT the top-level
    // `notification` key. If `notification` is present, Android OS intercepts
    // the message and shows a plain banner BEFORE the JS handler runs, which
    // prevents our Notifee full-screen intent from ever being displayed.
    const stringData = Object.fromEntries(
      Object.entries({ type: '', notification_title: title, notification_body: body, ...data })
        .map(([k, v]) => [k, String(v)])
    );

    const message = {
      notification: { title, body },
      data: stringData,
      token,
      android: { priority: 'high' },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { 'content-available': 1 } },
      },
    };

    const messageId = await messaging.send(message);

    // Log success
    await _logNotification(userId, data.type, title, body);

    logger.info('fcmService.sendToUser — sent', { userId, role, type: data.type, messageId });
    return { sent: true, message_id: messageId };

  } catch (err) {
    // Clear stale / unregistered tokens
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      await _clearToken(userId, role);
      logger.warn('fcmService.sendToUser — cleared invalid token', { userId, role });
    } else {
      logger.error('fcmService.sendToUser — error', { userId, error: err.message, code: err.code });
    }
    return { sent: false, reason: err.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendToMultiple
// Send the same notification to many FCM tokens (batched, max 500 per chunk).
// ──────────────────────────────────────────────────────────────────────────────
async function sendToMultiple(tokens, { title, body, data = {} }) {
  if (!tokens?.length) return { success_count: 0, failure_count: 0 };

  const messaging = getMessaging();
  if (!messaging) return { success_count: 0, failure_count: tokens.length };

  const CHUNK_SIZE = 500; // FCM multicast limit
  let success_count = 0;
  let failure_count = 0;
  const invalidTokens = [];

  const stringData = Object.fromEntries(
    Object.entries({ type: '', notification_title: title, notification_body: body, ...data }).map(([k, v]) => [k, String(v)])
  );

  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: stringData,
        android: { priority: 'high' },
      });

      success_count += response.successCount;
      failure_count += response.failureCount;

      // Collect invalid tokens so callers can clean them
      if (response.failureCount > 0) {
        response.responses.forEach((r, idx) => {
          if (!r.success) {
            const code = r.error?.code;
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(chunk[idx]);
            }
          }
        });
      }
    } catch (err) {
      logger.error('fcmService.sendToMultiple — chunk error', { error: err.message });
      failure_count += chunk.length;
    }
  }

  // Nullify invalid tokens in DB (best-effort, non-fatal)
  if (invalidTokens.length) {
    await Promise.all([
      supabase.from('users').update({ fcm_token: null }).in('fcm_token', invalidTokens),
      supabase.from('drivers').update({ fcm_token: null }).in('fcm_token', invalidTokens),
    ]).catch(() => {});
    logger.warn('fcmService.sendToMultiple — cleared invalid tokens', { count: invalidTokens.length });
  }

  logger.info('fcmService.sendToMultiple — complete', { success_count, failure_count, total: tokens.length });
  return { success_count, failure_count };
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendRaw
// Send a push notification to a single, explicit FCM token (support/admin).
// ──────────────────────────────────────────────────────────────────────────────
async function sendRaw(token, { title, body, data = {} }) {
  if (!token) return { sent: false, reason: 'no_token' };

  const messaging = getMessaging();
  if (!messaging) return { sent: false, reason: 'not_initialized' };

  const stringData = Object.fromEntries(
    Object.entries({ type: '', ...data }).map(([k, v]) => [k, String(v)])
  );

  const message = {
    token,
    notification: { title, body },
    data: stringData,
  };

  const messageId = await messaging.send(message);
  logger.info('fcmService.sendRaw — sent', { messageId });
  return { sent: true, message_id: messageId };
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendAdminBroadcast
// Send a push notification to all active riders, all active drivers, or both.
// ──────────────────────────────────────────────────────────────────────────────
async function sendAdminBroadcast(target, { title, body, data = {} }) {
  const validTargets = ['all_riders', 'all_drivers', 'all'];
  if (!validTargets.includes(target)) {
    logger.warn('fcmService.sendAdminBroadcast — invalid target', { target });
    return { sent_count: 0, reason: 'invalid_target' };
  }

  const tokenSets = [];

  if (target === 'all_riders' || target === 'all') {
    const { data: riderRows } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('is_active', true)
      .not('fcm_token', 'is', null);
    tokenSets.push(...(riderRows || []).map((r) => r.fcm_token).filter(Boolean));
  }

  if (target === 'all_drivers' || target === 'all') {
    const { data: driverRows } = await supabase
      .from('drivers')
      .select('fcm_token')
      .eq('is_active', true)
      .not('fcm_token', 'is', null);
    tokenSets.push(...(driverRows || []).map((r) => r.fcm_token).filter(Boolean));
  }

  if (!tokenSets.length) {
    logger.warn('fcmService.sendAdminBroadcast — no tokens found', { target });
    return { sent_count: 0 };
  }

  const result = await sendToMultiple(tokenSets, { title, body, data });
  logger.info('fcmService.sendAdminBroadcast — complete', { target, ...result });
  return { sent_count: result.success_count, ...result };
}
// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendRideRequest
// Dedicated ride-request push with HEADS_UP / full-screen priority.
// Targets the 'ride_requests' Android channel (MAX importance) so the
// notification appears like Rapido/Uber even when the driver is off-app.
// ──────────────────────────────────────────────────────────────────────────────
async function sendRideRequest(driverId, { title, body, data = {} }) {
  try {
    const { data: rows } = await supabase
      .from('drivers')
      .select('fcm_token')
      .eq('id', driverId)
      .limit(1);

    const token = rows?.[0]?.fcm_token;
    if (!token) {
      logger.warn('fcmService.sendRideRequest - no FCM token', { driverId });
      return { sent: false, reason: 'no_token' };
    }

    const messaging = getMessaging();
    if (!messaging) return { sent: false, reason: 'not_initialized' };

    const stringData = Object.fromEntries(
      Object.entries({ 
        type: 'RIDE_REQUEST', 
        notification_title: title,
        notification_body: body,
        ...data 
      }).map(([k, v]) => [k, String(v)])
    );

    const message = {
      token,
      data: stringData,
      // ⚠️ Data-only message: The 'notification' key is purposefully OMITTED.
      // This forces the message to be delivered directly to the React Native background task
      // without the Android OS intercepting it to show a default Heads-Up banner.
      // The background task uses Notifee to present a true full-screen intent.

      // Android: Set high priority for background data delivery
      android: {
        priority: 'high',
      },

      // iOS: time-sensitive interruption level for immediate delivery
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            'content-available': 1,
            'interruption-level': 'time-sensitive',
          },
        },
      },
    };

    const messageId = await messaging.send(message);
    await _logNotification(driverId, 'RIDE_REQUEST', title, body);
    logger.info('fcmService.sendRideRequest - sent', { driverId, messageId });
    return { sent: true, message_id: messageId };

  } catch (err) {
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      await _clearToken(driverId, 'driver');
      logger.warn('fcmService.sendRideRequest - cleared invalid token', { driverId });
    } else {
      logger.error('fcmService.sendRideRequest - error', { driverId, error: err.message });
    }
    return { sent: false, reason: err.message };
  }
}

module.exports = { getMessaging, isMessagingReady, sendToUser, sendToMultiple, sendRaw, sendAdminBroadcast, sendRideRequest };