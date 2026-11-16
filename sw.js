const CACHE = 'forge-v33';
const ASSETS = ['./','./index.html','./foods-db.js','./exercises-db.js','./quotes-db.js','./micros-db.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./fonts/inter-latin-wght-normal.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Network first so new code shows up, but never wait long: on weak gym wifi a fetch can hang for a minute, and the app's
   scripts block its start. After 2.5 s the cached copy is used and the fetch carries on in the background to refresh it.
   Only a good response (2xx) is cached or preferred: a 404 or 503 during a deploy or an outage must never replace the working
   copy, and with a cached copy on hand it is the one that is served. */
const ver = r => r && (r.headers.get('etag') || r.headers.get('last-modified'));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    let late = false;                                   // true once the cached copy has been served instead of waiting
    const net = fetch(e.request).then(r => {
      if (!r.ok){ if (cached) throw new Error('bad response'); return r; }
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      /* the page was started from the old copy and a newer one has now arrived: tell it, so it can say "reopen to update" */
      if (late && e.request.mode === 'navigate' && ver(r) && ver(cached) && ver(r) !== ver(cached))
        self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage('forge-update'))).catch(() => {});
      return r;
    });
    if (!cached) return net.catch(() => caches.match('./index.html'));
    net.catch(() => {});                                // a late failure after the cached copy was served is not an error
    return Promise.race([net, new Promise(res => setTimeout(() => { late = true; res(cached); }, 2500))]).catch(() => cached);
  })());
});
