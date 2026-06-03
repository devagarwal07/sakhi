'use strict';

const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

// ── In-memory map: ride_id → Set of socket IDs watching it ──────────────────
const _watchersMap = new Map();

/**
 * Register the /track namespace.
 * Public — no socketAuth middleware.
 * Viewers join with a JWT token or a raw UUID.
 */
function registerTrackSocket(io) {
  const trackNs = io.of('/track');

  // No auth middleware — this namespace is intentionally public.
  // Security is enforced by unguessable UUIDs or signed JWT tokens.
  trackNs.on('connection', (socket) => {
    logger.info('trackSocket — viewer connected', { socketId: socket.id });

    // ── track:join ────────────────────────────────────────────────────────────
    socket.on('track:join', async ({ token } = {}) => {
      if (!token) {
        return socket.emit('error', { code: 'NO_TOKEN', message: 'Tracking token required.' });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let rideId = null;
      let isExpired = false;

      if (uuidRegex.test(token)) {
        // 1. Try to find in rides
        const { data: rideRows } = await supabase
          .from('rides')
          .select('id, created_at')
          .eq('id', token)
          .limit(1);

        if (rideRows && rideRows.length > 0) {
          rideId = rideRows[0].id;
          const createdAt = new Date(rideRows[0].created_at);
          if (Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
            isExpired = true;
          }
        } else {
          // 2. Try to find in sos_events
          const { data: sosRows } = await supabase
            .from('sos_events')
            .select('id, ride_id, created_at')
            .eq('id', token)
            .limit(1);

          if (sosRows && sosRows.length > 0) {
            rideId = sosRows[0].ride_id;
            const createdAt = new Date(sosRows[0].created_at);
            if (Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
              isExpired = true;
            }
          }
        }
      } else {
        // Try verifying as JWT
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          if (payload.type !== 'live_track') {
            return socket.emit('error', { code: 'INVALID_TOKEN', message: 'Not a live track token.' });
          }
          rideId = payload.ride_id;
          if (rideId && typeof rideId === 'string' && rideId.startsWith('sos:')) {
            const sosId = rideId.substring(4);
            rideId = null;
            const { data: sosRows } = await supabase
              .from('sos_events')
              .select('ride_id')
              .eq('id', sosId)
              .limit(1);
            if (sosRows && sosRows.length > 0) {
              rideId = sosRows[0].ride_id;
            }
          }
        } catch (err) {
          const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
          return socket.emit('error', { code, message: 'Invalid or expired tracking link.' });
        }
      }

      if (isExpired) {
        return socket.emit('error', { code: 'TOKEN_EXPIRED', message: 'This tracking link has expired.' });
      }

      if (!rideId) {
        // Fallback: if it was an SOS event outside a ride, use the token itself
        rideId = token;
      }

      // Join the track room for this ride
      const room = `track:${rideId}`;
      socket.join(room);

      // Track watchers count
      if (!_watchersMap.has(rideId)) _watchersMap.set(rideId, new Set());
      _watchersMap.get(rideId).add(socket.id);

      socket.data.ride_id = rideId;

      socket.emit('track:joined', { ride_id: rideId });
      logger.info('trackSocket — viewer joined', { rideId, socketId: socket.id });
    });

    socket.on('disconnect', () => {
      const rideId = socket.data?.ride_id;
      if (rideId && _watchersMap.has(rideId)) {
        _watchersMap.get(rideId).delete(socket.id);
        if (_watchersMap.get(rideId).size === 0) _watchersMap.delete(rideId);
      }
      logger.info('trackSocket — viewer disconnected', { socketId: socket.id });
    });
  });

  logger.info('trackSocket — /track namespace registered');
}

/**
 * Broadcast a driver location update to all public viewers watching a ride.
 * Called from rideSocket when driver:location_update fires.
 */
function broadcastToTrackers(io, rideId, locationPayload) {
  io.of('/track').to(`track:${rideId}`).emit('driver_location', locationPayload);
}

/**
 * Broadcast a ride status change to all public viewers.
 */
function broadcastStatusToTrackers(io, rideId, status) {
  io.of('/track').to(`track:${rideId}`).emit('ride_status_update', { status });
}

module.exports = { registerTrackSocket, broadcastToTrackers, broadcastStatusToTrackers };
