
const CACHE_NAME = 'pwa-test-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://s3.ezgif.com/tmp/ezgif-3-092ebae015.png',
  'https://github.com/username/repo-name/raw/main/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Add this to your service-worker.js file

// Listen for push events from Firebase
self.addEventListener('push', function (event) {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/path/to/icon.png', // Optional: Replace with your app's notification icon
    vibrate: [200, 100, 200],  // Optional: Add vibration pattern
    data: { primaryKey: 1 },   // Optional: Add custom data for notification actions
    actions: [
      { action: 'explore', title: 'Open App' }  // Optional: Add custom action button
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Optional: Handle notification click events
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')  // Customize the URL as needed
  );
});

