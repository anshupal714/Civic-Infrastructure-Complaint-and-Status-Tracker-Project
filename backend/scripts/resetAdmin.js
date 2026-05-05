/**
 * Reset Admin Script — Deletes ALL admin accounts and creates a fresh one.
 * Run from backend/: node scripts/resetAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const User     = require('../models/User');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'Admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Super Admin';
const MONGODB_URI    = process.env.MONGODB_URI    || 'mongodb://localhost:27017/civic_tracker';

async function resetAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.\n');

    // Remove ALL existing admin accounts
    const deleted = await User.deleteMany({ role: 'admin' });
    console.log(`🗑️  Deleted ${deleted.deletedCount} old admin account(s).`);

    // Hash new password
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Create fresh admin
    await User.create({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hashed,
      role:     'admin',
    });

    console.log('\n✅ New admin account created!');
    console.log('   Email   :', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   Role    : admin\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  }
}

resetAdmin();
