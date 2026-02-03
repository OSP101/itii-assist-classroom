// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration (will be sent via postMessage from main app)
let firebaseConfig = null;

// Initialize Firebase when config is received
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

// Also try to initialize from environment (injected at build time)
// This is a fallback - the config will be passed via postMessage
const defaultConfig = {
  apiKey: self.FIREBASE_API_KEY || '',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '',
  projectId: self.FIREBASE_PROJECT_ID || '',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.FIREBASE_APP_ID || '',
};

function initializeFirebase() {
  const config = firebaseConfig || defaultConfig;
  
  if (!config.apiKey || !config.projectId) {
    console.log('[SW] Firebase config not available yet');
    return;
  }
  
  try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    
    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || payload.data?.title || 'แจ้งเตือน';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || '/images/logo.png',
        badge: '/images/badge.png',
        tag: payload.data?.tag || 'default',
        data: payload.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: payload.data?.requireInteraction === 'true',
        actions: getNotificationActions(payload.data?.type),
      };
      
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    console.log('[SW] Firebase Messaging initialized successfully');
  } catch (error) {
    console.error('[SW] Error initializing Firebase:', error);
  }
}

// Get notification actions based on type
function getNotificationActions(type) {
  switch (type) {
    case 'new-task':
      return [
        { action: 'view', title: 'ดูงาน' },
        { action: 'dismiss', title: 'ปิด' },
      ];
    case 'queue-ready':
      return [
        { action: 'view', title: 'ดูคิว' },
      ];
    case 'booking-completed':
      return [
        { action: 'view', title: 'ดูผล' },
      ];
    default:
      return [];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  let targetUrl = '/';
  
  // Determine URL based on notification type
  switch (data.type) {
    case 'new-task':
      targetUrl = data.workerUrl || `/classroom/${data.courseId}/queue/${data.sessionId}/worker`;
      break;
    case 'queue-ready':
    case 'booking-completed':
      targetUrl = data.bookingUrl || `/queue/book?pin=${data.pinCode}`;
      break;
    default:
      targetUrl = data.url || '/';
  }
  
  // Handle action buttons
  if (event.action === 'view') {
    // Open the target URL
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    return;
  }
  
  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window with matching URL
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Try to find any window from our origin
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Try to initialize immediately if config is available
if (defaultConfig.apiKey) {
  initializeFirebase();
}
