/**
 * fresh-db.js — Wipe ALL data except admin user. Ready for hosting.
 * Usage: node seeders/fresh-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const User     = require('../models/User');
const Order    = require('../models/Order');
const Cart     = require('../models/Cart');
const Address  = require('../models/Address');
const Review   = require('../models/Review');
const Blog     = require('../models/Blog');
const News     = require('../models/News');
const Product  = require('../models/Product');
const Coupon   = require('../models/Coupon');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // 1. Delete all non-admin users
    const userDel = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`🗑️  Users deleted       : ${userDel.deletedCount}`);

    // 2. Delete all orders
    const orderDel = await Order.deleteMany({});
    console.log(`🗑️  Orders deleted      : ${orderDel.deletedCount}`);

    // 3. Delete all carts
    const cartDel = await Cart.deleteMany({});
    console.log(`🗑️  Carts deleted       : ${cartDel.deletedCount}`);

    // 4. Delete all addresses
    const addrDel = await Address.deleteMany({});
    console.log(`🗑️  Addresses deleted   : ${addrDel.deletedCount}`);

    // 5. Delete all reviews
    const revDel = await Review.deleteMany({});
    console.log(`🗑️  Reviews deleted     : ${revDel.deletedCount}`);

    // 6. Delete all blogs
    const blogDel = await Blog.deleteMany({});
    console.log(`🗑️  Blogs deleted       : ${blogDel.deletedCount}`);

    // 7. Delete all news
    const newsDel = await News.deleteMany({});
    console.log(`🗑️  News deleted        : ${newsDel.deletedCount}`);

    // 8. Delete all products (fresh start — add via admin panel)
    const prodDel = await Product.deleteMany({});
    console.log(`🗑️  Products deleted    : ${prodDel.deletedCount}`);

    // 9. Delete all coupons
    const couponDel = await Coupon.deleteMany({});
    console.log(`🗑️  Coupons deleted     : ${couponDel.deletedCount}`);

    // Verify admin still exists
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      console.log(`\n✅ Admin preserved     : ${admin.email} (phone: ${admin.phone})`);
    } else {
      console.log('\n⚠️  No admin found! Run: node seeders/fresh-admin.js');
    }

    console.log('\n🚀 Database is clean and ready for hosting!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
