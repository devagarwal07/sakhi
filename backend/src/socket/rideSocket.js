'use strict';

const supabase = require('../config/supabase');
const smsService = require('../services/smsService');
const sosService  = require('../services/sosService');
const { registerChatEvents } = require('./chatSocket');
const matchingEngine = require('../services/matchingEngine');
const { broadcastToTrackers, broadcastStatusToTrackers } = require('./trackSocket');
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

// ── Battery-low SMS via Fortius ─────────────────────────────────────────────────
async function notifyEmergencyContacts(userId, name, lat, lng) {
  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('phone')
    .eq('user_id', userId);

  if (!contacts?.length) return;

  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const smsText = `SAKHI MOBILITY:${name || 'User'} is low on battery during ride. Please track here:${mapsUrl}`;

  for (const contact of contacts) {
    try {
      await smsService.sendSMS(contact.phone, smsText, smsService.FORTIUS_TEMPLATES.SAKHI_LOW_BATTERY);
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

    // ── ride:accept — driver accepts a ride request ───────────────────────────
    // This is the PRIMARY accept path used by the driver app via Socket.IO.
    // The REST POST /rides/:id/accept is a fallback for HTTP-only flows.
    socket.on('ride:accept', async ({ ride_id } = {}, ack) => {
      if (role !== 'driver' || !ride_id) {
        if (typeof ack === 'function') ack({ success: false, message: 'Invalid request.' });
        return;
      }
      try {
        await matchingEngine.handleDriverAccept(ride_id, userId);
        if (typeof ack === 'function') ack({ success: true });
        logger.info('rideSocket — ride:accept processed', { ride_id, driverId: userId });
      } catch (err) {
        logger.error('rideSocket — ride:accept error', { ride_id, driverId: userId, error: err.message });
        if (typeof ack === 'function') ack({ success: false, message: err.message });
      }
    });

    // ── ride:reject — driver rejects / skips a ride request ──────────────────
    socket.on('ride:reject', async ({ ride_id } = {}) => {
      if (role !== 'driver' || !ride_id) return;
      try {
        await matchingEngine.handleDriverReject(ride_id, userId);
        logger.info('rideSocket — ride:reject processed', { ride_id, driverId: userId });
      } catch (err) {
        logger.error('rideSocket — ride:reject error', { ride_id, driverId: userId, error: err.message });
      }
    });

    // ── ride:snooze — driver taps "See Later" on a subscription request ────────
    // Treat as a reject for the matching engine (dispatch to next driver immediately).
    // The driver app keeps a local copy in pendingSubRequests for the offline reminder.
    socket.on('ride:snooze', async ({ ride_id } = {}) => {
      if (role !== 'driver' || !ride_id) return;
      try {
        await matchingEngine.handleDriverReject(ride_id, userId);
        logger.info('rideSocket — ride:snooze (re-dispatching)', { ride_id, driverId: userId });
      } catch (err) {
        logger.error('rideSocket — ride:snooze error', { ride_id, driverId: userId, error: err.message });
      }
    });

    // ── ride:complete — driver signals trip completion (supplements REST PATCH) ─
    // The driver app already calls patchRideStatus('completed') via REST which
    // does the DB update. This socket event forwards a real-time signal to the
    // rider room so the customer app gets instant feedback without polling.
    socket.on('ride:complete', async ({ ride_id } = {}) => {
      if (role !== 'driver' || !ride_id) return;
      try {
        // Verify driver owns this ride
        const { data: rides } = await supabase
          .from('rides')
          .select('id, rider_id, status')
          .eq('id', ride_id)
          .eq('driver_id', userId)
          .limit(1);
        const ride = rides?.[0];
        if (!ride) return;
        // Forward completion signal to rider room
        ridesNs.to(`rider:${ride.rider_id}`).emit('ride_completed', {
          ride_id,
          message: 'Your trip is complete!',
        });
        // Notify public track viewers that the ride is done
        broadcastStatusToTrackers(io, ride_id, 'completed');
        logger.info('rideSocket — ride:complete forwarded to rider', { ride_id, driverId: userId });
      } catch (err) {
        logger.error('rideSocket — ride:complete error', { ride_id, error: err.message });
      }
    });


    // ── driver:location_update ────────────────────────────────────────────────
    socket.on('driver:location_update', async ({ ride_id, lat, lng, heading, speed }) => {
      // Explicit null/undefined check — lat=0 or lng=0 (equator/prime meridian) must still pass
      if (lat == null || lng == null || role !== 'driver') return;

      // Upsert driver_locations
      await supabase.from('driver_locations').upsert(
        { driver_id: userId, lat, lng, heading: heading || 0, speed: speed || 0, updated_at: new Date().toISOString() },
        { onConflict: 'driver_id' }
      );

      // If on a ride, validate and broadcast to rider
      if (ride_id) {
        const ride = await getRideForSocket(ride_id, userId, role);
        const activeStatuses = ['assigned', 'driver_en_route', 'arrived', 'in_progress'];
        if (ride && activeStatuses.includes(ride.status)) {
          socket.to(`ride:${ride_id}`).emit('driver_location', {
            lat,
            lng,
            heading:     heading || 0,
            eta_minutes: null,
            timestamp:   new Date().toISOString(),
          });

          // ── Broadcast to public track viewers (share-link contacts) ─────────
          broadcastToTrackers(io, ride_id, {
            lat,
            lng,
            heading:   heading || 0,
            timestamp: new Date().toISOString(),
          });

          // ── SCENARIO 1: Pre-Dispatch Trigger ─────────────────────────────
          // While driver is in_progress, measure distance to their dropoff.
          // When within PRE_DISPATCH_THRESHOLD_KM (~1.7 km = ~5 min remaining),
          // emit `pre_dispatch_eligible` to the driver app so it prepares the
          // "Next Ride" UI. The matching engine independently decides whether
          // to send an actual request based on availability.
          if (ride.status === 'in_progress') {
            try {
              const { data: rideDetail } = await supabase
                .from('rides')
                .select('drop_lat, drop_lng')
                .eq('id', ride_id)
                .limit(1);

              if (rideDetail?.[0]) {
                const { drop_lat, drop_lng } = rideDetail[0];
                const PRE_DISPATCH_THRESHOLD_KM = 1.7;
                const R = 6371;
                const toRad = (d) => (d * Math.PI) / 180;
                const dLat = toRad(drop_lat - lat);
                const dLng = toRad(drop_lng - lng);
                const a =
                  Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat)) * Math.cos(toRad(drop_lat)) *
                  Math.sin(dLng / 2) ** 2;
                const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                if (distKm <= PRE_DISPATCH_THRESHOLD_KM) {
                  // Notify driver app that it's eligible to receive next request
                  socket.emit('pre_dispatch_eligible', {
                    ride_id,
                    dist_to_dropoff_km: parseFloat(distKm.toFixed(2)),
                    eta_min: Math.round((distKm / 20) * 60),
                    message: 'Prepare for next ride — you are almost at the drop-off.',
                  });
                }
              }
            } catch (preDispatchErr) {
              // Non-fatal — log only
              logger.warn('rideSocket — pre-dispatch trigger error', { error: preDispatchErr.message });
            }
          }
        }
      }
    });

    // ── driver:ping (keep-alive) ──────────────────────────────────────────────
    socket.on('driver:ping', async ({ lat, lng }) => {
      if (role !== 'driver' || lat == null || lng == null) return;
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
          const graceHandle = setTimeout(async () => {
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
          socket._graceHandle = graceHandle;
        }
      }
    });
  });
}

module.exports = { registerRideSocket };
