const admin = require('firebase-admin');

// Initialize only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FCM_PROJECT_ID,
      clientEmail:  process.env.FCM_CLIENT_EMAIL,
      privateKey:   process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Send push notification to admin device(s).
 * Uses a topic 'admin-orders' — admin device must subscribe to this topic.
 */
async function sendAdminPushNotification(order) {
  if (!process.env.FCM_PROJECT_ID) {
    console.warn('⚠️  FCM not configured — skipping push notification');
    return;
  }

  const message = {
    topic: 'admin-orders',
    notification: {
      title: `🛒 New Order — ₹${order.totalPrice?.toLocaleString('en-IN')}`,
      body:  `${order.shippingAddress?.fullName || 'Customer'} placed order #${order.orderNumber}`,
    },
    data: {
      orderId:     String(order._id),
      orderNumber: order.orderNumber || '',
      totalPrice:  String(order.totalPrice || 0),
      click_action: 'OPEN_ADMIN_PANEL',
    },
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'orders' },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  };

  const response = await admin.messaging().send(message);
  console.log('✅ Admin push notification sent:', response);
}

module.exports = { sendAdminPushNotification };
