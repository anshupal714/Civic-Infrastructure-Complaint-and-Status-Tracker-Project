/**
 * Auth Routes — /api/auth
 * Handles user registration, login, and profile retrieval.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a signed JWT for the given user payload.
 * @param {{ id, name, email, role }} user
 * @returns {string} JWT token (expires in 24h)
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Register a new citizen account.
 * Body: { name, email, password, phone? }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password and insert user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || null
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Civic Tracker.',
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Login with email and password.
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    
    const userObj = user.toJSON();
    delete userObj.password;

    return res.json({
      success: true,
      message: `Welcome back, ${userObj.name}!`,
      token,
      user: userObj,
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user's profile.
 * Requires: Bearer token
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error('[GET /me]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
