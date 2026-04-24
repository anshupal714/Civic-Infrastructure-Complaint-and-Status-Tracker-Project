/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user to request.
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware: Requires a valid JWT token.
 * Attaches decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/**
 * Middleware: Requires the authenticated user to have 'admin' role.
 * Must be used after `authenticate`.
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden. Admin access only.' });
}

module.exports = { authenticate, requireAdmin };
