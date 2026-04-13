'use strict';

const axios = require('axios');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

// ── Google Translate helper ───────────────────────────────────────────────────
async function translateMessage(text) {
  const key = process.env.GOOGLE_MAPS_KEY; // reuse same API key project
  if (!key) return { message_en: text, message_kn: null };

  const result = { message_en: null, message_kn: null };

  try {
    // 1. Detect language
    const detectRes = await axios.post(
      `https://translation.googleapis.com/language/translate/v2/detect`,
      { q: text },
      { params: { key }, timeout: 5000 }
    );
    const detectedLang = detectRes.data?.data?.detections?.[0]?.[0]?.language;

    const targetLang = detectedLang === 'kn' ? 'en' : 'kn';

    // 2. Translate
    const translateRes = await axios.post(
      `https://translation.googleapis.com/language/translate/v2`,
      { q: text, target: targetLang, format: 'text' },
      { params: { key }, timeout: 5000 }
    );
    const translated = translateRes.data?.data?.translations?.[0]?.translatedText;

    if (detectedLang === 'kn') {
      result.message_kn = text;
      result.message_en = translated || null;
    } else {
      result.message_en = text;
      result.message_kn = translated || null;
    }
  } catch (err) {
    logger.warn('chatSocket.translateMessage — failed', { error: err.message });
    result.message_en = text;
    result.message_kn = null;
  }

  return result;
}

// ── Validate caller is on the ride ───────────────────────────────────────────
async function validateRideAccess(rideId, userId, role) {
  const { data } = await supabase
    .from('rides')
    .select('rider_id, driver_id, status')
    .eq('id', rideId)
    .limit(1);
  const ride = data?.[0];
  if (!ride) return null;
  if (role === 'rider' && ride.rider_id !== userId) return null;
  if (role === 'driver' && ride.driver_id !== userId) return null;
  return ride;
}

// ──────────────────────────────────────────────────────────────────────────────
// registerChatEvents — called from rideSocket for 'chat:send'
// ──────────────────────────────────────────────────────────────────────────────
function registerChatEvents(socket) {
  socket.on('chat:send', async (data) => {
    try {
      const { ride_id, message } = data || {};
      const { userId, role } = socket.data.user;

      if (!ride_id || !message?.trim()) return;

      const ride = await validateRideAccess(ride_id, userId, role);
      if (!ride) return socket.emit('chat:error', { code: 'FORBIDDEN', message: 'You are not on this ride.' });

      const { message_en, message_kn } = await translateMessage(message.trim());

      const { data: inserted } = await supabase
        .from('ride_chat_messages')
        .insert({
          ride_id,
          sender_id:   userId,
          sender_role: role,
          message_en,
          message_kn,
        })
        .select('id, sent_at')
        .single();

      const payload = {
        sender_role: role,
        message_en,
        message_kn,
        sent_at: inserted?.sent_at || new Date().toISOString(),
      };

      socket.to(`ride:${ride_id}`).emit('chat:message', payload);
      socket.emit('chat:message', payload); // echo to sender
    } catch (err) {
      logger.error('chatSocket.chat:send — error', { error: err.message });
    }
  });
}

module.exports = { registerChatEvents };
