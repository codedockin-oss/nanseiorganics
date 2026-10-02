'use strict';
/**
 * Order ⇄ Shiprocket glue. Every function takes the models it needs, so it can be tested without MongoDB.
 * Nothing here ever throws into the order flow: shipping problems are stored on the order (shippingError)
 * and logged — the customer's order is never blocked by a courier problem.
 */
const shiprocket = require('./shiprocket');

const REFRESH_AFTER_MS = 15 * 60 * 1000;

const log = (...a) => console.log('[Shipping]', ...a);

/**
 * Creates the shipment for a freshly placed order (COD, or prepaid and paid).
 * `force` re-tries an order that previously failed.
 */
async function autoShip({ Order, User, orderId, force = false }) {
  if (!shiprocket.isConfigured()) return { skipped: 'not configured' };
  if (!force && !shiprocket.autoShipEnabled()) return { skipped: 'auto-ship disabled' };
  const order = await Order.findById(orderId);
  if (!order) return { skipped: 'order not found' };
  if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Refunded') return { skipped: 'order cancelled' };
  const cod = String(order.paymentMethod).toUpperCase() === 'COD';
  if (!cod && !order.isPaid) return { skipped: 'waiting for payment' };
  if (order.shiprocketShipmentId && order.trackingNumber) return { skipped: 'already shipped' };

  const user = User ? await User.findById(order.user).select('name email phone').lean() : null;
  try {
    const out = await shiprocket.createShipment(order, user, {
      assignAwb: true,
      existing: { shiprocketOrderId: order.shiprocketOrderId, shipmentId: order.shiprocketShipmentId, awb: order.trackingNumber, courier: order.courierService },
    });
    const events = (order.trackingEvents || []).concat([{ at: new Date(), status: 'Shipment created', activity: out.courier ? 'Courier assigned: ' + out.courier : 'Shipment created', location: '' }]);
    const update = {
      shiprocketOrderId: out.shiprocketOrderId,
      shiprocketShipmentId: out.shipmentId,
      trackingNumber: out.awb,
      courierService: out.courier,
      trackingUrl: out.trackingUrl,
      shippingError: '',
      trackingEvents: events,
    };
    if (order.orderStatus === 'Pending') update.orderStatus = 'Processing';
    await Order.findByIdAndUpdate(order._id, update);
    log('shipment created for', order.orderNumber || order._id, 'AWB', out.awb, out.courier);
    return { ok: true, awb: out.awb };
  } catch (err) {
    const partial = err.partial || {};
    const msg = String(err.message || err).slice(0, 300);
    const update = { shippingError: msg };
    if (partial.shiprocketOrderId) { update.shiprocketOrderId = partial.shiprocketOrderId; update.shiprocketShipmentId = partial.shipmentId; }
    try { await Order.findByIdAndUpdate(order._id, update); } catch (_) { /* logged below */ }
    console.error('[Shipping] could not ship', order.orderNumber || order._id, '-', msg);
    return { error: msg };
  }
}

async function findOrderForPayload(Order, p) {
  const or = [];
  if (p.awb) or.push({ trackingNumber: String(p.awb) });
  if (p.sr_order_id) or.push({ shiprocketOrderId: String(p.sr_order_id) });
  if (p.order_id) or.push({ orderNumber: String(p.order_id) });
  if (!or.length) return null;
  return Order.findOne({ $or: or });
}

/** Applies one tracking payload (webhook or live lookup) to its order. Returns the update summary. */
async function applyTracking({ Order, order, payload, notify }) {
  const r = shiprocket.buildTrackingUpdate(order, payload);
  if (r.changed || !order.lastTrackingSync) await Order.findByIdAndUpdate(order._id, r.update);
  if (notify) {
    if (r.becameDelivered) await notify(order, 'delivered');
    else if (r.becameShipped) await notify(order, 'shipped');
  }
  return r;
}

async function handleWebhook({ Order, payload, notify }) {
  const order = await findOrderForPayload(Order, payload || {});
  if (!order) return { matched: false };
  const r = await applyTracking({ Order, order, payload, notify });
  return { matched: true, status: r.update.orderStatus || order.orderStatus };
}

/** Live lookup when the customer opens tracking and our stored data is stale. */
async function refreshTracking({ Order, order, notify, force = false }) {
  if (!shiprocket.isConfigured() || !order.trackingNumber) return order;
  const last = order.lastTrackingSync ? new Date(order.lastTrackingSync).getTime() : 0;
  if (!force && Date.now() - last < REFRESH_AFTER_MS) return order;
  if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') return order;
  try {
    const payload = await shiprocket.trackAwb(order.trackingNumber);
    await applyTracking({ Order, order, payload, notify });
    return (await Order.findById(order._id)) || order;
  } catch (err) {
    console.warn('[Shipping] live tracking failed:', err.message);
    return order;
  }
}

/** Called when an order is cancelled — releases the courier booking if one exists and hasn't been picked up. */
async function cancelForOrder(order) {
  if (!shiprocket.isConfigured() || !order.shiprocketOrderId) return { skipped: true };
  try { await shiprocket.cancelShipment(order.shiprocketOrderId); return { ok: true }; }
  catch (err) { console.warn('[Shipping] cancel at Shiprocket failed:', err.message); return { error: err.message }; }
}

/** Customer-facing shape of an order's tracking, for GET /api/shipping/track/:id */
function publicTracking(order) {
  return {
    orderNumber: order.orderNumber || String(order._id),
    status: order.orderStatus,
    shipmentStatus: order.shipmentStatus || '',
    courier: order.courierService || '',
    awb: order.trackingNumber || '',
    trackingUrl: order.trackingUrl || '',
    estimatedDelivery: order.estimatedDelivery || null,
    deliveredAt: order.deliveredAt || null,
    events: (order.trackingEvents || []).map(e => ({ at: e.at, status: e.status, activity: e.activity, location: e.location })).sort((a, b) => new Date(b.at) - new Date(a.at)),
  };
}

module.exports = { autoShip, handleWebhook, refreshTracking, cancelForOrder, applyTracking, publicTracking, REFRESH_AFTER_MS };
