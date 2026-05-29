const express = require('express');

const Order = require('../models/Order');
const shiprocket = require('../utils/shiprocketService');
const { sendCustomerPushNotification } = require('../utils/fcm');

const router = express.Router();

function verifyShiprocketWebhook(req) {
  const expected = process.env.SHIPROCKET_WEBHOOK_SECRET || process.env.SHIPROCKET_API_KEY;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const provided = req.get('x-api-key') || req.get('x-shiprocket-token') || req.get('authorization')?.replace(/^Bearer\s+/i, '');
  return provided && provided === expected;
}

async function notifyIfNeeded(order, changed) {
  if (!changed || !['Confirmed', 'Shipped', 'Out For Delivery', 'Delivered'].includes(order.shippingStatus)) return;
  try {
    if (order.user?.fcmToken) await sendCustomerPushNotification(order, order.user.fcmToken);
  } catch (err) {
    console.warn('[Shiprocket webhook] Customer push failed:', err.message);
  }
}

router.post('/shiprocket', async (req, res) => {
  try {
    if (!verifyShiprocketWebhook(req)) {
      return res.status(401).json({ success: false, message: 'Invalid Shiprocket webhook token' });
    }

    const payload = req.body || {};
    const fields = shiprocket.extractWebhookFields(payload);
    if (!fields.awbCode && !fields.shipmentId) {
      return res.status(400).json({ success: false, message: 'Webhook missing AWB or shipment id' });
    }

    const order = await Order.findOne({
      $or: [
        ...(fields.awbCode ? [{ awbCode: fields.awbCode }] : []),
        ...(fields.shipmentId ? [{ shipmentId: fields.shipmentId }] : []),
      ],
    }).populate('user', 'name email phone fcmToken');

    if (!order) {
      console.warn('[Shiprocket webhook] No order found for payload:', {
        awbCode: fields.awbCode,
        shipmentId: fields.shipmentId,
      });
      return res.status(202).json({ success: true, message: 'Webhook accepted; order not found yet' });
    }

    const changed = shiprocket.applyTrackingToOrder(order, fields);
    await order.save();
    await notifyIfNeeded(order, changed);

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Shiprocket webhook] error:', err.message);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

module.exports = router;
