/* Shared helpers for the FORGE browser tests. Each test gets a fresh page with the app loaded and past onboarding;
   the app's globals (S, render, VD, T, ...) are reachable inside page.evaluate. */
const path = require('path');
const { pathToFileURL } = require('url');

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
const INDEX = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

async function openApp(browser, opts = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(INDEX);
  await page.waitForFunction(() => typeof render === 'function' && document.getElementById('app') && document.getElementById('app').innerHTML.length > 0);
  await page.evaluate(() => { S.meta.onboarded = true; render(); });
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

module.exports = { launch, openApp, BENCH, SQUAT, LB, workout, logSet, sets, text, app };
