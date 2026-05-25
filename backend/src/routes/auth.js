'use strict';

const { Router } = require('express');
const rateLimit  = require('express-rate-limit');

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

/** 50 requests per 10 min per IP — OTP send */
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => DEV_BYPASS_PHONES.has(req.body?.phone ?? ''),
  handler: (_req, res) =>
    res.status(429).json({
      error: {
        code: 'ERR_RATE_LIMIT',
        message: 'Too many OTP requests. Try again in 10 minutes.',
        details: {},
      },
    }),
});

/** 100 attempts per 10 min keyed by phone — OTP verify */
const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.body?.phone || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => DEV_BYPASS_PHONES.has(req.body?.phone ?? ''),
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

/** POST /auth/send-otp */
router.post('/send-otp',   sendOtpLimiter,   authController.sendOtp);

/** POST /auth/verify-otp */
router.post('/verify-otp', verifyOtpLimiter, authController.verifyOtp);

/** POST /auth/refresh-token */
router.post('/refresh-token', authController.refreshToken);

/** POST /auth/logout — requires valid access token */
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
