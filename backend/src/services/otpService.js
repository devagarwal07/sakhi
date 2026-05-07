'use strict';

const crypto   = require('crypto');
const axios    = require('axios');
const redis    = require('../config/redis');
const supabase = require('../config/supabase');
const logger   = require('../utils/logger');

// ── Configuration ──────────────────────────────────────────────────────────────
const OTP_TTL_SECONDS = 300;                           // 5 minutes
const OTP_KEY_PREFIX  = 'otp:';                        // Redis key prefix
const DEV_BYPASS_CODE = process.env.OTP_BYPASS_CODE;   // e.g. "123456"
const IS_DEV          = process.env.NODE_ENV !== 'production';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Check if Redis is connected and usable */
function isRedisReady() {
  return redis.status === 'ready';
}

/** Redis key for a phone number */
function otpKey(phone) {
  return `${OTP_KEY_PREFIX}${phone}`;
}

// ── Store OTP ──────────────────────────────────────────────────────────────────

async function storeOtp(phone, otp) {
  if (isRedisReady()) {
    // Redis: SET with auto-expiry — no cleanup needed
    await redis.set(otpKey(phone), otp, 'EX', OTP_TTL_SECONDS);
    logger.info('otpService.storeOtp — stored in Redis', { phone });
    return;
  }

  // Fallback: Supabase (legacy behaviour)
  logger.warn('otpService.storeOtp — Redis unavailable, falling back to Supabase');
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();
  const { error } = await supabase
    .from('otp_codes')
    .insert({ phone, code: otp, expires_at: expiresAt, used: false });

  if (error) {
    logger.error('otpService.storeOtp — Supabase insert error', { error });
    throw Object.assign(new Error('Failed to store OTP'), { code: 'OTP_STORE_FAILED', status: 500 });
  }
}

// ── Retrieve & consume OTP ─────────────────────────────────────────────────────

async function retrieveAndConsumeOtp(phone) {
  if (isRedisReady()) {
    // GETDEL: atomic get + delete (Redis 6.2+)
    // Fallback: GET then DEL for older Redis
    let storedOtp;
    try {
      storedOtp = await redis.getdel(otpKey(phone));
    } catch {
      storedOtp = await redis.get(otpKey(phone));
      if (storedOtp) await redis.del(otpKey(phone));
    }
    return storedOtp;
  }

  // Fallback: Supabase
  logger.warn('otpService.retrieveAndConsumeOtp — Redis unavailable, using Supabase');
  const { data: rows, error } = await supabase
    .from('otp_codes')
    .select('id, code, expires_at')
    .eq('phone', phone)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('otpService.retrieveAndConsumeOtp — DB error', { error });
    throw Object.assign(new Error('DB error during OTP lookup'), { code: 'INTERNAL_ERROR', status: 500 });
  }

  if (!rows || rows.length === 0) return null;

  const record = rows[0];

  // Mark as used
  await supabase.from('otp_codes').update({ used: true }).eq('id', record.id);

  return record.code;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP, store it, and send via MSG91.
 */
async function sendOTP(phone) {
  const otp = crypto.randomInt(100000, 999999).toString();

  // Store OTP (Redis primary, Supabase fallback)
  await storeOtp(phone, otp);

  // Send via MSG91
  try {
    await axios.post(
      'https://api.msg91.com/api/v5/otp',
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile:      phone,
        otp,
      },
      {
        headers: {
          authkey:        process.env.MSG91_AUTH_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info('otpService.sendOTP — OTP sent via MSG91', { phone });
  } catch (smsErr) {
    // Log but do not fail — OTP is stored; client can retry verify
    logger.error('otpService.sendOTP — MSG91 error', {
      phone,
      error: smsErr?.response?.data || smsErr.message,
    });
  }

  // In dev mode, log OTP to console for easy testing
  if (IS_DEV) {
    logger.info(`[DEV] OTP for ${phone}: ${otp}`);
  }
}

/**
 * Verify OTP for a given phone.
 * Throws with specific error codes on failure.
 */
async function verifyOTP(phone, candidateOtp) {
  // ── Dev bypass: accept OTP_BYPASS_CODE in non-production ──────────────────
  if (IS_DEV && DEV_BYPASS_CODE && candidateOtp === DEV_BYPASS_CODE) {
    logger.warn('otpService.verifyOTP — DEV BYPASS used', { phone });
    return;
  }

  // Retrieve stored OTP (auto-consumed)
  const storedOtp = await retrieveAndConsumeOtp(phone);

  if (!storedOtp) {
    throw Object.assign(new Error('No valid OTP found'), { code: 'OTP_NOT_FOUND', status: 400 });
  }

  // Constant-time comparison to prevent timing attacks
  const candidateBuf = Buffer.from(String(candidateOtp).padEnd(6, ' '));
  const storedBuf    = Buffer.from(String(storedOtp).padEnd(6, ' '));

  if (candidateBuf.length !== storedBuf.length || !crypto.timingSafeEqual(candidateBuf, storedBuf)) {
    throw Object.assign(new Error('Invalid OTP'), { code: 'OTP_INVALID', status: 400 });
  }

  logger.info('otpService.verifyOTP — OTP verified', { phone });
}

module.exports = { sendOTP, verifyOTP };
