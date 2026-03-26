'use strict';

/**
 * FCM Service — Stub implementation.
 * Full implementation in Prompt 14.
 * Services call this now; it logs if Firebase is not yet configured.
 */

let messagingInstance = null;

function getMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SA_KEY || '{}');
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messagingInstance = admin.messaging();
    return messagingInstance;
  } catch (err) {
    return null;
  }
}

const logger = require('../utils/logger');
const supabase = require('../config/supabase');

/**
 * Send FCM notification to a single user or driver.
 * @param {string} userId
 * @param {'rider'|'driver'} role
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendToUser(userId, role, { title, body, data = {} }) {
  try {
    const table = role === 'rider' ? 'users' : 'drivers';
    const { data: rows } = await supabase.from(table).select('fcm_token').eq('id', userId).limit(1);
    const token = rows?.[0]?.fcm_token;

    if (!token) {
      logger.warn('fcmService.sendToUser — no FCM token', { userId, role });
      return { sent: false, reason: 'no_token' };
    }

    const messaging = getMessaging();
    if (!messaging) {
      logger.warn('fcmService.sendToUser — Firebase not initialized (stub mode)', { userId });
      return { sent: false, reason: 'not_initialized' };
    }

    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      token,
    };

    const messageId = await messaging.send(message);

    // Log to notifications_log
    await supabase.from('notifications_log').insert({
      user_id: userId,
      type: data.type || 'general',
      title,
      body,
    });

    return { sent: true, message_id: messageId };
  } catch (err) {
    // If token is invalid, clear it
    if (err.code === 'messaging/registration-token-not-registered') {
      const table = role === 'rider' ? 'users' : 'drivers';
      await supabase.from(table).update({ fcm_token: null }).eq('id', userId);
    }
    logger.error('fcmService.sendToUser — error', { userId, error: err.message });
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendToUser };
