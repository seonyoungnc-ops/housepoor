/* 하우스푸어 : 오프라인 캐시 */
var CACHE = 'housepoor-v7';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css?v=7',
  './js/sprites.js?v=7',
  './js/store.js?v=7',
  './js/calc.js?v=7',
  './js/pixel.js?v=7',
  './js/sync.js?v=7',
  './js/ui.js?v=7',
  './js/app.js?v=7',
  './fonts/Galmuri11.woff2',
  './fonts/Galmuri11-Bold.woff2',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11.woff2',
  'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11-Bold.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () { });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var sameOrigin = new URL(req.url).origin === location.origin;
  if (req.method !== 'GET') return;
  /* CDN 폰트는 캐시 우선으로만 처리 */
  if (!sameOrigin) {
    if (req.destination !== 'font') return;
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    }));
    return;
  }

  /* HTML : 네트워크 우선 (업데이트 반영) */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* 그 외 : 캐시 우선 */
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    }).catch(function () { return caches.match('./index.html'); })
  );
});
