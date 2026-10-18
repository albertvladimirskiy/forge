const CACHE = 'forge-v25';
const ASSETS = ['./','./index.html','./foods-db.js','./exercises-db.js','./quotes-db.js','./micros-db.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Network first so new code shows up, but never wait long: on weak gym wifi a fetch can hang for a minute, and the app's
   scripts block its start. After 2.5 s the cached copy is used and the fetch carries on in the background to refresh it. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    const net = fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    });
    if (!cached) return net.catch(() => caches.match('./index.html'));
    return Promise.race([net, new Promise(res => setTimeout(() => res(cached), 2500))]).catch(() => cached);
  })());
});
