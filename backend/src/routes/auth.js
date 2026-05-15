'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// ── Rate limiters ──────────────────────────────────────────────────────────────

// Test/dev phone numbers that are NEVER rate-limited
const DEV_BYPASS_PHONES = new Set([
  '+919876543210',
  '+919876543211',
  '+919876543212',
]);

/** Skip rate-limiting entirely for known test driver numbers */
const skipIfDevPhone = (req, res, next) => {
  const phone = req.body?.phone ?? '';
  if (DEV_BYPASS_PHONES.has(phone)) return next();
  return next('route'); // fall through to rate-limited handler below
};

/** 50 requests per 10 minutes per IP — relaxed for demo/dev */
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: {
        code: 'ERR_RATE_LIMIT',
        message: 'Too many OTP requests. Try again in 10 minutes.',
        details: {},
      },
    }),
});

/** 50 attempts per 10 minutes keyed by phone — relaxed for demo/dev */
const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.body?.phone || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: {
        code: 'ERR_RATE_LIMIT',
        message: 'Too many OTP verify attempts. Try again in 10 minutes.',
        details: {},
      },
    }),
});

// ── Routes ─────────────────────────────────────────────────────────────────────

/** POST /auth/send-otp
 *  - Test phones → skip rate limiter entirely
 *  - All others  → 50 req / 10 min limit
 */
router.post('/send-otp', skipIfDevPhone, authController.sendOtp);
router.post('/send-otp', sendOtpLimiter, authController.sendOtp);

/** POST /auth/verify-otp
 *  - Test phones → skip rate limiter entirely
 *  - All others  → 50 req / 10 min limit
 */
router.post('/verify-otp', skipIfDevPhone, authController.verifyOtp);
router.post('/verify-otp', verifyOtpLimiter, authController.verifyOtp);

/** POST /auth/refresh-token */
router.post('/refresh-token', authController.refreshToken);

/** POST /auth/logout — requires valid access token */
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
