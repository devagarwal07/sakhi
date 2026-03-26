'use strict';

const { z } = require('zod');
const otpService = require('../services/otpService');
const jwtService = require('../services/jwtService');
const authService = require('../services/authService');
const logger = require('../utils/logger');
const { blockJti } = require('../middleware/authMiddleware');

// ── Zod Schemas ────────────────────────────────────────────────────────────────
const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format');

const sendOtpSchema = z.object({
  phone: phoneSchema,
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
  role: z.enum(['rider', 'driver']),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /auth/send-otp
 */
async function sendOtp(req, res, next) {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    await otpService.sendOTP(phone);
    return res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.flatten() },
      });
    }
    return next(err);
  }
}

/**
 * POST /auth/verify-otp
 */
async function verifyOtp(req, res, next) {
  try {
    const { phone, otp, role } = verifyOtpSchema.parse(req.body);

    // 1. Validate OTP
    await otpService.verifyOTP(phone, otp);

    // 2. Upsert user/driver
    let profile, isNewUser;
    if (role === 'rider') {
      ({ profile, isNewUser } = await authService.upsertRider(phone));
    } else {
      ({ profile, isNewUser } = await authService.upsertDriver(phone));
    }

    // 3. Issue tokens
    const { accessToken, refreshToken } = await jwtService.issueTokens(profile.id, role, phone);

    logger.info('Auth: verify-otp success', { phone, role, isNewUser });

    // 4. Return tokens + profile
    return res.status(200).json({
      accessToken,
      refreshToken,
      [role === 'rider' ? 'user' : 'driver']: profile,
      isNewUser,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.flatten() },
      });
    }
    // Propagate OTP error codes forward to errorHandler
    if (err.code && err.status) {
      return res.status(err.status).json({
        error: { code: err.code, message: err.message, details: {} },
      });
    }
    return next(err);
  }
}

/**
 * POST /auth/refresh-token
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = refreshSchema.parse(req.body);
    const tokens = await jwtService.refreshAccessToken(token);
    return res.status(200).json(tokens);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.flatten() },
      });
    }
    if (err.code && err.status) {
      return res.status(err.status).json({
        error: { code: err.code, message: err.message, details: {} },
      });
    }
    return next(err);
  }
}

/**
 * POST /auth/logout
 * Requires authMiddleware
 */
async function logout(req, res, next) {
  try {
    // Revoke all refresh tokens
    await jwtService.revokeAllTokens(req.user.userId);
    // Immediately block current access token's jti
    if (req.user.jti) {
      // Decode to get exp (we trust it since it already passed verify)
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(req.headers.authorization.slice(7));
      blockJti(req.user.jti, decoded?.exp || Math.floor(Date.now() / 1000) + 604800);
    }
    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { sendOtp, verifyOtp, refreshToken, logout };
