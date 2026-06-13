// ============================================================
//  SERVICE WORKER — Liga Gualeguay PWA
//  Archivo: sw.js (raíz del proyecto)
// ============================================================

var CACHE_NAME = 'liga-gualeguay-v1';
var ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500&display=swap'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH — Network first, cache fallback ────────────────────
self.addEventListener('fetch', function(e) {
  // No cachear Apps Script ni Firebase
  if (e.request.url.indexOf('script.google.com') !== -1 ||
      e.request.url.indexOf('firebaseio.com') !== -1 ||
      e.request.url.indexOf('firebasedatabase') !== -1) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request, clone);
        });
        return res;
      })
      .catch(function() {
        return caches.match(e.request);
      })
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'Liga Gualeguay', body: e.data ? e.data.text() : '' }; }

  var options = {
    body:    data.body    || '',
    icon:    data.icon    || './imagenes/logo-pasion-azul.png',
    badge:   data.badge   || './imagenes/logo-pasion-azul.png',
    image:   data.image   || '',
    tag:     data.tag     || 'liga-gualeguay',
    data:    { url: data.url || './' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'Liga Gualeguay', options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) ? e.notification.data.url : './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url === url && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (futuro) ──────────────────────────────────
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-sorteos') {
    // Placeholder para sincronización en background
    console.log('SW: sync-sorteos');
  }
});
