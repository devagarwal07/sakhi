'use strict';

/**
 * AppError — structured application error with HTTP status code and error code.
 * Thrown by services and caught by controllers or the global error handler.
 */
class AppError extends Error {
  /**
   * @param {string} message   Human-readable message
   * @param {number} statusCode HTTP status code (e.g. 400, 403, 404, 500)
   * @param {string} code       Machine-readable error code (e.g. 'MAPS_API_FAILED')
   * @param {object} [details]  Optional extra context
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = AppError;
