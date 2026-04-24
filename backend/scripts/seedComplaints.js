/**
 * Seed Script — Creates dummy complaints automatically
 * Run from backend/: node scripts/seedComplaints.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_tracker';

async function seedComplaints() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Find the admin user or any user to assign the complaint to
    let user = await User.findOne({ email: 'admin@civic.gov' });
    
    if (!user) {
       // Create a dummy user if none exists
       const bcrypt = require('bcryptjs');
       const hashed = await bcrypt.hash('password123', 10);
       user = await User.create({
         name: 'Test Citizen',
         email: 'citizen@example.com',
         password: hashed,
         role: 'citizen'
       });
       console.log('Created test citizen account.');
    }

    const dummyComplaints = [
      {
        user_id: user._id,
        title: 'Large pothole on MG Road',
        description: 'There is a huge pothole causing heavy traffic and risk of accidents near the intersection.',
        category: 'Road',
        location: 'MG Road Intersection',
        ward: 'Ward 4',
        priority: 'high',
        status: 'pending'
      },
      {
        user_id: user._id,
        title: 'Streetlight not working in Sector 9',
        description: 'The streetlights on the main avenue of Sector 9 have been out for 3 days.',
        category: 'Street Light',
        location: 'Sector 9, Main Avenue',
        ward: 'Ward 9',
        priority: 'medium',
        status: 'in_progress'
      }
    ];

    await Complaint.insertMany(dummyComplaints);

    console.log('\n✅ Successfully added 2 dummy complaints to the database!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedComplaints();
