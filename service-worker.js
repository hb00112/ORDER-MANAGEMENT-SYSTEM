
const CACHE_NAME = 'pwa-test-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://s3.ezgif.com/tmp/ezgif-3-092ebae015.png',
  'https://res.cloudinary.com/dfb8lszpo/video/upload/v1727802463/xtlzfrrwrmnnymz5tz43.mp4'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('your-cache-name').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        'https://res.cloudinary.com/dfb8lszpo/video/upload/v1727802463/xtlzfrrwrmnnymz5tz43.mp4',
        // other assets...
      ]);
    })
  );
});


self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});


