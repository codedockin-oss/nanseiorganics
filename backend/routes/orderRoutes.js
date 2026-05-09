const express  = require('express');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const Razorpay = require('razorpay');
const sendEmail = require('../utils/sendEmail');
const { orderConfirmation, adminOrderNotification } = require('../utils/emailTemplates');

const router             = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Cart  = require('../models/Cart');

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

/** Attach req.user from Bearer token without hard-failing (optional auth). */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role };
    } catch { /* invalid token — treat as guest */ }
  }
  next();
}

/** Parse Razorpay SDK errors — SDK throws plain objects, not Error instances */
function rzpErrMsg(err) {
  if (!err) return 'Unknown Razorpay error';
  // SDK throws { statusCode, error: { description, code } }
  if (err.error?.description) return `[${err.statusCode}] ${err.error.description} (${err.error.code})`;
  if (err.message) return err.message;
  return JSON.stringify(err);
}

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured in .env');
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Escape special regex characters to prevent ReDoS
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────
//  ADMIN EMAIL HELPER
// ─────────────────────────────────────────────────────────
async function sendOrderEmails(order, user) {
  // Customer confirmation
  try {
    const email = user?.email || order.shippingAddress?.email;
    if (email) {
      await sendEmail({
        email,
        subject: `Order Confirmed #${order.orderNumber || order._id} — Nansai Organics`,
        html: orderConfirmation(order, user),
      });
      console.log('✅ Order confirmation sent to', email);
    }
  } catch (err) {
    console.warn('⚠️  Customer confirmation email failed:', err.message);
  }
  // Admin notification
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        email: adminEmail,
        subject: `🛒 New Order #${order.orderNumber || order._id} — ₹${order.totalPrice?.toLocaleString('en-IN')}`,
        html: adminOrderNotification(order),
      });
      console.log('✅ Admin order notification sent to', adminEmail);
    }
  } catch (err) {
    console.warn('⚠️  Admin email notification failed:', err.message);
  }
}


/**
 * POST /api/orders/razorpay/create
 * Public — guests and logged-in users can both create a Razorpay order.
 * Body: { amount: <number in ₹>, currency?: 'INR' }
 */
router.post('/razorpay/create', optionalAuth, async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount (in ₹) is required' });
    }

    const rzp      = getRazorpay();
    const rzpOrder = await rzp.orders.create({
      amount:  Math.round(Number(amount) * 100), // ₹ → paise
      currency,
      receipt: 'rcpt_' + Date.now(),
    });

    res.json({
      success: true,
      data: {
        orderId:  rzpOrder.id,
        amount:   rzpOrder.amount,   // paise
        currency: rzpOrder.currency,
        keyId:    process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    const msg = rzpErrMsg(err);
    console.error('[Razorpay] create-order error:', msg);
    const status = err.statusCode === 401 ? 401 : 500;
    res.status(status).json({ success: false, message: msg });
  }
});

/**
 * POST /api/orders/razorpay/verify
 * Public (optional auth) — verifies HMAC-SHA256 signature.
 * If user is logged in and orderPayload is provided, saves order to DB.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderPayload? }
 */
router.post('/razorpay/verify', optionalAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderPayload } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Verify HMAC-SHA256 signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, verified: false, message: 'Invalid payment signature' });
    }

    // Signature valid — persist order if user is authenticated
    if (orderPayload && req.user?.id) {
      const payMethodMap = { razorpay: 'Razorpay', payu: 'PayU', cod: 'COD' };
      const body = {
        ...orderPayload,
        user:        req.user.id,
        isPaid:      true,
        paidAt:      new Date(),
        paymentInfo: { id: razorpay_payment_id, status: 'completed', paidAt: new Date() },
        paymentMethod: payMethodMap[(orderPayload.paymentMethod || '').toLowerCase()] || orderPayload.paymentMethod,
      };
      const order = await Order.create(body);
      await Cart.findOneAndDelete({ user: req.user.id });
      // fetch user for email
      const User = require('../models/User');
      const userDoc = await User.findById(req.user.id).select('name email').lean();
      sendOrderEmails(order, userDoc); // fire-and-forget
      return res.json({ success: true, verified: true, data: order });
    }

    res.json({ success: true, verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    const msg = rzpErrMsg(err);
    console.error('[Razorpay] verify error:', msg);
    res.status(500).json({ success: false, message: msg });
  }
});

// ─────────────────────────────────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────────────────────────────────

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') query.orderStatus = status;
    if (search) query.orderNumber = { $regex: escapeRegex(search), $options: 'i' };

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);
    res.json({ success: true, data: orders, total, page: parseInt(page) });
  } catch (err) {
    console.error('[Orders] GET / error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalOrders, pendingOrders, processingOrders,
      shippedOrders, deliveredOrders, cancelledOrders, revenueAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'Pending' }),
      Order.countDocuments({ orderStatus: 'Processing' }),
      Order.countDocuments({ orderStatus: 'Shipped' }),
      Order.countDocuments({ orderStatus: 'Delivered' }),
      Order.countDocuments({ orderStatus: 'Cancelled' }),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: 'Cancelled' },
          createdAt:   { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id:     { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          revenue: { $sum: '$totalPrice' },
          count:   { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalOrders, pendingOrders, processingOrders,
        shippedOrders, deliveredOrders, cancelledOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
        monthlyRevenue,
      },
    });
  } catch (err) {
    console.error('[Orders] GET /admin/stats error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, trackingNumber, courierService } = req.body;
    const allowedStatuses = ['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }
    const update = { orderStatus: status };
    if (status === 'Shipped') {
      if (trackingNumber) update.trackingNumber = trackingNumber;
      if (courierService)  update.courierService  = courierService;
    }
    if (status === 'Delivered') { update.isDelivered = true; update.deliveredAt = new Date(); }
    if (status === 'Cancelled') { update.cancelledAt = new Date(); }

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] PUT /:id/status error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
//  USER ROUTES
// ─────────────────────────────────────────────────────────

router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name images price')
      .sort('-createdAt')
      .lean();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[Orders] GET /my-orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** POST /api/orders — create order (authenticated users only) */
router.post('/', protect, async (req, res) => {
  try {
    const payMethodMap = { razorpay: 'Razorpay', payu: 'PayU', cod: 'COD', upi: 'UPI', stripe: 'Stripe' };
    const body = {
      ...req.body,
      user: req.user.id,
      paymentMethod: payMethodMap[(req.body.paymentMethod || '').toLowerCase()] || req.body.paymentMethod,
    };
    const order = await Order.create(body);
    await Cart.findOneAndDelete({ user: req.user.id });
    const User = require('../models/User');
    const userDoc = await User.findById(req.user.id).select('name email').lean();
    sendOrderEmails(order, userDoc); // fire-and-forget
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] POST / error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** GET /api/orders/:id — must be LAST to avoid swallowing named routes */
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] GET /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
