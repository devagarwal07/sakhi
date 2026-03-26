'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Global Rate Limit (300 req / 15 min) ────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'ERR_RATE_LIMIT',
        message: 'Too many requests — please try again later.',
        details: {},
      },
    });
  },
});
app.use(globalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/auth',          require('./src/routes/auth'));
app.use('/auth/verify',   require('./src/routes/verification'));
app.use('/rides',         require('./src/routes/rides'));
app.use('/drivers',       require('./src/routes/drivers'));
app.use('/subscriptions', require('./src/routes/subscriptions'));
app.use('/payments',      require('./src/routes/payments'));
app.use('/webhooks',      require('./src/routes/webhooks'));
app.use('/admin',         require('./src/routes/admin'));
// app.use('/safety',     require('./src/routes/safety'));
// app.use('/users',      require('./src/routes/users'));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'ERR_NOT_FOUND',
      message: 'The requested resource was not found.',
      details: {},
    },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

logger.info('Express app configured');

module.exports = app;
