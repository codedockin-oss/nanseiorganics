const admin = require('firebase-admin');

function getMessaging() {
  const ready = process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY;
  if (!ready) return null;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey:  process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin.messaging();
}

// ── Admin: new order notification via topic ──────────────────────────────
async function sendAdminPushNotification(order) {
  const messaging = getMessaging();
  if (!messaging) { console.warn('[FCM] Not configured; skipping admin push'); return; }
  await messaging.send({
    topic: 'admin-orders',
    notification: {
      title: `🛒 New Order — Rs.${Number(order.totalPrice || 0).toLocaleString('en-IN')}`,
      body:  `${order.shippingAddress?.fullName || 'Customer'} placed order #${order.orderNumber || order._id}`,
    },
    data: {
      orderId:     String(order._id),
      orderNumber: order.orderNumber || '',
      totalPrice:  String(order.totalPrice || 0),
      click_action:'OPEN_ADMIN_PANEL',
      url:         '/pages/admin-panel.html',
    },
    webpush: { fcmOptions: { link: '/pages/admin-panel.html' } },
  });
  console.log('[FCM] Admin push sent for order', order.orderNumber);
}

// ── Customer: order status notification via device token ─────────────────
const STATUS_MESSAGES = {
  Confirmed:  { title: 'Shipment Confirmed',  body: (n) => `Your order #${n} shipment has been confirmed.` },
  'Out For Delivery': { title: 'Out For Delivery', body: (n) => `Your order #${n} is out for delivery today.` },
  Processing: { title: '✅ Order Confirmed',  body: (n) => `Your order #${n} has been confirmed and is being prepared.` },
  Packed:     { title: '📦 Order Packed',     body: (n) => `Your order #${n} is packed and ready for pickup by courier.` },
  Shipped:    { title: '🚚 Order Shipped',    body: (n) => `Your order #${n} is on the way! Track it in My Orders.` },
  Delivered:  { title: '🎉 Order Delivered',  body: (n) => `Your order #${n} has been delivered. Enjoy your organics!` },
  Cancelled:  { title: '❌ Order Cancelled',  body: (n) => `Your order #${n} has been cancelled.` },
};

async function sendCustomerPushNotification(order, fcmToken) {
  const messaging = getMessaging();
  if (!messaging || !fcmToken) return;
  const status = order.shippingStatus || order.orderStatus;
  const tpl = STATUS_MESSAGES[status] || STATUS_MESSAGES[order.orderStatus];
  if (!tpl) return;
  const orderNum = order.orderNumber || String(order._id);
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title: tpl.title, body: tpl.body(orderNum) },
      data: {
        orderId:     String(order._id),
        orderNumber: orderNum,
        status,
        url:         '/pages/checkoutmyorderpage.html',
      },
      webpush: { fcmOptions: { link: '/pages/checkoutmyorderpage.html' } },
    });
    console.log('[FCM] Customer push sent:', status, orderNum);
  } catch (err) {
    // Token expired / unregistered — clean it up silently
    if (/registration-token-not-registered|invalid-registration-token/i.test(err.message)) {
      console.warn('[FCM] Stale customer token for order', orderNum, '— clearing');
      const User = require('../models/User');
      await User.findByIdAndUpdate(order.user, { $unset: { fcmToken: 1 } }).catch(() => {});
    } else {
      console.warn('[FCM] Customer push failed:', err.message);
    }
  }
}

async function subscribeAdminDevice(token) {
  const messaging = getMessaging();
  if (!messaging) throw new Error('FCM is not configured');
  return messaging.subscribeToTopic([token], 'admin-orders');
}

module.exports = { sendAdminPushNotification, sendCustomerPushNotification, subscribeAdminDevice };
