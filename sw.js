/* 하우스푸어 : 오프라인 캐시 */
var CACHE = 'housepoor-v28';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css?v=28',
  './js/sprites.js?v=28',
  './js/store.js?v=28',
  './js/calc.js?v=28',
  './js/pixel.js?v=28',
  './js/sync.js?v=28',
  './js/ui.js?v=28',
  './js/app.js?v=28',
  './fonts/JayeonSans-Regular.woff2',
  './fonts/JayeonSans-Medium.woff2',
  './icons/icon.svg',
  './icons/icon-maskable.svg'
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
