'use strict';

/**
 * Role-based authorization middleware
 * Usage: authorize('admin'), authorize('admin', 'manager')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }

    return next();
  };
};

module.exports = authorize;


