importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB8fDn9EduVJsx8unmUHo74TsT3fgWGMAM",
  authDomain: "lovable-order-database.firebaseapp.com",
  databaseURL: "https://lovable-order-database-default-rtdb.firebaseio.com",
  projectId: "lovable-order-database",
  storageBucket: "lovable-order-database.appspot.com",
  messagingSenderId: "814278451797",
  appId: "1:814278451797:web:236a8fc04a7f1762156adc",
  measurementId: "G-15VMWPH500"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('push', function(event) {
  const payload = event.data.json();
  const options = {
    body: payload.notification.body,
    icon: payload.notification.icon,
    // other options...
  };

  event.waitUntil(
    self.registration.showNotification(payload.notification.title, options)
  );
});
