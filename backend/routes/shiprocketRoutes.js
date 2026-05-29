const express = require('express');
const router = express.Router();

const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');
const shiprocket = require('../utils/shiprocketService');

function applyShippingStatus(order, status) {
  shiprocket.applyTrackingToOrder(order, { shippingStatus: status, currentTrackingStatus: status });
}

// POST /api/shiprocket/shipments
// Creates the Shiprocket shipment and assigns AWB automatically.
router.post('/shipments', protect, admin, async (req, res) => {
  try {
    const { orderId, courierId } = req.body;
    const order = await Order.findById(orderId).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.shippingStatus === 'Cancelled' || order.orderStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled orders cannot be shipped' });
    }
    if (order.shipmentId && order.awbCode) {
      return res.json({ success: true, data: order, message: 'Shipment already exists' });
    }

    const shipment = await shiprocket.createShipment(order);
    const shipmentId = shiprocket.extractShipmentId(shipment);
    if (!shipmentId) throw new Error('Shiprocket did not return a shipment id');

    let awb = {};
    try {
      awb = await shiprocket.assignAwb(shipmentId, courierId);
    } catch (err) {
      order.shipmentId = String(shipmentId);
      applyShippingStatus(order, 'Confirmed');
      await order.save();
      return res.status(202).json({
        success: true,
        data: order,
        message: `Shipment created, but AWB assignment needs attention in Shiprocket: ${err.message}`,
      });
    }

    const awbCode = shiprocket.extractAwb(awb);
    shiprocket.applyTrackingToOrder(order, {
      shipmentId: String(shipmentId),
      awbCode,
      courierName: shiprocket.extractCourier(awb),
      trackingUrl: shiprocket.trackingUrl(awbCode),
      estimatedDeliveryDate: shiprocket.extractEta(awb),
      shippingStatus: awbCode ? 'Shipped' : 'Confirmed',
      currentTrackingStatus: awbCode ? 'AWB assigned' : 'Shipment confirmed',
    });
    await order.save();

    res.json({ success: true, data: order, shiprocket: { shipment, awb } });
  } catch (err) {
    console.error('[Shiprocket] create shipment error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Shiprocket shipment failed' });
  }
});

// POST /api/shiprocket/shipments/:orderId/sync
router.post('/shipments/:orderId/sync', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('user', 'name email fcmToken');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.awbCode) return res.status(400).json({ success: false, message: 'AWB is not available yet' });

    const tracking = await shiprocket.trackAwb(order.awbCode);
    const changed = shiprocket.applyTrackingToOrder(order, {
      awbCode: order.awbCode,
      trackingUrl: order.trackingUrl || shiprocket.trackingUrl(order.awbCode),
      estimatedDeliveryDate: shiprocket.extractEta(tracking),
      currentTrackingStatus: shiprocket.extractRawTrackingStatus(tracking),
      shippingStatus: shiprocket.mapTrackingStatus(tracking),
    });
    await order.save();

    res.json({ success: true, data: order, tracking });
  } catch (err) {
    console.error('[Shiprocket] sync error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Tracking sync failed' });
  }
});

// GET /api/shiprocket/track/:orderId
router.get('/track/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('user', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const ownerId = order.user?._id?.toString() || order.user?.toString();
    if (ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!order.awbCode) return res.json({ success: true, data: order, tracking: null });

    const tracking = await shiprocket.trackAwb(order.awbCode);
    res.json({ success: true, data: order, tracking });
  } catch (err) {
    console.error('[Shiprocket] track error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Tracking failed' });
  }
});

module.exports = router;
