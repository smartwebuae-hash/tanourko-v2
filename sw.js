/* تطبيق تنوركو: يخلي الموقع قابل للتثبيت، ويفتح صفحة الروابط حتى لو النت ضعيف.
   باقي الصفحات (المنيو، اللوحات…) تمر مباشرة بدون أي تخزين. */
var CACHE = 'tanourko-app-v1';
var HOME = './tanourko-links.html';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll([HOME, './icon-192.png', './icon-512.png']); }).catch(function () {}));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('tanourko-app-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || !/tanourko-links\.html$/.test(url.pathname)) return;
  /* دائمًا أحدث نسخة من النت، ولو ما في نت نعرض آخر نسخة محفوظة */
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(HOME, copy); });
    return res;
  }).catch(function () { return caches.match(HOME); }));
});
