'use strict';

require('dotenv').config();

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');

const app = require('./app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make `io` accessible in controllers via app locals
app.set('io', io);

// ─── Inject io into matching engine singleton ─────────────────────────────────
require('./src/services/matchingEngine').setIO(io);

// ─── Socket setup ─────────────────────────────────────────────────────────────
require('./src/socket/index')(io);

// ─── Inject io into service singletons ────────────────────────────────────────
require('./src/services/anomalyService').startGlobalAnomalyMonitor(io);
require('./src/services/sosService').setIO(io);

// ─── Subscription cron worker ──────────────────────────────────────────────────
require('./src/workers/SubscriptionRideScheduler').startScheduler(io);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id} — ${reason}`);
  });
});

// ─── Start Listening ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(
    `Sakhi backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
  );
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.warn(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { server, io };
