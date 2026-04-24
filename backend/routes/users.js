/**
 * Users Routes — /api/users
 * Admin-only: manage user accounts.
 */

const express = require('express');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/users ────────────────────────────────────────────────────────────
/**
 * List all users (admin only).
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ created_at: -1 });
    return res.json({ success: true, users });
  } catch (err) {
    console.error('[GET /users]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── PATCH /api/users/:id/role ─────────────────────────────────────────────────
/**
 * Promote or demote a user's role (admin only).
 * Body: { role: 'citizen' | 'admin' }
 */
router.patch('/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['citizen', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "citizen" or "admin".' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.role = role;
    await user.save();

    return res.json({ success: true, message: `User role updated to "${role}".` });
  } catch (err) {
    console.error('[PATCH /users/:id/role]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
