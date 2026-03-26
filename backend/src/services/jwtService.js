'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issue a new access + refresh token pair.
 * Stores SHA256 hash of the refresh token in refresh_tokens table.
 */
async function issueTokens(userId, role, phone) {
  const jti = uuidv4();

  const accessToken = jwt.sign(
    { userId, role, phone, jti },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, role, phone, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString();

  const { error } = await supabase.from('refresh_tokens').insert({
    user_id: userId,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    logger.error('jwtService.issueTokens — failed to store refresh token', { error });
    throw Object.assign(new Error('Failed to issue tokens'), { code: 'TOKEN_ISSUE_FAILED', status: 500 });
  }

  return { accessToken, refreshToken };
}

/**
 * Rotate a refresh token:
 * - Validates hash against DB
 * - Deletes old hash
 * - Issues a fresh access + refresh token pair
 */
async function refreshAccessToken(refreshToken) {
  // Verify JWT signature first
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
    throw Object.assign(new Error('Invalid refresh token'), { code, status: 401 });
  }

  const tokenHash = hashToken(refreshToken);

  // Look up in DB
  const { data: rows, error } = await supabase
    .from('refresh_tokens')
    .select('id, user_id, role')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (error || !rows || rows.length === 0) {
    throw Object.assign(new Error('Refresh token not found or expired'), { code: 'UNAUTHORIZED', status: 401 });
  }

  const record = rows[0];

  // Delete old token (rotation)
  await supabase.from('refresh_tokens').delete().eq('id', record.id);

  // Issue fresh pair
  return issueTokens(record.user_id, record.role, payload.phone);
}

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 */
async function revokeAllTokens(userId) {
  const { error } = await supabase.from('refresh_tokens').delete().eq('user_id', userId);
  if (error) {
    logger.error('jwtService.revokeAllTokens — error', { userId, error });
    throw Object.assign(new Error('Failed to revoke tokens'), { code: 'INTERNAL_ERROR', status: 500 });
  }
  logger.info('jwtService.revokeAllTokens — all tokens revoked', { userId });
}

module.exports = { issueTokens, refreshAccessToken, revokeAllTokens };
