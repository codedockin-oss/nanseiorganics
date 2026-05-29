const express  = require('express');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const Razorpay = require('razorpay');

const sendEmail = require('../utils/sendEmail');
const { sendAdminPushNotification, sendCustomerPushNotification, subscribeAdminDevice } = require('../utils/fcm');
const { orderConfirmation, adminOrderNotification, orderStatusUpdate } = require('../utils/emailTemplates');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order   = require('../models/Order');
const Cart    = require('../models/Cart');
const Product = require('../models/Product');
const Coupon  = require('../models/Coupon');

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role };
    } catch { /* treat as guest */ }
  }
  next();
}

function rzpErrMsg(err) {
  if (!err) return 'Unknown Razorpay error';
  if (err.error?.description) return `[${err.statusCode}] ${err.error.description} (${err.error.code})`;
  return err.message || JSON.stringify(err);
}

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new Error('Razorpay keys not configured in .env');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ''));
}

async function incrementCouponUsage(couponCode) {
  if (!couponCode) return;
  try {
    await Coupon.findOneAndUpdate(
      { code: String(couponCode).trim().toUpperCase(), isActive: true },
      { $inc: { usedCount: 1 } }
    );
  } catch (err) {
    console.warn('[Coupon] usedCount increment failed:', err.message);
  }
}

async function buildTrustedOrderBody(raw, userId, payment = {}) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  if (!items.length) throw new Error('Order must contain at least one item');

  const productIds = items.map(i => String(i.product || i.id || '')).filter(isObjectId);
  const products   = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  const productMap = new Map(products.map(p => [String(p._id), p]));

  const trustedItems = items.map(item => {
    const productId = String(item.product || item.id || '');
    const qty = Math.max(parseInt(item.quantity || item.qty, 10) || 0, 0);
    if (qty < 1) throw new Error('Invalid item quantity');

    const product = productMap.get(productId);
    if (isObjectId(productId)) {
      if (!product) throw new Error('Product not found or inactive');
      if (product.stock < qty) throw new Error(`${product.name} has only ${product.stock} in stock`);
      return {
        product:  product._id,
        name:     product.name,
        image:    product.images?.[0]?.url || product.images?.[0] || item.image || '',
        quantity: qty,
        price:    product.price,
      };
    }
    const price = Number(item.price || 0);
    if (price <= 0) throw new Error('Invalid product price');
    return {
      product:  productId,
      name:     String(item.name || 'Product').slice(0, 200),
      image:    item.image || '',
      quantity: qty,
      price,
    };
  });

  const address = raw.shippingAddress || {};
  for (const field of ['fullName', 'addressLine1', 'city', 'state', 'pincode']) {
    if (!String(address[field] || '').trim()) throw new Error(`Shipping ${field} is required`);
  }
  if (!String(address.mobileNumber || address.phone || '').trim()) throw new Error('Shipping mobileNumber is required');

  const itemsPrice   = trustedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingPrice = Math.max(Number(raw.shippingPrice || 0), 0);
  const discount      = Math.max(Number(raw.discount || 0), 0);
  const taxPrice      = Math.round(itemsPrice * 0.05);
  const totalPrice    = Math.max(itemsPrice + shippingPrice + taxPrice - discount, 0);

  const paymentMethod = payment.method || raw.paymentMethod;
  if (!['COD', 'Razorpay', 'PayU', 'Stripe', 'UPI'].includes(paymentMethod))
    throw new Error('Invalid payment method');

  const phone   = String(address.mobileNumber || address.phone).replace(/\D/g, '').slice(-10);
  const alternateMobileNumber = String(address.alternateMobileNumber || '').replace(/\D/g, '').slice(-10);
  const pincode = String(address.pincode).replace(/\D/g, '').slice(0, 6);
  if (!/^[6-9]\d{9}$/.test(phone))   throw new Error('Valid 10-digit Indian mobile number is required');
  if (alternateMobileNumber && !/^[6-9]\d{9}$/.test(alternateMobileNumber)) throw new Error('Valid alternate mobile number is required');
  if (!/^\d{6}$/.test(pincode))  throw new Error('Valid shipping pincode is required');

  return {
    user: userId,
    items: trustedItems,
    shippingAddress: {
      fullName:              String(address.fullName).trim(),
      mobileNumber:          phone,
      phone,
      alternateMobileNumber,
      addressLine1:          String(address.addressLine1).trim(),
      addressLine2:          String(address.addressLine2 || '').trim(),
      city:                  String(address.city).trim(),
      state:                 String(address.state).trim(),
      pincode,
      country:               address.country || 'India',
    },
    paymentMethod,
    paymentInfo:      payment.info,
    itemsPrice, taxPrice, shippingPrice, discount, totalPrice,
    couponCode:       raw.couponCode,
    estimatedDelivery:raw.estimatedDelivery,
    isPaid:           !!payment.isPaid,
    paidAt:           payment.isPaid ? (payment.paidAt || new Date()) : undefined,
  };
}

async function reduceStockForOrder(order) {
  const ops = (order.items || [])
    .filter(i => isObjectId(i.product))
    .map(i => ({
      updateOne: {
        filter: { _id: i.product, stock: { $gte: i.quantity } },
        update: { $inc: { stock: -i.quantity } },
      },
    }));
  if (ops.length) await Product.bulkWrite(ops);
}

async function sendOrderNotifications(order, user) {
  try {
    const email = user?.email;
    if (email) {
      await sendEmail({
        email,
        subject: `Order Confirmed #${order.orderNumber} — Nansai Organics`,
        html: orderConfirmation(order, user),
      });
    }
  } catch (err) { console.warn('[Email] Order confirmation failed:', err.message); }

  try {
    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        email: process.env.ADMIN_EMAIL,
        subject: `New order #${order.orderNumber}`,
        html: adminOrderNotification(order),
      });
    }
  } catch (err) { console.warn('[Email] Admin notification failed:', err.message); }

  try { await sendAdminPushNotification(order); }
  catch (err) { console.warn('[FCM] Admin push failed:', err.message); }
}

// ─────────────────────────────────────────────────────────
//  RAZORPAY
// ─────────────────────────────────────────────────────────

router.post('/razorpay/create', protect, async (req, res) => {
  try {
    const { currency = 'INR' } = req.body;
    const body     = await buildTrustedOrderBody(req.body, req.user.id, { method: 'Razorpay', isPaid: false });
    const rzp      = getRazorpay();
    const rzpOrder = await rzp.orders.create({
      amount:  Math.round(body.totalPrice * 100),
      currency,
      receipt: 'rcpt_' + Date.now(),
    });
    res.json({ success: true, data: { orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID, totalPrice: body.totalPrice } });
  } catch (err) {
    const msg = rzpErrMsg(err);
    console.error('[Razorpay] create-order error:', msg);
    res.status(/required|invalid|not found|stock|quantity/i.test(msg) ? 400 : 500).json({ success: false, message: msg });
  }
});

router.post('/razorpay/verify', optionalAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderPayload } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, verified: false, message: 'Invalid payment signature' });

    if (orderPayload && req.user?.id) {
      const existing = await Order.findOne({ 'paymentInfo.id': razorpay_payment_id }).lean();
      if (existing) return res.json({ success: true, verified: true, data: existing });

      const body = await buildTrustedOrderBody(orderPayload, req.user.id, {
        isPaid: true, paidAt: new Date(),
        info:   { id: razorpay_payment_id, status: 'completed', paidAt: new Date() },
        method: 'Razorpay',
      });
      const rzpOrder = await getRazorpay().orders.fetch(razorpay_order_id);
      if (Number(rzpOrder.amount) !== Math.round(body.totalPrice * 100))
        return res.status(400).json({ success: false, verified: false, message: 'Paid amount does not match order total' });

      const order = await Order.create(body);
      await reduceStockForOrder(order);
      await incrementCouponUsage(orderPayload.couponCode);
      await Cart.findOneAndDelete({ user: req.user.id });
      const User = require('../models/User');
      const userDoc = await User.findById(req.user.id).select('name email').lean();
      sendOrderNotifications(order, userDoc);
      return res.json({ success: true, verified: true, data: order });
    }

    res.json({ success: true, verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    const msg = rzpErrMsg(err);
    console.error('[Razorpay] verify error:', msg);
    res.status(/required|invalid|not found|stock|quantity|amount/i.test(msg) ? 400 : 500).json({ success: false, message: msg });
  }
});

// ─────────────────────────────────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────────────────────────────────

// GET /api/orders — list all orders (admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') query.orderStatus = status;
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [
        { orderId: rx }, { orderNumber: rx },
        { 'shippingAddress.fullName': rx }, { 'shippingAddress.mobileNumber': rx },
      ];
    }
    const safeLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const safePage  = Math.max(parseInt(page, 10)  || 1,  1);
    const [orders, total] = await Promise.all([
      Order.find(query).populate('user', 'name email phone').sort('-createdAt').skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      Order.countDocuments(query),
    ]);
    res.json({ success: true, data: orders, total, page: safePage, pages: Math.ceil(total / safeLimit) });
  } catch (err) {
    console.error('[Orders] GET / error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/orders/:id/shipping-status — update shipping status (admin)
router.put('/:id/shipping-status', protect, authorize('admin'), async (req, res) => {
  try {
    const { shippingStatus, trackingUrl, awbCode, courierName, estimatedDeliveryDate } = req.body;
    const allowed = ['Pending', 'Confirmed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(shippingStatus))
      return res.status(400).json({ success: false, message: 'Invalid shipping status' });
    if (shippingStatus !== 'Cancelled') {
      return res.status(410).json({ success: false, message: 'Manual shipping updates are disabled. Use Create Shipment and Shiprocket webhooks/sync.' });
    }

    const update = { shippingStatus };
    if (trackingUrl !== undefined) update.trackingUrl = trackingUrl;
    if (awbCode     !== undefined) update.awbCode     = awbCode;
    if (courierName !== undefined) update.courierName = courierName;
    if (estimatedDeliveryDate !== undefined) update.estimatedDeliveryDate = estimatedDeliveryDate;

    // Keep orderStatus in sync
    if (shippingStatus === 'Shipped')   { update.orderStatus = 'Shipped'; }
    if (shippingStatus === 'Delivered') { update.orderStatus = 'Delivered'; update.isDelivered = true; update.deliveredAt = new Date(); }
    if (shippingStatus === 'Cancelled') { update.orderStatus = 'Cancelled'; update.cancelledAt = new Date(); }
    if (shippingStatus === 'Confirmed') { update.orderStatus = 'Packed'; }

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email phone fcmToken');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Email
    if (order.user?.email && ['Confirmed', 'Shipped', 'Delivered', 'Cancelled'].includes(shippingStatus)) {
      sendEmail({
        email:   order.user.email,
        subject: `Order #${order.orderNumber} — Shipping update: ${shippingStatus}`,
        html:    orderStatusUpdate(order),
      }).catch(err => console.warn('[Email] Shipping status email failed:', err.message));
    }

    // FCM push
    if (order.user?.fcmToken && ['Confirmed', 'Shipped', 'Delivered'].includes(shippingStatus)) {
      sendCustomerPushNotification(order, order.user.fcmToken)
        .catch(err => console.warn('[FCM] Customer push failed:', err.message));
    }

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] PUT /:id/shipping-status error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/orders/:id/status — update order status (admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    return res.status(410).json({ success: false, message: 'Manual order status updates are disabled. Shipping statuses are controlled by Shiprocket.' });
    const { status, notes } = req.body;
    const allowed = ['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid order status' });

    const update = { orderStatus: status };
    if (notes)                update.notes        = notes;
    if (status === 'Delivered') { update.isDelivered = true; update.deliveredAt = new Date(); }
    if (status === 'Cancelled') { update.cancelledAt = new Date(); }

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email phone fcmToken');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Email notification
    if (order.user?.email && ['Packed', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      sendEmail({
        email:   order.user.email,
        subject: `Order #${order.orderNumber} is ${status} — Nansai Organics`,
        html:    orderStatusUpdate(order),
      }).catch(err => console.warn('[Email] Status update failed:', err.message));
    }

    // FCM push to customer
    if (order.user?.fcmToken) {
      sendCustomerPushNotification(order, order.user.fcmToken)
        .catch(err => console.warn('[FCM] Customer push failed:', err.message));
    }

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] PUT /:id/status error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/orders/bulk-status — bulk update status (admin)
router.post('/bulk-status', protect, authorize('admin'), async (req, res) => {
  try {
    const { orderIds = [], status } = req.body;
    const allowed = ['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!Array.isArray(orderIds) || !orderIds.length)
      return res.status(400).json({ success: false, message: 'Select at least one order' });
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid order status' });

    const objectIds = orderIds.filter(id => isObjectId(id));
    const result = await Order.updateMany(
      { $or: [{ _id: { $in: objectIds } }, { orderId: { $in: orderIds } }, { orderNumber: { $in: orderIds } }] },
      { $set: { orderStatus: status } }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    console.error('[Orders] POST /bulk-status error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
//  FCM TOKEN ROUTES
// ─────────────────────────────────────────────────────────

router.post('/subscribe-fcm', protect, authorize('admin'), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'FCM token required' });
    await subscribeAdminDevice(token);
    res.json({ success: true, message: 'Subscribed to admin-orders topic' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/save-fcm-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'FCM token required' });
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, { fcmToken: token });
    res.json({ success: true, message: 'Token saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
//  USER ROUTES
// ─────────────────────────────────────────────────────────

// GET /api/orders/my-orders
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort('-createdAt').lean();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[Orders] GET /my-orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/orders — place COD order
router.post('/', protect, async (req, res) => {
  try {
    const payMethodMap = { razorpay: 'Razorpay', payu: 'PayU', cod: 'COD', upi: 'UPI', stripe: 'Stripe' };
    const method = payMethodMap[(req.body.paymentMethod || '').toLowerCase()] || req.body.paymentMethod;
    if (method !== 'COD')
      return res.status(400).json({ success: false, message: 'Online payments must use the verified payment flow' });

    const body  = await buildTrustedOrderBody(req.body, req.user.id, { isPaid: false, method });
    const order = await Order.create(body);
    await reduceStockForOrder(order);
    await incrementCouponUsage(req.body.couponCode);
    await Cart.findOneAndDelete({ user: req.user.id });
    const User = require('../models/User');
    const userDoc = await User.findById(req.user.id).select('name email').lean();
    sendOrderNotifications(order, userDoc);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] POST / error:', err.message);
    const status = /required|invalid|not found|stock|quantity/i.test(err.message) ? 400 : 500;
    res.status(status).json({ success: false, message: status === 400 ? err.message : 'Server error' });
  }
});

// GET /api/orders/:id — single order (owner or admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const ownerId = order.user?._id?.toString() || order.user?.toString();
    if (ownerId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Orders] GET /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
