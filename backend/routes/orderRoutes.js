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
const shippingService = require('../utils/shippingService');
const { buildOrder, codOnly, pricingRules, OrderError } = require('../utils/orderGuard');
const { takeStock, returnStock } = require('../utils/stock');
const { finalizePaidOrder, PaidOrderError } = require('../utils/paidOrders');

/** an order that used a coupon counts against that coupon's usage limit */
function countCouponUse(order) {
  if (!order || !order.couponCode) return;
  require('../models/Coupon').updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } })
    .catch(e => console.warn('[Coupons] could not count use of', order.couponCode, e.message));
}

/** The two look-ups the order guard needs (real database; replaced by fakes in tests). */
function guardContext(method) {
  return {
    method,
    findProducts: async ids => {
      const mongoose = require('mongoose');
      const real = ids.filter(id => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24);
      const legacy = ids.filter(id => /^\d{1,6}$/.test(String(id))).map(Number);
      const or = [];
      if (real.length) or.push({ _id: { $in: real } });
      if (legacy.length) or.push({ legacyId: { $in: legacy } });
      return or.length ? require('../models/Product').find({ $or: or }).select('name price sizes legacyId isActive').lean() : [];
    },
    findCoupon: code => require('../models/Coupon').findOne({ code }),
    // delivery charge, free-delivery threshold, COD on/off and COD fee come from the admin's store settings
    getRules: async () => { const st = require('../utils/settings'); return st.pricingFrom(await st.getStoreSettings()); },
  };
}

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

/** Books the courier for a new order without ever delaying or failing the order itself. */
function shipInBackground(orderId) {
  shippingService.autoShip({ Order, User: require('../models/User'), orderId })
    .catch(err => console.warn('[Shipping] background ship failed:', err.message));
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
        subject: `Order confirmed ${order.orderNumber || order._id} — Nansei Organics`,
        html: orderConfirmation(order, user),
        idempotencyKey: 'order-confirm/' + String(order._id),
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
        idempotencyKey: 'order-admin/' + String(order._id),
      });
      console.log('✅ Admin order notification sent to', adminEmail);
    }
  } catch (err) {
    console.warn('⚠️  Admin email notification failed:', err.message);
  }
}


/** Everything the paid-order step needs, wired to the real database and Razorpay. */
function paidOrderDeps() {
  const PendingPayment = require('../models/PendingPayment');
  return {
    Order,
    PendingPayment,
    buildOrder: payload => buildOrder(payload, guardContext('Razorpay')),
    fetchPaidAmount: async rzpOrderId => {
      const o = await getRazorpay().orders.fetch(rzpOrderId);
      return o && o.amount_paid ? Number(o.amount_paid) : (o ? Number(o.amount) : null);
    },
    takeStock: items => takeStock(items, { strict: false }),
    afterCreate: async (order, userId) => {
      await Cart.findOneAndDelete({ user: userId });
      countCouponUse(order);
      const User = require('../models/User');
      const userDoc = await User.findById(userId).select('name email').lean();
      sendOrderEmails(order, userDoc); // fire-and-forget
      shipInBackground(order._id);
    },
  };
}

const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8'), y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

/**
 * POST /api/orders/razorpay/create — starts an online payment.
 * Signed-in checkout sends { orderPayload }: the server prices the cart, asks Razorpay for exactly that amount
 * and keeps the cart (PendingPayment) so the order can be saved even if the browser never returns.
 * Older clients that send only { amount } still work.
 */
router.post('/razorpay/create', optionalAuth, async (req, res) => {
  try {
    const { orderPayload, currency = 'INR' } = req.body || {};
    const rzp = getRazorpay();

    if (orderPayload && req.user && req.user.id) {
      const doc = await buildOrder(orderPayload, guardContext('Razorpay'));
      const amount = Math.round(doc.totalPrice * 100);
      const rzpOrder = await rzp.orders.create({ amount, currency: 'INR', receipt: 'nso_' + Date.now(), notes: { user: String(req.user.id) } });
      await require('../models/PendingPayment').create({ rzpOrderId: rzpOrder.id, user: req.user.id, payload: orderPayload, amount: rzpOrder.amount });
      return res.json({ success: true, data: { orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID, total: doc.totalPrice } });
    }

    const amount = Number(req.body && req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount (in ₹) is required' });
    const rzpOrder = await rzp.orders.create({ amount: Math.round(amount * 100), currency, receipt: 'rcpt_' + Date.now() });
    res.json({ success: true, data: { orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID } });
  } catch (err) {
    if (err instanceof OrderError || err.status === 409) return res.status(err.status || 400).json({ success: false, message: err.message });
    const msg = rzpErrMsg(err);
    console.error('[Razorpay] create-order error:', msg);
    res.status(err.statusCode === 401 ? 401 : 500).json({ success: false, message: msg });
  }
});

/**
 * POST /api/orders/razorpay/verify — the browser reports a successful payment.
 * Checks Razorpay's signature (HMAC-SHA256 of order_id|payment_id with the key secret) and saves the order once.
 */
router.post('/razorpay/verify', optionalAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderPayload } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay keys not configured in .env');
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    if (!safeEqualHex(expected, razorpay_signature)) {
      return res.status(400).json({ success: false, verified: false, message: 'Invalid payment signature' });
    }
    if (!req.user || !req.user.id) return res.json({ success: true, verified: true, paymentId: razorpay_payment_id });

    const out = await finalizePaidOrder(paidOrderDeps(), {
      rzpOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      fallback: orderPayload ? { payload: orderPayload, user: req.user.id } : null,
      waitMs: 6000,
    });
    if (out.order) return res.json({ success: true, verified: true, data: out.order, duplicate: !out.created });
    if (out.pending) return res.status(202).json({ success: false, verified: true, message: 'Your payment went through and your order is being saved. It will appear in My Orders in a minute. Payment ' + razorpay_payment_id + '.' });
    return res.status(400).json({ success: false, verified: true, message: 'We received your payment but could not find your cart. Please contact us with payment ' + razorpay_payment_id + '.' });
  } catch (err) {
    if (err instanceof OrderError || err instanceof PaidOrderError) return res.status(err.status).json({ success: false, verified: true, message: err.message });
    const msg = rzpErrMsg(err);
    console.error('[Razorpay] verify error:', msg);
    res.status(500).json({ success: false, message: msg });
  }
});

/**
 * POST /api/orders/razorpay/webhook — Razorpay → us (Dashboard → Webhooks, events payment.captured and order.paid,
 * secret = RAZORPAY_WEBHOOK_SECRET). The body arrives raw (see server.js) because the signature covers the exact bytes.
 * Answers 2xx once the event is handled or safely ignorable; 5xx makes Razorpay retry for up to 24 hours.
 */
router.post('/razorpay/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'Webhook secret not configured' });
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!safeEqualHex(expected, req.get('x-razorpay-signature'))) return res.status(400).json({ success: false, message: 'Invalid signature' });

  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch (e) { return res.status(400).json({ success: false, message: 'Bad JSON' }); }
  const type = event && event.event;
  if (type !== 'payment.captured' && type !== 'order.paid') return res.json({ success: true, ignored: type || 'unknown' });

  const payment = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!payment || !payment.order_id || !payment.id) return res.json({ success: true, ignored: 'no payment' });
  try {
    const out = await finalizePaidOrder(paidOrderDeps(), { rzpOrderId: payment.order_id, paymentId: payment.id });
    if (out.created) console.log('[Razorpay] webhook saved order', out.order.orderNumber, 'for payment', payment.id);
    if (out.unmatched) console.warn('[Razorpay] webhook: no stored checkout for', payment.order_id, payment.id);
    return res.json({ success: true });
  } catch (err) {
    if (err instanceof PaidOrderError || err instanceof OrderError) {
      // a bad cart or an amount mismatch will not fix itself by retrying: log it for the owner and stop
      console.error('[Razorpay] webhook could not save order for payment', payment.id, '-', err.message);
      return res.json({ success: false, message: err.message });
    }
    console.error('[Razorpay] webhook error:', rzpErrMsg(err));
    return res.status(500).json({ success: false });   // Razorpay retries
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
    const { status, trackingNumber, courierService, trackingUrl, estimatedDelivery, isPaid, notes } = req.body;
    const allowedStatuses = ['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }
    const update = { orderStatus: status };
    if (status === 'Shipped') {
      if (trackingNumber) update.trackingNumber = trackingNumber;
      if (courierService)  update.courierService  = courierService;
    }
    if (status === 'Shipped' || status === 'Delivered') {
      if (trackingUrl !== undefined) {
        if (trackingUrl && !/^https:\/\//i.test(String(trackingUrl))) return res.status(400).json({ success: false, message: 'The tracking link must start with https://' });
        update.trackingUrl = String(trackingUrl || '').slice(0, 500);
      }
      if (estimatedDelivery) { const d = new Date(estimatedDelivery); if (!isNaN(d)) update.estimatedDelivery = d; }
    }
    if (status === 'Delivered') { update.isDelivered = true; update.deliveredAt = new Date(); }
    if (status === 'Cancelled') { update.cancelledAt = new Date(); }
    if (isPaid === true) { update.isPaid = true; update.paidAt = new Date(); }
    if (notes !== undefined) update.notes = String(notes || '').replace(/<[^>]*>/g, '').slice(0, 1000);

    const before = await Order.findById(req.params.id).select('orderStatus items paymentMethod isPaid').lean();
    if (!before) return res.status(404).json({ success: false, message: 'Order not found' });
    // cash on delivery is collected on delivery, so a delivered COD order is a paid order
    if (status === 'Delivered' && before.paymentMethod === 'COD' && !before.isPaid) { update.isPaid = true; update.paidAt = new Date(); }
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (status === 'Cancelled' && before.orderStatus !== 'Cancelled') await returnStock(before.items);
    if (status === 'Cancelled') shippingService.cancelForOrder(order);   // release the courier booking
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] PUT /:id/status error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
//  USER ROUTES
// ─────────────────────────────────────────────────────────

/** GET /api/orders/pricing — public: GST rate, free-delivery threshold and delivery fee used for every order */
router.get('/pricing', async (req, res) => {
  const st = require('../utils/settings');
  res.json({ success: true, data: pricingRules(st.pricingFrom(await st.getStoreSettings())) });
});

router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort('-createdAt')
      .lean();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[Orders] GET /my-orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** POST /api/orders — place a Cash on Delivery order (online payments are saved by /razorpay/verify after the payment is confirmed) */
router.post('/', protect, async (req, res) => {
  try {
    // the shop takes online payment only (Razorpay); orders are saved by /razorpay/verify and the webhook
    if (String((req.body && req.body.paymentMethod) || '').toUpperCase() === 'COD') return res.status(400).json({ success: false, message: 'Cash on delivery is not offered. Please pay online with UPI, card or net banking.' });
    const doc = await buildOrder(req.body, guardContext(codOnly(req.body && req.body.paymentMethod)));
    await takeStock(doc.items, { strict: true });
    let order;
    try { order = await Order.create({ ...doc, user: req.user.id, isPaid: false }); }
    catch (e) { await returnStock(doc.items); throw e; }
    await Cart.findOneAndDelete({ user: req.user.id });
    countCouponUse(order);
    const User = require('../models/User');
    const userDoc = await User.findById(req.user.id).select('name email').lean();
    sendOrderEmails(order, userDoc); // fire-and-forget
    shipInBackground(order._id);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err instanceof OrderError || err.status === 409) return res.status(err.status).json({ success: false, message: err.message });
    console.error('[Orders] POST / error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/orders/:id/cancel — a customer cancels their own order while it hasn't been dispatched yet.
 * Also releases the Shiprocket booking. Online payments are flagged for a manual refund.
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (String(order.user) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!['Pending', 'Processing', 'Packed'].includes(order.orderStatus)) {
      const why = order.orderStatus === 'Shipped' ? 'it has already been dispatched' : 'it is already ' + String(order.orderStatus).toLowerCase();
      return res.status(400).json({ success: false, message: 'This order can no longer be cancelled because ' + why });
    }
    order.orderStatus = 'Cancelled';
    order.cancelledAt = new Date();
    await returnStock(order.items);
    order.cancellationReason = String((req.body && req.body.reason) || '').slice(0, 200);
    if (order.isPaid) order.notes = ((order.notes || '') + ' [Refund pending: cancelled by customer after online payment]').trim();
    await order.save();
    shippingService.cancelForOrder(order);        // fire-and-forget
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] PUT /:id/cancel error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** GET /api/orders/:id — must be LAST to avoid swallowing named routes */
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone');
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
