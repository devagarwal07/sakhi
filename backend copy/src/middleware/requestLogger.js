'use strict';

const logger = require('../utils/logger');

/**
 * HTTP request logger middleware.
 * Logs: method, path, status, duration_ms, userId (if authed), ip.
 * Does NOT log request bodies — they may contain OTPs or sensitive data.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId   = req.user?.userId || null;
    const ip       = req.ip || req.connection?.remoteAddress;

    const logFn = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[logFn]('HTTP', {
      method:      req.method,
      path:        req.path,
      status:      res.statusCode,
      duration_ms: duration,
      user_id:     userId,
      ip,
    });
  });

  next();
}

module.exports = requestLogger;
