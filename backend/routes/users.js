/**
 * Users Routes — /api/users
 * Admin-only: manage user accounts.
 */

const express    = require('express');
const mongoose   = require('mongoose');
const User       = require('../models/User');
const Complaint  = require('../models/Complaint');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/users ────────────────────────────────────────────────────────────
/**
 * List all users with complaint counts (admin only).
 * Query: ?search=  &page=  &limit=
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build search filter
    let filter = { role: 'citizen' };
    if (search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(parseInt(limit))
      .lean();

    // Fetch complaint counts per user in one aggregation
    const userIds = users.map(u => u._id);
    const countAgg = await Complaint.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $group: {
          _id: '$user_id',
          total:       { $sum: 1 },
          pending:     { $sum: { $cond: [{ $eq: ['$status', 'pending']     }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved:    { $sum: { $cond: [{ $eq: ['$status', 'resolved']    }, 1, 0] } },
          rejected:    { $sum: { $cond: [{ $eq: ['$status', 'rejected']    }, 1, 0] } },
      }}
    ]);

    // Map counts by user id string
    const countMap = {};
    countAgg.forEach(c => { countMap[c._id.toString()] = c; });

    const enriched = users.map(u => {
      const id = u._id.toString();
      const counts = countMap[id] || { total: 0, pending: 0, in_progress: 0, resolved: 0, rejected: 0 };
      return {
        id,
        name:        u.name,
        email:       u.email,
        phone:       u.phone,
        role:        u.role,
        created_at:  u.created_at,
        complaints:  {
          total:       counts.total,
          pending:     counts.pending,
          in_progress: counts.in_progress,
          resolved:    counts.resolved,
          rejected:    counts.rejected,
        }
      };
    });

    return res.json({
      success: true,
      users: enriched,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
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
