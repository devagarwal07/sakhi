'use strict';

const crypto = require('crypto');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Generate a unique 6-character alphanumeric referral code.
 */
async function generateReferralCode(table) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    const { data } = await supabase.from(table).select('id').eq('referral_code', code).limit(1);
    if (!data || data.length === 0) return code;
  }
  throw new Error('Unable to generate unique referral code');
}

/**
 * Upsert a rider into the users table.
 * Returns { profile, isNewUser }.
 */
async function upsertRider(phone) {
  // Check if exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .limit(1);

  if (existing && existing.length > 0) {
    return { profile: existing[0], isNewUser: false };
  }

  // New rider
  const referral_code = await generateReferralCode('users');

  const { data: inserted, error } = await supabase
    .from('users')
    .insert({ phone, referral_code })
    .select('*')
    .single();

  if (error) {
    logger.error('authService.upsertRider — insert error', { error });
    throw Object.assign(new Error('Failed to create rider'), { code: 'USER_CREATE_FAILED', status: 500 });
  }

  return { profile: inserted, isNewUser: true };
}

/**
 * Upsert a driver into the drivers table.
 * Returns { profile, isNewUser }.
 */
async function upsertDriver(phone) {
  const { data: existing } = await supabase
    .from('drivers')
    .select('*')
    .eq('phone', phone)
    .limit(1);

  if (existing && existing.length > 0) {
    return { profile: existing[0], isNewUser: false };
  }

  const referral_code = await generateReferralCode('drivers');

  const { data: inserted, error } = await supabase
    .from('drivers')
    .insert({ phone, referral_code })
    .select('*')
    .single();

  if (error) {
    logger.error('authService.upsertDriver — insert error', { error });
    throw Object.assign(new Error('Failed to create driver'), { code: 'DRIVER_CREATE_FAILED', status: 500 });
  }

  return { profile: inserted, isNewUser: true };
}

module.exports = { upsertRider, upsertDriver };
