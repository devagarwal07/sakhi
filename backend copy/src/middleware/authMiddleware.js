'use strict';

const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');
const logger   = require('../utils/logger');

/**
 * In-memory JTI blocklist (for revoked access tokens).
 * Entries: jti → expiry timestamp (ms)
 * On server restart it resets — acceptable for 7d access tokens since
 * revokeAllTokens wipes refresh_tokens, preventing new access tokens.
 *
 * For multi-instance deployments, replace with Redis.
 */
const _blocklist = new Map();

/** Add a jti to the blocklist until its expiry */
function blockJti(jti, exp) {
  if (!jti) return;
  _blocklist.set(jti, exp * 1000); // exp is in seconds → ms
  // Lazy cleanup: remove expired entries every time we add
  const now = Date.now();
  for (const [k, v] of _blocklist) {
    if (v < now) _blocklist.delete(k);
  }
}

/** Check if a jti is blocked */
function isJtiBlocked(jti) {
  if (!jti) return false;
  const exp = _blocklist.get(jti);
  if (exp === undefined) return false;
  if (Date.now() > exp) {
    _blocklist.delete(jti);
    return false;
  }
  return true;
}

/**
 * Auth middleware — verifies Bearer token, checks JTI blocklist.
 * Attaches { userId, role, phone, jti } to req.user on success.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.', details: {} },
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // JTI blocklist check (revoked tokens)
    if (payload.jti && isJtiBlocked(payload.jti)) {
      return res.status(401).json({
        error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked. Please log in again.', details: {} },
      });
    }

    req.user = {
      userId: payload.userId,
      role:   payload.role,
      phone:  payload.phone,
      jti:    payload.jti,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired. Please refresh.', details: {} },
      });
    }
    logger.warn('authMiddleware — invalid token', { error: err.message, ip: req.ip });
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid access token.', details: {} },
    });
  }
}

module.exports = authMiddleware;
module.exports.blockJti = blockJti;
module.exports.isJtiBlocked = isJtiBlocked;
