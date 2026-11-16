/* The four moments the app is opened for, clicked through on a phone-sized screen with the service worker on and the network OFF:
   mid-workout logging, the morning check-in, logging a meal, the weekly review. Also the install checklist. Console errors fail it. */
const { serve, oldState } = require('./lib');

module.exports = { name: 'The four moments, offline, on a phone', tests: {
  async 'log a set, check in, log food and read the week with no network; everything is still there after a reload'(page, a){
    const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/`;
    const ctx = await page.ctx.browser().newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(json => { if (!localStorage.getItem('__seeded')){ localStorage.setItem('forge.v1', json); localStorage.setItem('__seeded', '1'); } }, JSON.stringify(oldState()));
    const pg = await ctx.newPage(), errors = [];
    pg.on('pageerror', e => errors.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    const up = () => pg.waitForFunction(() => typeof S !== 'undefined' && typeof FOODS !== 'undefined' && document.getElementById('app').innerHTML.length > 0, null, { timeout: 8000 });
    const txt = () => pg.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
    try {
      await pg.goto(url); await up();
      await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 });
      await pg.waitForFunction(async () => (await (await caches.open((await caches.keys())[0])).keys()).some(r => r.url.endsWith('.woff2')), null, { timeout: 8000 });
      await ctx.setOffline(true); await pg.reload(); await up();
      a.equal(await pg.evaluate(() => document.fonts.check('16px Inter')), true, 'the typeface did not load offline');

      // 1. morning check-in: the plan, the briefing, missions, readiness
      const today = await txt();
      a.match(today, /(RAW|IRON|STEEL).*MARKS/); a.match(today, /MISSIONS/); a.match(today, /READINESS/);
      a.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Today scrolls sideways on a phone');

      // 2. mid-workout: open a program lift, numbers prefilled from the plan, one tap on the stepper, LOG SET
      await pg.evaluate(() => { const key = Object.keys(S.swap).length ? null : null; S.swap[T] = WEEK.find(d => d.blocks.some(b => BLOCKEX[b.id])).id; openBlock = 'train'; openBlock2 = dayDef(T).blocks.find(b => BLOCKEX[b.id]).id; render(); });
      const ex = await pg.evaluate(() => blockKeys(dayDef(T).blocks.find(b => BLOCKEX[b.id]))[0]);
      const rx = await pg.evaluate(ex => document.getElementById('sw_' + ex).placeholder, ex);
      a.match(rx, /^\d/, 'the prescribed weight is not shown in the weight box');
      await pg.tap(`[data-act=g-step][data-v="${ex}|w"][data-v2="1"]`);
      const box = await pg.evaluate(() => { const b = document.querySelector('.stp').getBoundingClientRect(), l = document.querySelector('[data-act=addset]').getBoundingClientRect(); return [b.width, b.height, l.height]; });
      a.ok(box[0] >= 44 && box[1] >= 44 && box[2] >= 44, `logging targets are too small: ${box}`);
      await pg.tap(`[data-act=addset][data-v="${ex}"]`);
      const sets = await pg.evaluate(ex => S.gym[T][ex], ex);
      a.equal(sets.length, 1); a.ok(sets[0].w > 0 && sets[0].r > 0);
      a.equal(await pg.evaluate(() => !!document.querySelector('.setrow.hit')), true, 'the logged set did not land with its moment');
      a.match(await pg.evaluate(() => document.querySelector('.toast').textContent), /Set 1|New PR/);

      // 3. a meal: search, tap a result, then the same food again from RECENT
      await pg.evaluate(() => { openBlock = null; S.ui.fold.food = true; render(); });
      const before = await pg.evaluate(() => foodTotals(T).kcal);
      await pg.tap('[data-act=foodopen]'); await pg.fill('#foodq', 'chicken breast');
      await pg.tap('#foodres [data-act=addfood]');
      const one = await pg.evaluate(() => foodTotals(T).kcal); a.ok(one > before, 'the food was not added');
      await pg.fill('#foodq', ''); await pg.tap('#foodres [data-act=addrecent]');
      a.ok(await pg.evaluate(() => foodTotals(T).kcal) > one, 'a recent food could not be re-added in one tap');

      // 4. weekly review: rank, report card, the one thing to fix; then strength and load
      await pg.tap('nav [data-v=ledger]');
      const led = await txt(); a.match(led, /RANK.*THE LADDER.*REPORT CARD.*FIX (THIS|NEXT) WEEK/);
      await pg.tap('nav [data-v=wlog]'); await pg.tap('[data-act=wl-sub][data-v=lifts]'); a.match(await txt(), /STRENGTH TREND/);
      await pg.tap('[data-act=wl-sub][data-v=body]'); a.match(await txt(), /TRAINING LOAD/);
      for (const t of [today, led, await txt()]) a.doesNotMatch(t, /NaN|undefined|Infinity/);

      await pg.reload(); await up();                                                         // still offline
      a.equal(await pg.evaluate(ex => S.gym[T][ex].length, ex), 1, 'the set logged offline was lost');
      a.ok(await pg.evaluate(() => foodTotals(T).kcal) > one, 'the food logged offline was lost');
      a.deepEqual(errors, []);
    } finally { await ctx.close(); srv.close(); }
  },

  async 'install checklist: manifest, icons, service worker and an offline start page'(page, a){
    const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/`;
    const ctx = await page.ctx.browser().newContext({ viewport: { width: 390, height: 844 } }), pg = await ctx.newPage();
    try {
      await pg.goto(url); await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 });
      const r = await pg.evaluate(async () => { const link = document.querySelector('link[rel=manifest]'), m = await (await fetch(link.href)).json();
        const icons = await Promise.all(m.icons.map(async i => { const b = await createImageBitmap(await (await fetch(new URL(i.src, link.href))).blob()); return [i.sizes, b.width + 'x' + b.height, i.purpose]; }));
        const start = new URL(m.start_url, link.href).href, cached = await caches.match(start);
        return { name: m.name, short: m.short_name, display: m.display, start, scopeOk: start.startsWith(new URL(m.scope, link.href).href), icons, startCached: !!cached && cached.ok,
          fetchHandler: (await navigator.serviceWorker.getRegistration()).active.state, theme: !!document.querySelector('meta[name=theme-color]'), apple: !!document.querySelector('link[rel=apple-touch-icon]'),
          viewport: document.querySelector('meta[name=viewport]').content, https: location.protocol === 'https:' || location.hostname === '127.0.0.1' }; });
      a.ok(r.name && r.short); a.equal(r.display, 'standalone'); a.equal(r.scopeOk, true); a.equal(r.startCached, true, 'the start page is not available offline');
      a.deepEqual(r.icons.map(i => i[0] === i[1]), [true, true], 'an icon is not the size the manifest says: ' + JSON.stringify(r.icons));
      a.ok(r.icons.some(i => i[0] === '192x192') && r.icons.some(i => i[0] === '512x512'), 'Chrome needs a 192 and a 512 icon');
      a.equal(r.fetchHandler, 'activated'); a.ok(r.theme && r.apple); a.match(r.viewport, /viewport-fit=cover/); a.doesNotMatch(r.viewport, /user-scalable=no|maximum-scale/, 'zoom must stay available');
    } finally { await ctx.close(); srv.close(); }
  },
} };
