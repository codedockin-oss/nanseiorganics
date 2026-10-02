/**
 * make-admin.js — gives an EXISTING account the admin role (nothing is created, nothing is deleted).
 *
 *   1. Register the account on the website as a normal customer.
 *   2. cd backend && node seeders/make-admin.js you@example.com
 *
 * Admin rights are never granted automatically by an email address or a built-in password.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const User = require('../models/User');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: node seeders/make-admin.js <email of an existing account>'); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const r = await User.updateOne({ email }, { role: 'admin' });
  console.log(r.matchedCount ? 'Admin role granted to ' + email : 'No account with that email. Register it on the website first.');
  await mongoose.disconnect();
  process.exit(r.matchedCount ? 0 : 1);
}).catch(e => { console.error(e.message); process.exit(1); });
