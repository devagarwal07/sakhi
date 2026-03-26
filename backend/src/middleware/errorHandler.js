'use strict';

const logger = require('../utils/logger');

/**
 * HTTP status map keyed by error code prefix.
 * Codes not found here default to 500.
 */
const STATUS_MAP = {
  ERR_VALIDATION: 422,
  ERR_BAD_REQUEST: 400,
  ERR_UNAUTHORIZED: 401,
  ERR_FORBIDDEN: 403,
  ERR_NOT_FOUND: 404,
  ERR_CONFLICT: 409,
  ERR_RATE_LIMIT: 429,
  ERR_UNPROCESSABLE: 422,
  ERR_INTERNAL: 500,
};

/**
 * Resolve HTTP status code from a structured error code string.
 * Falls back to the error's own `status` property, then 500.
 *
 * @param {Error} err
 * @returns {number}
 */
function resolveStatus(err) {
  if (err.code && STATUS_MAP[err.code]) return STATUS_MAP[err.code];

  // Walk all keys looking for a prefix match (e.g. ERR_VALIDATION_PHONE)
  if (err.code) {
    const matched = Object.keys(STATUS_MAP).find((k) =>
      err.code.startsWith(k)
    );
    if (matched) return STATUS_MAP[matched];
  }

  return err.status || err.statusCode || 500;
}

/**
 * Global Express error handler.
 * Must be registered LAST — after all routes.
 *
 * Usage (in a controller):
 *   const err = new Error('Phone number already registered');
 *   err.code = 'ERR_CONFLICT';
 *   err.details = { field: 'phone' };
 *   next(err);
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = resolveStatus(err);
  const code = err.code || 'ERR_INTERNAL';
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.';
  const details = err.details || {};

  // Log at appropriate level
  if (status >= 500) {
    logger.error(`[${code}] ${err.message}`, { stack: err.stack, path: req.path });
  } else {
    logger.warn(`[${code}] ${err.message}`, { path: req.path, status });
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = errorHandler;
