require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const User = require('../models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const email = process.env.ADMIN_EMAIL || 'admin@nansaiorganics.com';
    const password = process.argv[2];
    if (!password) {
      console.error('❌ Please provide a password as argument: node create-admin.js <password>');
      process.exit(1);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        existing.emailVerified = true;
        await existing.save({ validateBeforeSave: false });
        console.log(`✅ Upgraded existing user ${email} to admin`);
      } else {
        console.log(`ℹ️  Admin user ${email} already exists`);
      }
    } else {
      await User.create({
        name: 'Nansai Admin',
        email,
        password,
        phone: '9999999999',
        role: 'admin',
        emailVerified: true,
        phoneVerified: true,
      });
      console.log(`✅ Admin user created: ${email}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
