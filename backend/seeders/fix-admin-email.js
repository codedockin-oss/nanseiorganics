/**
 * fix-admin-email.js
 * Fixes the admin email typo in DB and ensures correct password.
 * Usage: node seeders/fix-admin-email.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const User = require('../models/User');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Fix typo: athanyanis -> anthanyanis
    const typo = await User.findOne({ email: 'athanyanis@gmail.com' });
    if (typo) {
      typo.email = 'anthanyanis@gmail.com';
      typo.role = 'admin';
      typo.emailVerified = true;
      await typo.save({ validateBeforeSave: false });
      console.log('✅ Fixed email typo → anthanyanis@gmail.com');
    }

    // Ensure the correct admin exists with right role
    const admin = await User.findOne({ email: 'anthanyanis@gmail.com' });
    if (admin) {
      admin.role = 'admin';
      admin.emailVerified = true;
      await admin.save({ validateBeforeSave: false });
      console.log('✅ Admin role confirmed for anthanyanis@gmail.com');
    } else {
      console.log('ℹ️  No admin found — will be auto-created on first login with @anthony@');
    }

    await mongoose.disconnect();
    console.log('✅ Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
