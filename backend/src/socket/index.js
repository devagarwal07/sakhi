'use strict';

const socketAuth = require('../middleware/socketAuth');
const { registerRideSocket } = require('./rideSocket');
const { registerSosSocket } = require('./sosSocket');
const logger = require('../utils/logger');

/**
 * Main socket setup.
 * Called from server.js with the io instance.
 */
function setupSockets(io) {
  // Apply auth middleware to all namespaces
  const applyAuth = (ns) => ns.use(socketAuth);

  // Create and auth each namespace
  const ridesNs = io.of('/rides');
  const sosNs   = io.of('/sos');

  applyAuth(ridesNs);
  applyAuth(sosNs);

  // Register handlers
  registerRideSocket(io);
  registerSosSocket(io);

  logger.info('Socket.IO — namespaces registered: /rides, /sos');
}

module.exports = setupSockets;
