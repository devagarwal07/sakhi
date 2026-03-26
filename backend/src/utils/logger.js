'use strict';

const winston = require('winston');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

// ─── Custom Console Format ────────────────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return stack
    ? `[${ts}] ${level}: ${message}\n${stack}`
    : `[${ts}] ${level}: ${message}`;
});

// ─── Transports ───────────────────────────────────────────────────────────────
const transports = [
  // Console — colorised in dev, plain JSON in production
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), errors({ stack: true }), json())
      : combine(
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          consoleFormat
        ),
  }),

  // Persistent error log
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: combine(timestamp(), errors({ stack: true }), json()),
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
  }),

  // Combined log (all levels)
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: combine(timestamp(), errors({ stack: true }), json()),
    maxsize: 20 * 1024 * 1024, // 20 MB
    maxFiles: 10,
  }),
];

// ─── Logger Instance ──────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'sakhi-backend' },
  transports,
  exitOnError: false,
});

module.exports = logger;
