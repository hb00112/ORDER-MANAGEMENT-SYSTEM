self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'https://example.com/icon.png',
    badge: 'https://example.com/badge.png'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
