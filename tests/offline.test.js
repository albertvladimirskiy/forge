const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

/* service workers only run on http(s), so serve the app folder on a local port */
function serve(){
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()){ res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

module.exports = { name: 'Offline use (service worker)', tests: {
  async 'every file the service worker caches is actually served'(page, a){
    const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}/`;
    try {
      const assets = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
      const list = [...assets.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
      a.ok(list.length >= 6, 'could not read the asset list from sw.js');
      for (const f of list){ const r = await fetch(base + f); a.equal(r.status, 200, `${f} is in the service worker's list but is not served`); }
    } finally { srv.close(); }
  },

  async 'after one online visit the app loads offline with its data, and keeps saving'(page, a){
    const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/`;
    const ctx = await page.ctx.browser().newContext({ viewport: { width: 390, height: 900 } });   // service workers allowed
    const pg = await ctx.newPage(); const errors = []; pg.on('pageerror', e => errors.push(e.message));
    try {
      await pg.goto(url);
      await pg.waitForFunction(() => typeof S !== 'undefined' && document.getElementById('app').innerHTML.length > 0);
      await pg.evaluate(() => { S.meta.onboarded = true; S.log.push({ date: T, weight: 81.5 }); commit(); });
      /* a service worker whose install failed (say, it lists a file that doesn't exist) never becomes ready: fail, don't hang */
      await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 })      // the worker takes control (clients.claim) only after its install succeeded
        .catch(() => { throw new Error('the service worker never took control (does sw.js list a file that is missing?)'); });
      const cached = await pg.evaluate(async () => { const names = await caches.keys(), c = await caches.open(names[0]); return { names, files: (await c.keys()).map(r => new URL(r.url).pathname) }; });
      a.equal(cached.names.length, 1, 'old cache versions were not cleaned up');
      a.match(cached.names[0], /^forge-v\d+$/);
      for (const f of ['/index.html', '/foods-db.js', '/exercises-db.js', '/quotes-db.js']) a.ok(cached.files.includes(f), `${f} was not cached; cache has ${JSON.stringify(cached)}`);
      await pg.waitForTimeout(300);

      await ctx.setOffline(true);
      await pg.reload();
      await pg.waitForFunction(() => typeof S !== 'undefined' && document.getElementById('app').innerHTML.length > 0, null, { timeout: 8000 });
      a.equal(await pg.evaluate(() => S.log.length), 1, 'data missing offline');
      a.equal(await pg.evaluate(() => FOODS.length > 1000 && EXDB.length > 500 && QUOTES.length > 50), true, 'the data files did not load offline');
      await pg.evaluate(() => { S.meta.onboarded = true; S.ui.fold.food = true; render(); });
      await pg.click('[data-act=water][data-v="237"]');
      await pg.reload();
      await pg.waitForFunction(() => typeof S !== 'undefined');
      a.equal(await pg.evaluate(() => day(T).water), 237, 'something logged offline was not saved');
      a.deepEqual(errors, []);
    } finally { await ctx.close(); srv.close(); }
  },
} };
