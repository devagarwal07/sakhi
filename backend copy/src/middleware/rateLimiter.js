'use strict';

/**
 * Centralised rate limiter factory.
 * Uses MemoryStore (no Redis required in dev).
 * Each named limiter is created once and reused.
 */

const rateLimit = require('express-rate-limit');

function makeRateLimiter({ windowMs, max, keyGenerator, message }) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req) => req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        error: { code: 'ERR_RATE_LIMIT', message: message || 'Too many requests. Try again later.', details: {} },
      }),
  });
}

// ── Token-based key (authenticated routes) ────────────────────────────────────
const byToken = (req) => req.user?.userId || req.ip;

// ── Named limiters ────────────────────────────────────────────────────────────

/** 5 req / 10 min per IP — send-otp */
const sendOtpLimiter = makeRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Try again in 10 minutes.',
});

/** 10 req / 10 min per phone — verify-otp */
const verifyOtpLimiter = makeRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: 'Too many OTP verify attempts. Try again in 10 minutes.',
});

/** 10 req / hour per token — SOS (critical safety, but anti-abuse) */
const sosLimiter = makeRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: byToken,
  message: 'SOS rate limit reached. Please call emergency services directly.',
});

/** 60 req / min per token — fare estimate (frequent polling) */
const estimateLimiter = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: byToken,
  message: 'Too many estimate requests. Slow down!',
});

/** 300 req / 15 min per token — general API routes */
const apiLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: byToken,
  message: 'Too many requests. Try again in 15 minutes.',
});

/** 500 req / 15 min per token — admin routes */
const adminLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: byToken,
  message: 'Too many admin requests.',
});

/** 100 req / min per IP — webhooks */
const webhookLimiter = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many webhook deliveries.',
});

module.exports = {
  sendOtpLimiter,
  verifyOtpLimiter,
  sosLimiter,
  estimateLimiter,
  apiLimiter,
  adminLimiter,
  webhookLimiter,
};
