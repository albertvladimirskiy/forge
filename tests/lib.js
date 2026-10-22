/* Shared helpers for the FORGE browser tests. Each test gets a fresh page with the app loaded and past onboarding;
   the app's globals (S, render, VD, T, ...) are reachable inside page.evaluate. */
const path = require('path'), fs = require('fs'), http = require('http');

function loadPlaywright(){
  try { return require('playwright'); }
  catch (e) {
    if (process.env.PLAYWRIGHT_PATH) return require(process.env.PLAYWRIGHT_PATH);
    throw new Error('Playwright not found. Run `npm install` inside tests/ (then `npx playwright install chromium`), or set PLAYWRIGHT_PATH.');
  }
}
async function launch(){
  const { chromium } = loadPlaywright();
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}
/* The app is served over http, like a real visit. Loading it from file:// made Chromium hand a reloaded page an empty
   localStorage about one reload in seven, which read as the app losing data (it never did) and made reload tests flaky. */
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function serve(){
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()){ res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}
let shared = null;                                        // one server for every test page; unref'd so it never keeps the runner alive
const baseUrl = async () => { if (!shared){ const srv = await serve(); srv.unref(); shared = `http://127.0.0.1:${srv.address().port}/`; } return shared; };

async function openApp(browser, { state, width = 390, height = 900, ...opts } = {}){
  const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', acceptDownloads: true, ...opts });
  /* `state` is a saved-app object to start from. It's written once, so a reload keeps whatever the app saved afterwards. The flag lives
     in localStorage, not sessionStorage: Chromium sometimes hands a reloaded page an empty sessionStorage, which re-ran this and
     overwrote the app's own save (about 1 reload in 6). */
  if (state) await ctx.addInitScript(json => { if (!localStorage.getItem('__seeded')){ localStorage.setItem('forge.v1', json); localStorage.setItem('__seeded', '1'); } }, JSON.stringify(state));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(await baseUrl());
  await page.waitForFunction(() => typeof render === 'function' && document.getElementById('app') && document.getElementById('app').innerHTML.length > 0);
  await page.evaluate(() => { S.meta.onboarded = true; S.ui.seen = tourAllSeen(); render(); });   // the tour has its own tests (tour.test.js)
  page.ctx = ctx;
  return page;
}

/* small builders so tests read like the app's own state */
const BENCH = 'barbell-bench-press', SQUAT = 'barbell-back-squat';
const LB = lb => lb / 2.20462;                 // pounds -> the kg the app stores
async function workout(page, items, open){
  await page.evaluate(([items, open]) => { S.cust[VD()] = newCW('with'); S.cust[VD()].items = items; cwOpen = open || items[0]; render(); }, [items, open]);
}
async function logSet(page, id, fields){
  for (const [f, v] of Object.entries(fields)) await page.fill(`[data-dr="${id}|${f}"]`, String(v));
  await page.click(`[data-act=w-log][data-v="${id}"]`);
}
const sets = (page, id) => page.evaluate(id => (S.cust[VD()] && S.cust[VD()].sets[id]) || [], id);
const text = (page, sel) => page.evaluate(sel => document.querySelector(sel).textContent.replace(/\s+/g, ' ').trim(), sel);
const app = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));

/* A saved app from the ORIGINAL build (tests/fixtures/old-state.json), with every date moved so the data ends "today". */
const FIXTURE_DAY = '2026-10-11';
function oldState(){
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'old-state.json'), 'utf8'));
  const dayMs = 86400000, toUTC = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const now = new Date(), todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = Math.round((todayUTC - toUTC(FIXTURE_DAY)) / dayMs);
  const shift = s => { const d = new Date(toUTC(s) + delta * dayMs); return d.toISOString().slice(0, 10); };
  const isDate = s => typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s);
  const walk = v => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) =>
      [isDate(k) ? shift(k) : k, (k === 't0' || k === 't1') && typeof x === 'number' ? x + delta * dayMs : walk(x)]));
    return isDate(v) ? shift(v) : v;
  };
  return walk(raw);
}

module.exports = { launch, openApp, serve, oldState, BENCH, SQUAT, LB, workout, logSet, sets, text, app };
