'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) {
      logger.error('Redis — max reconnection attempts reached, giving up');
      return null; // stop retrying
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true, // don't connect until first command
});

redis.on('connect', () => logger.info('Redis — connected'));
redis.on('error', (err) => logger.error('Redis — connection error', { error: err.message }));

// Eagerly attempt connection at startup (non-blocking)
redis.connect().catch((err) => {
  logger.warn('Redis — initial connect failed (OTP will fallback to Supabase)', { error: err.message });
});

module.exports = redis;
