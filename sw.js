/* 하우스푸어 : 오프라인 캐시 */
var CACHE = 'housepoor-v43';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css?v=43',
  './js/sprites.js?v=43',
  './js/store.js?v=43',
  './js/calc.js?v=43',
  './js/pixel.js?v=43',
  './js/sync.js?v=43',
  './js/qrcode.min.js?v=43',
  './js/ui.js?v=43',
  './js/app.js?v=43',
  './fonts/JayeonSans-Regular.woff2',
  './fonts/JayeonSans-Medium.woff2',
  './icons/icon.svg',
  './icons/icon-maskable.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        /* 설치 때도 HTTP 캐시를 거치지 않고 새로 받는다 */
        return c.add(new Request(u, { cache: 'reload' })).catch(function () { });
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

  /* HTML : 네트워크 우선 (업데이트 반영)
     GitHub Pages 가 HTML 에 max-age=600 을 붙이므로 브라우저 HTTP 캐시를 건너뛴다.
     (안 그러면 배포 후 최대 10분간 옛 index.html → 옛 JS 를 계속 받는다) */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0) {
    e.respondWith(
      fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (res) {
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
