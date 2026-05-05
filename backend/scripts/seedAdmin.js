/**
 * Seed Script — Creates a default admin account
 * Run from backend/: npm run seed-admin
 *
 * Credentials are read from .env:
 *   ADMIN_EMAIL     (default: admin@civic.gov)
 *   ADMIN_PASSWORD  (default: Admin@1234)
 *   ADMIN_NAME      (default: Super Admin)
 *
 * Usage:
 *   cd backend
 *   node scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const User     = require('../models/User');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'Admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Super Admin';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_tracker';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role !== 'admin') {
        // Upgrade existing user to admin role
        existing.role = 'admin';
        await existing.save();
        console.log(`\n🔼 Upgraded existing user to admin: ${ADMIN_EMAIL}\n`);
      } else {
        console.log(`\n⚠️  Admin account already exists: ${ADMIN_EMAIL}\n`);
      }
      process.exit(0);
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await User.create({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hashed,
      role:     'admin',
    });

    console.log('\n✅ Admin account created!');
    console.log('   Email   :', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   Role    : admin\n');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedAdmin();
