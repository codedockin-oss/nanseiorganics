// firebase-messaging-sw.js — Nansei Organics
// Handles background push notifications for both admin and customers.

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyExample-ReplaceWithRealKey",
  authDomain:        "nansei-ddbf6.firebaseapp.com",
  projectId:         "nansei-ddbf6",
  storageBucket:     "nansei-ddbf6.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId:             "REPLACE_WITH_APP_ID",
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message:', payload);

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  // Route click URL: admin gets admin panel, customer gets orders page
  const clickUrl = data.url || (data.click_action === 'OPEN_ADMIN_PANEL'
    ? '/pages/admin-panel.html'
    : '/pages/checkoutmyorderpage.html');

  self.registration.showNotification(notification.title || 'Nansei Organics', {
    body:    notification.body  || '',
    icon:    '/nansei_org_logo.svg',
    badge:   '/nansei_org_logo.svg',
    tag:     data.orderNumber   || 'nansei-notification',
    renotify: true,
    data:    { url: clickUrl, orderId: data.orderId, orderNumber: data.orderNumber, status: data.status },
    actions: [
      { action: 'open', title: data.status ? 'View Order' : 'Open Admin Panel' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/pages/checkoutmyorderpage.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
