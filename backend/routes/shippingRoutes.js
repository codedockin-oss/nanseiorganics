'use strict';
const express = require('express');
const crypto = require('crypto');
const service = require('../utils/shippingService');

/**
 * Shipping routes. `deps` can be injected (tests do); production uses the real models.
 *
 *   POST /api/shipping/webhook        Shiprocket → us. Public, protected by the x-api-key token.
 *   POST /api/shipping/lookup         Guest tracking: order number + mobile number on the order.
 *   GET  /api/shipping/track/:id      Customer (own order) or admin. :id is the order's _id or order number.
 *   POST /api/shipping/:id/ship       Admin safety net: retry a shipment that failed.
 */
module.exports = function createShippingRouter(deps = {}) {
  const Order = deps.Order || require('../models/Order');
  const User = deps.User || require('../models/User');
  const { protect, authorize } = deps.protect ? deps : require('../middleware/auth');
  const notifyCustomer = deps.notifyCustomer || require('../utils/shippingEmails').notifyCustomer;
  const router = express.Router();
  const notify = (order, kind) => notifyCustomer(order, kind, User);

  const findOrder = id => /^[0-9a-fA-F]{24}$/.test(String(id)) ? Order.findById(id) : Order.findOne({ orderNumber: String(id) });

  function tokenOk(got, expected) {
    const a = Buffer.from(String(got || '')), b = Buffer.from(String(expected || ''));
    return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
  }

  router.post('/webhook', async (req, res) => {
    const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    if (!expected) return res.status(503).json({ success: false, message: 'Shipping webhook is not configured' });
    if (!tokenOk(req.get('x-api-key'), expected)) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
      const out = await service.handleWebhook({ Order, payload: req.body || {}, notify });
      res.status(200).json({ success: true, matched: out.matched });
    } catch (err) {
      // answer 200 so Shiprocket doesn't hammer us with retries; the live lookup will catch up later
      console.error('[Shipping] webhook error:', err.message);
      res.status(200).json({ success: true, matched: false });
    }
  });

  /* Guest lookup: order number + the mobile number used on the order. Wrong combinations all get the same answer,
     and each IP is limited, so this cannot be used to discover which order numbers exist. */
  const hits = new Map();
  function limited(ip) {
    const now = Date.now(), w = 15 * 60 * 1000, list = (hits.get(ip) || []).filter(x => now - x < w);
    list.push(now); hits.set(ip, list);
    if (hits.size > 5000) { for (const [k, v] of hits) if (!v.some(x => now - x < w)) hits.delete(k); }
    return list.length > 12;
  }
  const last10 = s => String(s || '').replace(/\D/g, '').slice(-10);
  router.post('/lookup', async (req, res) => {
    const notFound = () => res.status(404).json({ success: false, message: 'We could not find that order. Please check the order number and mobile number.' });
    try {
      if (limited(req.ip || 'unknown')) return res.status(429).json({ success: false, message: 'Too many tries. Please wait a few minutes and try again.' });
      const num = String((req.body && req.body.orderNumber) || '').trim().replace(/^#/, '').slice(0, 40);
      const phone = last10(req.body && req.body.phone);
      if (!num || phone.length < 10) return notFound();
      let order = await Order.findOne({ orderNumber: num });
      if (!order && /^[0-9a-fA-F]{24}$/.test(num)) order = await Order.findById(num);
      if (!order || last10(order.shippingAddress && order.shippingAddress.phone) !== phone) return notFound();
      order = await service.refreshTracking({ Order, order, notify });
      res.json({ success: true, data: service.publicTracking(order) });
    } catch (err) {
      console.error('[Shipping] lookup error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.get('/track/:id', protect, async (req, res) => {
    try {
      let order = await findOrder(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const isOwner = String(order.user) === String(req.user.id || req.user._id);
      if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });
      order = await service.refreshTracking({ Order, order, notify });
      res.json({ success: true, data: service.publicTracking(order) });
    } catch (err) {
      console.error('[Shipping] track error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.post('/:id/ship', protect, authorize('admin'), async (req, res) => {
    try {
      const order = await findOrder(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const out = await service.autoShip({ Order, User, orderId: order._id, force: true });
      if (out.error) return res.status(502).json({ success: false, message: out.error });
      res.json({ success: true, data: out });
    } catch (err) {
      console.error('[Shipping] ship error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
};
