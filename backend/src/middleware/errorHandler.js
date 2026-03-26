'use strict';

const logger   = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Global Express error handler.
 * Must be registered LAST — after all routes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // ── Zod validation errors ─────────────────────────────────────────────────
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() },
    });
  }

  // ── AppError (our structured errors) ──────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { stack: err.stack, path: req.path });
    } else {
      logger.warn(`[${err.code}] ${err.message}`, { path: req.path, status: err.statusCode });
    }
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details || {} },
    });
  }

  // ── Generic / unexpected errors ───────────────────────────────────────────
  const status  = err.statusCode || err.status || 500;
  const code    = err.code || 'ERR_INTERNAL';
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'An unexpected error occurred.';

  if (status >= 500) {
    logger.error(`[${code}] ${err.message}`, { stack: err.stack, path: req.path });
  } else {
    logger.warn(`[${code}] ${err.message}`, { path: req.path, status });
  }

  return res.status(status).json({
    error: { code, message, details: err.details || {} },
  });
}

module.exports = errorHandler;
