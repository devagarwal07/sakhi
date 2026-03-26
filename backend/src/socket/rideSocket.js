'use strict';

const axios = require('axios');
const supabase = require('../config/supabase');
const { registerChatEvents } = require('./chatSocket');
const logger = require('../utils/logger');

// ── Validate ride access ──────────────────────────────────────────────────────
async function getRideForSocket(rideId, userId, role) {
  const { data } = await supabase
    .from('rides')
    .select('id, rider_id, driver_id, status')
    .eq('id', rideId)
    .limit(1);
  const ride = data?.[0];
  if (!ride) return null;
  if (role === 'rider' && ride.rider_id !== userId) return null;
  if (role === 'driver' && ride.driver_id !== userId) return null;
  return ride;
}

// ── Battery-low SMS via MSG91 ─────────────────────────────────────────────────
async function notifyEmergencyContacts(userId, name, lat, lng) {
  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('phone')
    .eq('user_id', userId);

  if (!contacts?.length) return;

  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const smsText = `SAKHI ALERT: ${name || 'User'}'s phone battery is critically low. Last known location: ${mapsUrl}`;

  for (const contact of contacts) {
    try {
      await axios.post(
        'https://api.msg91.com/api/v5/sms',
        {
          sender: 'SAKHI',
          route: '4',
          mobiles: contact.phone,
          message: smsText,
        },
        { headers: { authkey: process.env.MSG91_AUTH_KEY }, timeout: 5000 }
      );
    } catch (err) {
      logger.warn('rideSocket.notifyEmergencyContacts — SMS failed', {
        phone: contact.phone,
        error: err.message,
      });
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Register rides namespace handlers
// ──────────────────────────────────────────────────────────────────────────────
function registerRideSocket(io) {
  const ridesNs = io.of('/rides');

  ridesNs.on('connection', async (socket) => {
    const { userId, role } = socket.data.user;
    logger.info('rideSocket — connected', { userId, role, socketId: socket.id });

    // Every driver/rider joins their own personal room for direct targeting
    if (role === 'driver') socket.join(`driver:${userId}`);
    if (role === 'rider') socket.join(`rider:${userId}`);
    if (role === 'admin') socket.join('admin:monitoring');

    // ── rider:join_ride ───────────────────────────────────────────────────────
    socket.on('rider:join_ride', async ({ ride_id }) => {
      if (!ride_id) return;
      const ride = await getRideForSocket(ride_id, userId, role);
      if (!ride) return socket.emit('error', { code: 'FORBIDDEN', message: 'Ride not accessible.' });
      socket.join(`ride:${ride_id}`);
      socket.emit('joined', { ride_id });
      logger.info('rideSocket — rider joined ride room', { userId, ride_id });
    });

    // ── driver:join_ride ──────────────────────────────────────────────────────
    socket.on('driver:join_ride', async ({ ride_id }) => {
      if (!ride_id) return;
      const ride = await getRideForSocket(ride_id, userId, role);
      if (!ride) return socket.emit('error', { code: 'FORBIDDEN', message: 'Ride not accessible.' });
      socket.join(`ride:${ride_id}`);
      socket.emit('joined', { ride_id });
      logger.info('rideSocket — driver joined ride room', { userId, ride_id });
    });

    // ── driver:location_update ────────────────────────────────────────────────
    socket.on('driver:location_update', async ({ ride_id, lat, lng, heading, speed }) => {
      if (!lat || !lng || role !== 'driver') return;

      // Upsert driver_locations
      await supabase.from('driver_locations').upsert(
        { driver_id: userId, lat, lng, heading: heading || 0, speed: speed || 0, updated_at: new Date().toISOString() },
        { onConflict: 'driver_id' }
      );

      // If on a ride, validate and broadcast
      if (ride_id) {
        const ride = await getRideForSocket(ride_id, userId, role);
        const activeStatuses = ['assigned', 'driver_en_route', 'arrived', 'in_progress'];
        if (ride && activeStatuses.includes(ride.status)) {
          socket.to(`ride:${ride_id}`).emit('driver_location', {
            lat,
            lng,
            heading:     heading || 0,
            eta_minutes: null, // TODO: calc from Maps Directions
            timestamp:   new Date().toISOString(),
          });
        }
      }
    });

    // ── driver:ping (keep-alive) ──────────────────────────────────────────────
    socket.on('driver:ping', async ({ lat, lng }) => {
      if (role !== 'driver' || !lat || !lng) return;
      await supabase.from('driver_locations').upsert(
        { driver_id: userId, lat, lng, updated_at: new Date().toISOString() },
        { onConflict: 'driver_id' }
      );
    });

    // ── battery_low ───────────────────────────────────────────────────────────
    socket.on('battery_low', async ({ level, lat, lng }) => {
      if (!lat || !lng) return;

      // Update last known location
      const table = role === 'rider' ? 'users' : 'drivers';
      await supabase.from(table).update({ last_known_lat: lat, last_known_lng: lng }).eq('id', userId);

      if (level <= 5) {
        // Fetch user name
        const { data: rows } = await supabase.from(table).select('name').eq('id', userId).limit(1);
        const name = rows?.[0]?.name;

        await notifyEmergencyContacts(userId, name, lat, lng);

        // Log in anomaly_alerts if on an active ride
        const { data: activeRide } = await supabase
          .from('rides')
          .select('id')
          .eq(role === 'rider' ? 'rider_id' : 'driver_id', userId)
          .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress'])
          .limit(1);

        if (activeRide?.[0]) {
          await supabase.from('anomaly_alerts').insert({
            ride_id:   activeRide[0].id,
            type:      'battery_low',
            triggered_at: new Date().toISOString(),
            lat,
            lng,
            details:   { level },
          }).catch(() => {});
        }

        logger.info('rideSocket — battery_low alert processed', { userId, role, level, lat, lng });
      }
    });

    // ── Chat events ───────────────────────────────────────────────────────────
    registerChatEvents(socket);

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info('rideSocket — disconnected', { userId, role, reason });

      if (role === 'driver') {
        const { data: activeRides } = await supabase
          .from('rides')
          .select('id, rider_id, status')
          .eq('driver_id', userId)
          .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress'])
          .limit(1);

        const activeRide = activeRides?.[0];

        if (!activeRide) {
          // No active ride — mark driver offline immediately
          await supabase.from('drivers').update({ is_online: false }).eq('id', userId);
        } else {
          // GAP 8 — Grace period: notify rider and give driver 30s to reconnect
          const riderRoom = `rider:${activeRide.rider_id}`;
          ridesNs.to(riderRoom).emit('driver_reconnecting', {
            ride_id:  activeRide.id,
            message:  "Your driver's connection was interrupted. Waiting for reconnect…",
            timeout_s: 30,
          });

          const gracePeriodMs = 30_000;
          const gracetHandle = setTimeout(async () => {
            // Check if driver has reconnected (any socket in their room)
            const driverSockets = await ridesNs.in(`driver:${userId}`).allSockets();
            if (driverSockets.size === 0) {
              // Driver still offline after grace period
              ridesNs.to(riderRoom).emit('driver_disconnected', {
                ride_id: activeRide.id,
                message: "Your driver is unreachable. Support has been notified.",
              });
              logger.warn('rideSocket — driver did not reconnect within grace period', {
                driverId: userId, rideId: activeRide.id,
              });
            }
          }, gracePeriodMs);

          // Store handle on socket to cancel if reconnect occurs before timeout
          socket._gracePeriodHandle = gracetHandle;
        }
      }
    });
  });
}

module.exports = { registerRideSocket };
