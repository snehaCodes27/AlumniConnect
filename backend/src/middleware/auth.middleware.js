const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/prisma');

/**
 * Middleware to verify JWT token and attach user payload to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing or malformed.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      });
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired authentication token.',
        });
      }

      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate request.',
    });
  }
};

/**
 * Optional Authentication Middleware: Attaches req.user if valid token present, passes silently if not.
 */
const optionalAuthenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        jwt.verify(token, config.jwtSecret, (err, decoded) => {
          if (!err && decoded) {
            req.user = {
              userId: decoded.userId,
              role: decoded.role,
            };
          }
        });
      }
    }
  } catch (err) {
    // Ignore optional auth errors
  }
  next();
};

/**
 * Middleware for role-based authorization
 * @param  {...string} allowedRoles - Permitted user roles (e.g. 'ADMIN', 'STUDENT', 'ALUMNI')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'User identity unauthenticated.',
      });
    }

    const userRole = String(req.user.role).toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this resource.',
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  authorizeRoles,
};
