'use strict';

const socketAuth = require('../middleware/socketAuth');
const { registerRideSocket }  = require('./rideSocket');
const { registerSosSocket }   = require('./sosSocket');
const { registerTrackSocket } = require('./trackSocket');
const logger = require('../utils/logger');

/**
 * Main socket setup.
 * Called from server.js with the io instance.
 */
function setupSockets(io) {
  // Apply auth middleware to authenticated namespaces only
  const applyAuth = (ns) => ns.use(socketAuth);

  // Authenticated namespaces
  const ridesNs = io.of('/rides');
  const sosNs   = io.of('/sos');
  applyAuth(ridesNs);
  applyAuth(sosNs);

  // /track is intentionally public — NO auth middleware
  // Security is enforced by the signed JWT token inside the namespace handler.

  // Register handlers
  registerRideSocket(io);
  registerSosSocket(io);
  registerTrackSocket(io);   // public live-tracking namespace

  logger.info('Socket.IO — namespaces registered: /rides, /sos, /track');
}

module.exports = setupSockets;
