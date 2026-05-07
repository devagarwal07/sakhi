'use strict';

// Load .env.local first (dev), fall back to .env (production)
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');

const app    = require('./app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : '*',
    methods:     ['GET', 'POST'],
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

// ─── Background workers ───────────────────────────────────────────────────────
const subScheduler      = require('./src/workers/SubscriptionRideScheduler');
const driverTimeout     = require('./src/workers/DriverTimeoutWorker');
const loyaltyWorker     = require('./src/workers/LoyaltyMilestoneWorker');
const leaderboardWorker = require('./src/workers/LeaderboardWorker');
const loyaltyTierWorker = require('./src/workers/LoyaltyTierWorker');

subScheduler.startScheduler(io);
driverTimeout.startDriverTimeoutWorker();
loyaltyWorker.startLoyaltyMilestoneWorker();
leaderboardWorker.startLeaderboardWorker();
loyaltyTierWorker.startLoyaltyTierWorker();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id} — ${reason}`);
  });
});

// ─── Start Listening ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`Sakhi backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// ─── Graceful Shutdown (SIGTERM / SIGINT) ─────────────────────────────────────
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`${signal} received — starting graceful shutdown`);

  // 1. Stop accepting new HTTP connections
  server.closeIdleConnections?.(); // Node ≥ 18.2

  // 1a. Close Redis
  try {
    const redis = require('./src/config/redis');
    await redis.quit();
    logger.info('shutdown — Redis disconnected');
  } catch (err) {
    logger.warn('shutdown — Redis disconnect error', { error: err.message });
  }

  // 2. Stop cron workers
  try {
    if (subScheduler.stopScheduler)   subScheduler.stopScheduler();
    if (driverTimeout.stopWorker)     driverTimeout.stopWorker();
    if (loyaltyWorker.stopWorker)     loyaltyWorker.stopWorker();
    if (leaderboardWorker.stopWorker) leaderboardWorker.stopWorker?.();
    if (loyaltyTierWorker.stopWorker) loyaltyTierWorker.stopWorker?.();
    logger.info('shutdown — cron workers stopped');
  } catch (err) {
    logger.warn('shutdown — worker stop error', { error: err.message });
  }

  // 3. Close Socket.IO (stops new connections; lets in-flight events drain)
  await new Promise((resolve) => {
    io.close(() => {
      logger.info('shutdown — Socket.IO closed');
      resolve();
    });
  });

  // 4. Close HTTP server (waits for in-flight requests, max 30s)
  const httpCloseTimeout = setTimeout(() => {
    logger.error('shutdown — HTTP server did not close in 30s; forcing exit');
    process.exit(1);
  }, 30_000);

  server.close(() => {
    clearTimeout(httpCloseTimeout);
    logger.info('shutdown — HTTP server closed cleanly');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Unhandled rejections — log and exit (PM2/K8s will restart) ───────────────
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason: String(reason) });
  shutdown('unhandledRejection').catch(() => process.exit(1));
});

module.exports = { server, io };
