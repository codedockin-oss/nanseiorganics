require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const Cart = require('../models/Cart');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  const phone = '6382142578';
  const ADMIN_PASSWORD = 'anto';
  const hashedPw = await bcrypt.hash(ADMIN_PASSWORD, 10);

  let user = await User.findOne({ phone });

  if (user) {
    await User.updateOne({ phone }, {
      name: 'Anto',
      role: 'admin',
      password: hashedPw,
      phoneVerified: true,
      emailVerified: true,
    });
    console.log('✅ Admin updated — phone:', phone, '| password: anto');
  } else {
    user = new User({
      firstName: 'Anto',
      lastName: 'Admin',
      name: 'Anto',
      email: `${phone}@nansai.local`,
      phone,
      role: 'admin',
      phoneVerified: true,
      emailVerified: true,
    });
    // Set pre-hashed password directly to bypass minlength validator
    user.password = hashedPw;
    await user.save({ validateBeforeSave: false });
    await Cart.create({ user: user._id, items: [] });
    console.log('✅ Admin created — phone:', phone, '| password: anto');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
