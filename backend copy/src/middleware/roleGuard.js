'use strict';

/**
 * Role guard factory.
 * Usage: roleGuard('rider'), roleGuard('driver'), roleGuard('rider', 'driver'), roleGuard('admin')
 *
 * Must be used AFTER authMiddleware (req.user must exist).
 */
function roleGuard(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.', details: {} },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires role: ${allowedRoles.join(' or ')}.`,
          details: { your_role: req.user.role, required_roles: allowedRoles },
        },
      });
    }

    return next();
  };
}

module.exports = roleGuard;
