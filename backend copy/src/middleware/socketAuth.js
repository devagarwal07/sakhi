'use strict';

const jwt = require('jsonwebtoken');

/**
 * Socket.IO auth middleware.
 * Reads token from socket.handshake.auth.token
 * Attaches socket.data.user = { userId, role, phone } on success.
 */
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = {
      userId: payload.userId,
      role:   payload.role,
      phone:  payload.phone,
    };
    return next();
  } catch (err) {
    return next(new Error(err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED'));
  }
}

module.exports = socketAuth;
