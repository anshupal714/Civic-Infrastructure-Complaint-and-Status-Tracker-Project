/**
 * ─────────────────────────────────────────────────────
 *  Civic Infrastructure Tracker — Backend Server
 *  Entry Point: server.js
 * ─────────────────────────────────────────────────────
 *
 *  Architecture:
 *    - Express.js REST API (pure backend, no static files)
 *    - SQLite database via better-sqlite3
 *    - JWT authentication (24h access tokens)
 *    - CORS configured to accept requests from the frontend
 *
 *  Endpoints:
 *    POST   /api/auth/register
 *    POST   /api/auth/login
 *    GET    /api/auth/me
 *    GET    /api/complaints
 *    POST   /api/complaints
 *    GET    /api/complaints/stats/summary
 *    GET    /api/complaints/:id
 *    PATCH  /api/complaints/:id/status
 *    POST   /api/complaints/:id/comments
 *    GET    /api/users             (admin)
 *    PATCH  /api/users/:id/role   (admin)
 *    GET    /api/health
 * ─────────────────────────────────────────────────────
 */

require('dotenv').config();
require('./database/db');

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// ─── Route modules ────────────────────────────────────
const authRoutes      = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const userRoutes      = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Ensure uploads directory exists ─────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── CORS ─────────────────────────────────────────────
// Allow the standalone frontend origin (Live Server, Vite, etc.)
// In production replace FRONTEND_URL with your deployed domain.
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',  // keep for same-origin dev tools
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    }
  },
  credentials: true,
}));

// ─── Body parsers ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve uploaded images ────────────────────────────
// Frontend fetches images via GET /uploads/<filename>
app.use('/uploads', express.static(uploadsDir));

// ─── API Routes ───────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users',      userRoutes);

// ─── Health check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   'Civic Tracker API is running!',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 handler for unknown API routes ───────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Serve Frontend Static Files ──────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Global error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.message);
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🚀 Civic Infrastructure Tracker — Backend API');
  console.log(`   Listening at : http://localhost:${PORT}`);
  console.log(`   API base     : http://localhost:${PORT}/api`);
  console.log(`   Allowed CORS : ${allowedOrigins.join(', ')}`);
  console.log(`   Environment  : ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
