'use strict';

const axios = require('axios');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

// ── Google Translate helper ───────────────────────────────────────────────────
async function translateMessage(text) {
  // Translation is disabled as Google APIs have been removed
  // If translation is needed in the future, integrate Mappls translation (if available) or an alternative.
  return { message_en: text, message_kn: null };
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
      const { ride_id, rideId, message } = data || {};
      const normalizedRideId = ride_id || rideId;
      const { userId, role } = socket.data.user;

      if (!normalizedRideId || !message?.trim()) return;

      const ride = await validateRideAccess(normalizedRideId, userId, role);
      if (!ride) return socket.emit('chat:error', { code: 'FORBIDDEN', message: 'You are not on this ride.' });

      const { message_en, message_kn } = await translateMessage(message.trim());

      const { data: inserted } = await supabase
        .from('ride_chat_messages')
        .insert({
          ride_id: normalizedRideId,
          sender_id: userId,
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

      socket.to(`ride:${normalizedRideId}`).emit('chat:message', payload);
      socket.emit('chat:message', payload); // echo to sender
    } catch (err) {
      logger.error('chatSocket.chat:send — error', { error: err.message });
    }
  });
}

module.exports = { registerChatEvents };
