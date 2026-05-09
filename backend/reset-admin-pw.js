require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const NEW_PASSWORD = process.argv[2] || 'Admin@123456';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL || 'admin@nansaiorganics.com';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const salt   = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(NEW_PASSWORD, salt);
  const result = await User.updateOne(
    { email: ADMIN_EMAIL },
    { password: hashed, role: 'admin', emailVerified: true }
  );
  if (result.matchedCount === 0) {
    console.log('No user found with email:', ADMIN_EMAIL);
  } else {
    console.log('✅ Admin password reset successfully for:', ADMIN_EMAIL);
  }
  process.exit(0);
}).catch(e => { console.error('❌', e.message); process.exit(1); });
