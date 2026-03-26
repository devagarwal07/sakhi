'use strict';

const crypto = require('crypto');
const axios = require('axios');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Generate a 6-digit OTP, store it in otp_codes, and send via MSG91.
 */
async function sendOTP(phone) {
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // +5 minutes

  // Persist OTP
  const { error: insertErr } = await supabase
    .from('otp_codes')
    .insert({ phone, code: otp, expires_at: expiresAt, used: false });

  if (insertErr) {
    logger.error('otpService.sendOTP — DB insert error', { error: insertErr });
    throw Object.assign(new Error('Failed to store OTP'), { code: 'OTP_STORE_FAILED', status: 500 });
  }

  // Send via MSG91
  try {
    await axios.post(
      'https://api.msg91.com/api/v5/otp',
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: phone,
        otp,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info('otpService.sendOTP — OTP sent', { phone });
  } catch (smsErr) {
    // Log but do not fail — OTP is stored; client can retry verify
    logger.error('otpService.sendOTP — MSG91 error', {
      phone,
      error: smsErr?.response?.data || smsErr.message,
    });
  }
}

/**
 * Verify OTP for a given phone.
 * Throws with specific error codes on failure.
 */
async function verifyOTP(phone, candidateOtp) {
  // Fetch latest unused, non-expired OTP
  const { data: rows, error } = await supabase
    .from('otp_codes')
    .select('id, code, expires_at')
    .eq('phone', phone)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('otpService.verifyOTP — DB error', { error });
    throw Object.assign(new Error('DB error during OTP lookup'), { code: 'INTERNAL_ERROR', status: 500 });
  }

  if (!rows || rows.length === 0) {
    throw Object.assign(new Error('No valid OTP found'), { code: 'OTP_NOT_FOUND', status: 400 });
  }

  const record = rows[0];

  // Constant-time comparison to prevent timing attacks
  const candidateBuf = Buffer.from(String(candidateOtp).padEnd(6, ' '));
  const storedBuf = Buffer.from(String(record.code).padEnd(6, ' '));

  if (candidateBuf.length !== storedBuf.length || !crypto.timingSafeEqual(candidateBuf, storedBuf)) {
    throw Object.assign(new Error('Invalid OTP'), { code: 'OTP_INVALID', status: 400 });
  }

  // Mark as used
  const { error: updateErr } = await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('id', record.id);

  if (updateErr) {
    logger.error('otpService.verifyOTP — failed to mark used', { error: updateErr });
  }

  logger.info('otpService.verifyOTP — OTP verified', { phone });
}

module.exports = { sendOTP, verifyOTP };
