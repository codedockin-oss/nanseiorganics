// firebase-messaging-sw.js
// Place this file in your root /pages/ folder

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "YOUR_API_KEY",
  authDomain:        "nansei-ddbf6.firebaseapp.com",
  projectId:         "nansei-ddbf6",
  storageBucket:     "nansei-ddbf6.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload);

  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon:  '/nansei_org_logo.svg',
    badge: '/nansei_org_logo.svg',
    data:  payload.data,
    actions: [
      { action: 'open', title: 'Open Admin Panel' },
    ],
  });
});

// Click on notification — open admin panel
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/pages/admin-panel.html')
  );
});
