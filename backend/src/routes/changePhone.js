'use strict';

const { Router } = require('express');
const { z }      = require('zod');
const rateLimit  = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const otpService     = require('../services/otpService');
const supabase       = require('../config/supabase');
const jwtService     = require('../services/jwtService');
const logger         = require('../utils/logger');

const router = Router();

const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format');

const changePhoneLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: 'ERR_RATE_LIMIT', message: 'Too many attempts. Try again in 10 minutes.', details: {} },
    }),
});

/**
 * POST /auth/change-phone/send-otp
 * Body: { new_phone: "+91XXXXXXXXXX" }
 * Requires valid access token (rider only).
 * Sends OTP to the NEW phone number for verification.
 */
router.post(
  '/send-otp',
  authMiddleware,
  roleGuard('rider'),
  changePhoneLimiter,
  async (req, res, next) => {
    try {
      const { new_phone } = z.object({ new_phone: phoneSchema }).parse(req.body);

      // Check phone not already taken
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', new_phone)
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(409).json({
          error: { code: 'PHONE_ALREADY_IN_USE', message: 'This phone number is linked to another account.', details: {} },
        });
      }

      await otpService.sendOTP(new_phone);
      logger.info('change-phone: OTP sent', { userId: req.user.userId, new_phone });
      return res.status(200).json({ message: 'OTP sent to new number' });
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid phone number', details: err.flatten() } });
      }
      return next(err);
    }
  }
);

/**
 * POST /auth/change-phone/verify-otp
 * Body: { new_phone: "+91XXXXXXXXXX", otp: "123456" }
 * Verifies OTP and updates the phone in the users table.
 * Issues new tokens since the JWT sub still uses userId (not phone).
 */
router.post(
  '/verify-otp',
  authMiddleware,
  roleGuard('rider'),
  changePhoneLimiter,
  async (req, res, next) => {
    try {
      const { new_phone, otp } = z
        .object({ new_phone: phoneSchema, otp: z.string().length(6) })
        .parse(req.body);

      // Verify the OTP against the new phone number
      await otpService.verifyOTP(new_phone, otp);

      // Update phone
      const { data: user, error } = await supabase
        .from('users')
        .update({ phone: new_phone, updated_at: new Date().toISOString() })
        .eq('id', req.user.userId)
        .select('*')
        .single();

      if (error) throw error;

      // Issue fresh tokens (phone field in JWT payload updates)
      const { accessToken, refreshToken } = await jwtService.issueTokens(user.id, 'rider', new_phone);

      logger.info('change-phone: phone updated', { userId: user.id, new_phone });
      return res.status(200).json({ message: 'Phone number updated', user, accessToken, refreshToken });
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: err.flatten() } });
      }
      if (err.code && err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
      }
      return next(err);
    }
  }
);

module.exports = router;
