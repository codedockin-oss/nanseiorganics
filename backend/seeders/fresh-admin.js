/**
 * fresh-admin.js
 * Wipes ALL users from DB and creates a single admin account.
 * Usage: node seeders/fresh-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const User = require('../models/User');

// ── Admin credentials ──────────────────────────────────────
const ADMIN = {
  name:          'Anthony',
  email:         'athanyanis@gmail.com',
  password:      'Nansai@2025',
  phone:         '6382142578',
  role:          'admin',
  emailVerified: true,
  phoneVerified: true,
  isVerified:    true,
};
// ──────────────────────────────────────────────────────────

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const deleted = await User.deleteMany({});
    console.log(`🗑️  Deleted ${deleted.deletedCount} user(s)`);

    await User.create(ADMIN);
    console.log(`✅ Admin created → ${ADMIN.email} / phone: ${ADMIN.phone}`);
    console.log(`🔑 Password: ${ADMIN.password}`);

    await mongoose.disconnect();
    console.log('✅ Done. DB is fresh with only admin.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
