'use strict';

const jwt = require('jsonwebtoken');

/**
 * Auth middleware — verifies the Bearer token in the Authorization header.
 * Attaches { userId, role, phone } to req.user on success.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.', details: {} },
    });
  }

  const token = authHeader.slice(7); // strip 'Bearer '

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: payload.userId,
      role: payload.role,
      phone: payload.phone,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired. Please refresh.', details: {} },
      });
    }
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid access token.', details: {} },
    });
  }
}

module.exports = authMiddleware;
