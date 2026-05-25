'use strict';

const jwt      = require('jsonwebtoken');
const supabase  = require('../config/supabase');
const fcmService = require('./fcmService');
const AppError  = require('../utils/AppError');
const logger    = require('../utils/logger');
const smsService = require('./smsService');

let _io = null;

function setIO(io) { _io = io; }

// ──────────────────────────────────────────────────────────────────────────────
// triggerSOS
// ──────────────────────────────────────────────────────────────────────────────
async function triggerSOS(userId, role, rideId, lat, lng) {
  // 1. Insert SOS event
  const { data: sosRows, error: sosErr } = await supabase
    .from('sos_events')
    .insert({
      ride_id:      rideId,
      triggered_by: role,
      user_id:      userId,
      lat,
      lng,
    })
    .select('id')
    .single();

  if (sosErr) throw new AppError('Failed to create SOS event.', 500, 'SOS_CREATE_FAILED');

  const sosId = sosRows.id;

  // 2. Mark ride as SOS triggered
  if (rideId) {
    await supabase.from('rides').update({ sos_triggered: true }).eq('id', rideId);
  }

  // 3. Fetch user name + emergency contacts (riders: users + emergency_contacts; drivers: drivers + driver_emergency_contacts)
  const userTable = role === 'rider' ? 'users' : 'drivers';
  const [{ data: userRows }, contactsRes] = await Promise.all([
    supabase.from(userTable).select('name').eq('id', userId).limit(1),
    role === 'rider'
      ? supabase.from('emergency_contacts').select('phone, name').eq('user_id', userId).limit(3)
      : supabase.from('driver_emergency_contacts').select('phone, name').eq('driver_id', userId).limit(3),
  ]);
  const contacts = contactsRes.data || [];

  const userName = userRows?.[0]?.name || 'A Sakhi user';
  const baseUrl  = process.env.BASE_URL || 'https://sakhirides.in';

  // Generate a 24-hour live tracking token for the SOS event
  const trackToken = jwt.sign(
    { ride_id: rideId || `sos:${sosId}`, type: 'live_track' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  const trackUrl = `${baseUrl}/track/${trackToken}`;
  const mapsUrl  = `https://mappls.com/?q=${lat},${lng}`;

  // SOS SMS — uses the Sakhi live tracking page (falls back to Google Maps coords)
  const smsText  = `SAKHI MOBILITY Alert: ${userName} activated SOS during ride. Current location: ${lat},${lng} . Please track here: ${trackUrl}`;


  // 4. SMS all emergency contacts — non-fatal per contact
  const notifiedPhones = [];
  await Promise.all(
    contacts.map(async (c) => {
      try {
        const res = await smsService.sendSMS(c.phone, smsText, smsService.FORTIUS_TEMPLATES.SAKHI_EMERGENCY);
        if (res.sent) {
          notifiedPhones.push(c.phone);
        } else {
          logger.warn('sosService.triggerSOS — SMS not delivered', { phone: c.phone, reason: res.reason });
        }
      } catch (err) {
        logger.warn('sosService.triggerSOS — SMS error', { phone: c.phone, error: err.message });
      }
    })
  );

  // 5. Store contacts_notified in sos_events
  await supabase.from('sos_events').update({ contacts_notified: notifiedPhones }).eq('id', sosId);

  // 6 & 7. Emit to /sos admin room
  if (_io) {
    _io.of('/sos').to('admin:sos').emit('sos:new_alert', {
      sos_id: sosId, ride_id: rideId, user_id: userId, lat, lng, triggered_by: role,
    });
  }

  // 8. FCM to support team (if configured)
  const adminFcm = process.env.SUPPORT_FCM_TOKEN;
  if (adminFcm) {
    fcmService.sendRaw(adminFcm, {
      title: `🚨 SOS Alert from ${userName}`,
      body:  `Lat: ${lat}, Lng: ${lng}. Ride: ${rideId || 'N/A'}`,
      data:  { type: 'SOS_ALERT', sos_id: sosId, ride_id: rideId },
    }).catch(() => {});
  }

  logger.info('sosService.triggerSOS', { sosId, userId, role, rideId, contactsNotified: notifiedPhones.length });

  return {
    sos_id: sosId,
    support_chat_url: `/sos/${sosId}`,
    contacts_notified_count: notifiedPhones.length,
  };
}

// ── Battery-low SMS helper (used by REST fallback) ────────────────────────────
async function handleBatteryLow(userId, role, level, lat, lng) {
  const table = role === 'rider' ? 'users' : 'drivers';

  await supabase.from(table).update({ last_known_lat: lat, last_known_lng: lng }).eq('id', userId);

  if (level > 5) return { notified: false };

  const [{ data: userRows }, contactsRes] = await Promise.all([
    supabase.from(table).select('name').eq('id', userId).limit(1),
    role === 'rider'
      ? supabase.from('emergency_contacts').select('phone').eq('user_id', userId).limit(3)
      : supabase.from('driver_emergency_contacts').select('phone').eq('driver_id', userId).limit(3),
  ]);
  const contacts = contactsRes.data || [];

  const userName = userRows?.[0]?.name || 'A Sakhi user';
  const baseUrl  = process.env.BASE_URL || 'https://sakhirides.in';

  // Generate a 24-hour tracking link for battery-low alerts too
  const trackToken = jwt.sign(
    { ride_id: `battery:${userId}`, type: 'live_track' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  const trackUrl = `${baseUrl}/track/${trackToken}`;
  const smsText  = `SAKHI MOBILITY:${userName} is low on battery during ride. Please track here:${trackUrl}`;

  let notified = 0;
  await Promise.all(contacts.map(async (c) => {
    try {
      const res = await smsService.sendSMS(c.phone, smsText, smsService.FORTIUS_TEMPLATES.SAKHI_LOW_BATTERY);
      if (res.sent) notified++;
      else logger.warn('sosService.handleBatteryLow — SMS not delivered', { phone: c.phone, reason: res.reason });
    } catch { /* non-fatal */ }
  }));

  return { notified };
}

module.exports = { triggerSOS, handleBatteryLow, setIO };
