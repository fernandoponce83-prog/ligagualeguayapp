// ============================================================
//  FIREBASE MESSAGING SERVICE WORKER
//  Archivo: firebase-messaging-sw.js (raíz del proyecto)
//  Este archivo es REQUERIDO por Firebase Cloud Messaging
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCv7tt0id1FXRaHlNxdWewiY4a5SNAfe8c",
  authDomain:        "liga-gualeguay.firebaseapp.com",
  databaseURL:       "https://liga-gualeguay-default-rtdb.firebaseio.com",
  projectId:         "liga-gualeguay",
  storageBucket:     "liga-gualeguay.firebasestorage.app",
  messagingSenderId: "402887930793",
  appId:             "1:402887930793:web:4322b3d9f79f816b9b4ab8",
  measurementId:     "G-8GQ2GWHH27"
});

var messaging = firebase.messaging();

// Notificaciones en background (app cerrada o en segundo plano)
messaging.onBackgroundMessage(function(payload) {
  console.log('FCM background message:', payload);
  var data = payload.notification || payload.data || {};
  var options = {
    body:    data.body    || '',
    icon:    data.icon    || '/imagenes/logo-pasion-azul.png',
    badge:   '/imagenes/logo-pasion-azul.png',
    tag:     'liga-gualeguay-' + Date.now(),
    data:    { url: (payload.data && payload.data.url) || '/' },
    vibrate: [200, 100, 200],
  };
  self.registration.showNotification(data.title || 'Liga Gualeguay', options);
});
