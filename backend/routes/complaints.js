/**
 * Complaints Routes — /api/complaints
 * CRUD operations for civic infrastructure complaints.
 * Citizens can create/view their own complaints.
 * Admins can view all complaints and update statuses.
 */

const express = require('express');
const path = require('path');
const multer = require('multer');
const Complaint = require('../models/Complaint');
const StatusHistory = require('../models/StatusHistory');
const Comment = require('../models/Comment');
const { authenticate, requireAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

// ─── Multer (File Upload) Setup ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `complaint_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const isAllowed = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    isAllowed ? cb(null, true) : cb(new Error('Only image files are allowed.'));
  },
});

// ─── Allowed values ────────────────────────────────────────────────────────────
const VALID_CATEGORIES = ['Road', 'Water', 'Electricity', 'Sanitation', 'Street Light', 'Park', 'Drainage', 'Other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['pending', 'in_progress', 'resolved', 'rejected'];

// ─── POST /api/complaints ──────────────────────────────────────────────────────
/**
 * Submit a new complaint (authenticated citizens).
 */
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, location, ward, priority } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({ success: false, message: 'Title, description, category, and location are required.' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}.` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.` });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const newComplaint = await Complaint.create({
      user_id: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      location: location.trim(),
      ward: ward || null,
      priority: priority || 'medium',
      image_path: imagePath
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully!',
      complaint: newComplaint,
    });
  } catch (err) {
    console.error('[POST /complaints]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/complaints/stats/summary ────────────────────────────────────────
/**
 * Get dashboard statistics (admin) or personal stats (citizen).
 */
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    let matchStage = {};

    if (req.user.role !== 'admin') {
      matchStage = { user_id: new mongoose.Types.ObjectId(req.user.id) };
    }

    const statsAgg = await Complaint.aggregate([
      { $match: matchStage },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
      }}
    ]);

    const stats = statsAgg.length > 0 ? statsAgg[0] : { total: 0, pending: 0, in_progress: 0, resolved: 0, rejected: 0 };
    delete stats._id;

    const byCategoryAgg = await Complaint.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, category: '$_id', count: 1 } }
    ]);

    return res.json({ success: true, stats, byCategory: byCategoryAgg });
  } catch (err) {
    console.error('[GET /complaints/stats/summary]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/complaints ───────────────────────────────────────────────────────
/**
 * Get complaints:
 * - Citizens: their own complaints only
 * - Admins: all complaints with filters
 * Query: ?status=&category=&priority=&page=&limit=
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    // Citizens only see their own complaints
    if (req.user.role !== 'admin') {
      query.user_id = req.user.id;
    }

    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      query.category = category;
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      query.priority = priority;
    }

    const total = await Complaint.countDocuments(query);
    let complaints = await Complaint.find(query)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(parseInt(limit))
      .lean({ virtuals: true });

    // Map fields — explicitly set id as a plain string so the frontend always
    // receives a valid MongoDB ObjectId string (lean() virtuals are unreliable).
    complaints = complaints.map(c => {
      c.id = c._id.toString();          // ← guaranteed string ID
      if (c.user_id) {
        c.citizen_name  = c.user_id.name;
        c.citizen_email = c.user_id.email;
        c.user_id       = (c.user_id._id || c.user_id).toString();
      }
      return c;
    });

    return res.json({
      success: true,
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[GET /complaints]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/complaints/:id ───────────────────────────────────────────────────
/**
 * Get a single complaint with full status history and comments.
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID.' });
    }

    let complaint = await Complaint.findById(req.params.id)
      .populate('user_id', 'name email')
      .lean({ virtuals: true });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Citizens can only access their own complaints
    const complaintUserId = complaint.user_id ? (complaint.user_id._id || complaint.user_id.id || complaint.user_id).toString() : null;
    if (req.user.role !== 'admin' && complaintUserId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Map populated fields — always set id as a plain string
    complaint.id = complaint._id.toString();   // ← guaranteed string ID
    if (complaint.user_id) {
      complaint.citizen_name  = complaint.user_id.name;
      complaint.citizen_email = complaint.user_id.email;
      complaint.user_id       = (complaint.user_id._id || complaint.user_id).toString();
    }

    // Use the guaranteed string ID for sub-collection queries
    const complaintIdStr = complaint.id;

    // Fetch status history
    let history = await StatusHistory.find({ complaint_id: complaintIdStr })
      .populate('changed_by', 'name')
      .sort({ changed_at: 1 })
      .lean({ virtuals: true });

    history = history.map(h => {
      h.id = h._id.toString();
      if (h.changed_by) {
        h.changed_by_name = h.changed_by.name;
        h.changed_by      = (h.changed_by._id || h.changed_by).toString();
      }
      return h;
    });

    // Fetch comments
    let comments = await Comment.find({ complaint_id: complaintIdStr })
      .populate('user_id', 'name role')
      .sort({ created_at: 1 })
      .lean({ virtuals: true });

    comments = comments.map(c => {
      c.id = c._id.toString();
      if (c.user_id) {
        c.author_name = c.user_id.name;
        c.author_role = c.user_id.role;
        c.user_id     = (c.user_id._id || c.user_id).toString();
      }
      return c;
    });

    return res.json({ success: true, complaint, history, comments });
  } catch (err) {
    console.error('[GET /complaints/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── PATCH /api/complaints/:id/status ─────────────────────────────────────────
/**
 * Update complaint status (admin only).
 * Body: { status, remark? }
 */
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const rawId = req.params.id;

    // Guard: reject clearly invalid IDs immediately with helpful log
    if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
      console.warn('[PATCH /status] Received invalid complaint ID:', rawId);
      return res.status(400).json({ success: false, message: `Invalid complaint ID: "${rawId}". Expected a 24-character MongoDB ObjectId.` });
    }

    const { status, remark } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }

    const complaint = await Complaint.findById(rawId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const oldStatus = complaint.status;

    // Update status
    complaint.status      = status;
    complaint.assigned_to = req.user.id;
    await complaint.save();

    // Log the status change — use _id (ObjectId) not .id virtual for reliability
    await StatusHistory.create({
      complaint_id: complaint._id,   // ← use _id directly on the Mongoose document
      changed_by:   req.user.id,
      old_status:   oldStatus,
      new_status:   status,
      remark:       remark || null,
    });

    return res.json({
      success: true,
      message: `Complaint status updated to "${status}".`,
      complaint,
    });
  } catch (err) {
    console.error('[PATCH /complaints/:id/status]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── POST /api/complaints/:id/comments ────────────────────────────────────────
/**
 * Add a comment to a complaint.
 * Body: { message }
 */
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID.' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Comment message is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Citizens can only comment on their own complaints
    if (req.user.role !== 'admin' && complaint.user_id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let newComment = await Comment.create({
      complaint_id: complaint.id,
      user_id: req.user.id,
      message: message.trim()
    });

    // Populate the comment to return to the frontend
    newComment = await Comment.findById(newComment.id)
      .populate('user_id', 'name role')
      .lean({ virtuals: true });

    if (newComment.user_id) {
      newComment.author_name = newComment.user_id.name;
      newComment.author_role = newComment.user_id.role;
      newComment.user_id = newComment.user_id._id || newComment.user_id.id;
    }

    return res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    console.error('[POST /complaints/:id/comments]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// /stats/summary moved up to prevent route collision

module.exports = router;
