'use strict';

const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

// ── In-memory map: ride_id → Set of socket IDs watching it ──────────────────
const _watchersMap = new Map();

/**
 * Register the /track namespace.
 * Public — no socketAuth middleware.
 * Viewers join with a JWT token (same one used in the share URL).
 */
function registerTrackSocket(io) {
  const trackNs = io.of('/track');

  // No auth middleware — this namespace is intentionally public.
  // Security is enforced by the signed JWT token below.
  trackNs.on('connection', (socket) => {
    logger.info('trackSocket — viewer connected', { socketId: socket.id });

    // ── track:join ────────────────────────────────────────────────────────────
    socket.on('track:join', ({ token } = {}) => {
      if (!token) {
        return socket.emit('error', { code: 'NO_TOKEN', message: 'Tracking token required.' });
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        return socket.emit('error', { code, message: 'Invalid or expired tracking link.' });
      }

      if (payload.type !== 'live_track') {
        return socket.emit('error', { code: 'INVALID_TOKEN', message: 'Not a live track token.' });
      }

      const { ride_id } = payload;

      // Join the track room for this ride
      const room = `track:${ride_id}`;
      socket.join(room);

      // Track watchers count
      if (!_watchersMap.has(ride_id)) _watchersMap.set(ride_id, new Set());
      _watchersMap.get(ride_id).add(socket.id);

      socket.data.ride_id = ride_id;

      socket.emit('track:joined', { ride_id });
      logger.info('trackSocket — viewer joined', { ride_id, socketId: socket.id });
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
