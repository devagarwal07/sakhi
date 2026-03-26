'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const errorHandler    = require('./src/middleware/errorHandler');
const requestLogger   = require('./src/middleware/requestLogger');
const logger          = require('./src/utils/logger');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production, ALLOWED_ORIGINS must be set (comma-separated).
// Credentials: false — we use Authorization header, not cookies.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no origin) and listed origins
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      logger.warn('CORS blocked', { origin });
      cb(new Error('Not allowed by CORS'));
    },
    methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:   ['Content-Type', 'Authorization'],
    credentials:      false,
  })
);

// ─── Raw Body capture (for webhook HMAC validation) ───────────────────────────
// Must be registered BEFORE express.json() so /webhooks/* capture req.rawBody.
app.use((req, _res, next) => {
  if (req.path.startsWith('/webhooks')) {
    let data = Buffer.alloc(0);
    req.on('data', (chunk) => { data = Buffer.concat([data, chunk]); });
    req.on('end', () => {
      req.rawBody = data.toString('utf8');
      // Manually parse JSON body for downstream handlers
      try {
        req.body = JSON.parse(req.rawBody);
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// ─── Body Parsing (non-webhook routes) ────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks')) return next(); // already parsed above
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks')) return next();
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Global Rate Limit (300 req / 15 min) ────────────────────────────────────
// Specific per-route limiters are in rateLimiter.js and applied per router.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'ERR_RATE_LIMIT', message: 'Too many requests — please try again later.', details: {} },
    });
  },
});
app.use(globalLimiter);

// ─── Health Check (Enhanced) ──────────────────────────────────────────────────
const { version } = require('./package.json');
const START_TIME  = Date.now();

app.get('/health', async (_req, res) => {
  const health = {
    status:          'ok',
    supabase:        'connected',
    fcm:             'ready',
    uptime_seconds:  Math.floor((Date.now() - START_TIME) / 1000),
    version:         version || '1.0.0',
    timestamp:       new Date().toISOString(),
  };

  // Supabase connectivity check
  try {
    const { error } = await require('./src/config/supabase').from('sync_meta').select('tab_name').limit(1);
    if (error) { health.supabase = 'error'; health.status = 'degraded'; }
  } catch {
    health.supabase = 'error';
    health.status   = 'degraded';
  }

  // FCM init check
  try {
    const admin = require('firebase-admin');
    health.fcm  = admin.apps.length ? 'ready' : 'not_initialized';
    if (health.fcm === 'not_initialized') health.status = 'degraded';
  } catch {
    health.fcm    = 'error';
    health.status = 'degraded';
  }

  return res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/auth',          require('./src/routes/auth'));
app.use('/auth/verify',   require('./src/routes/verification'));
app.use('/rides',         require('./src/routes/rides'));
app.use('/drivers',       require('./src/routes/drivers'));
app.use('/subscriptions', require('./src/routes/subscriptions'));
app.use('/payments',      require('./src/routes/payments'));
app.use('/safety',        require('./src/routes/safety'));
app.use('/webhooks',      require('./src/routes/webhooks'));
app.use('/admin',         require('./src/routes/admin'));

// ─── Public — live trip tracking (no auth) ────────────────────────────────────
const safetyController = require('./src/controllers/safetyController');
app.get('/track/:token', safetyController.getLiveTrack);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'ERR_NOT_FOUND', message: 'The requested resource was not found.', details: {} },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

logger.info('Express app configured');

module.exports = app;
