const { workout, logSet, BENCH, text, openApp } = require('./lib');

module.exports = { name: 'Today: switching days, minimizing the workout, saving while typing', tests: {
  async 'tapping a day lands at the top of that day and the day strip does not slide'(page, a){
    a.equal(await page.evaluate(() => getComputedStyle(document.getElementById('strip')).scrollBehavior), 'auto', 'a smooth strip slides in from the left after every tap');
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; window.scrollTo(0, 700); });
    await page.click('[data-act=daygo][data-v="1"]');
    a.equal(await page.evaluate(() => Math.round(scrollY)), 0);
    a.equal(await page.evaluate(() => viewOff), 1);
    // the selected day is already centred in the strip right after the render (no animation to wait for)
    const off = await page.evaluate(() => { const s = document.getElementById('strip'), c = s.querySelector('.dcell.sel'); return Math.abs((c.offsetLeft + c.offsetWidth / 2) - (s.scrollLeft + s.offsetWidth / 2)); });
    a.ok(off < 3, `selected day is ${off}px off centre`);
  },

  async 'the briefing is not drawn on another day, even while its editor is open'(page, a){
    await page.evaluate(() => { briefEdit = true; render(); });
    a.ok(await page.evaluate(() => !!document.querySelector('.brief')));
    await page.click('[data-act=daygo][data-v="1"]');
    a.equal(await page.evaluate(() => !!document.querySelector('.brief')), false);
    a.equal(await page.evaluate(() => briefEdit), false, 'the tall quote editor was carried over to the next day');
  },

  async 'a custom workout can be minimized to one line and brought back; nothing is lost'(page, a){
    await workout(page, [BENCH]);
    await logSet(page, BENCH, { w: 135, r: 5 });
    a.ok(await page.evaluate(() => !!document.querySelector('.xw')));
    await page.click('[data-act=w-min]');
    a.equal(await page.evaluate(() => !!document.querySelector('.xw')), false, 'the panel is still on screen');
    a.match(await text(page, '[data-act=w-min]'), /YOUR WORKOUT 1\/1 lift · 1 set/);
    a.equal(await page.evaluate(() => document.querySelector('[data-act=w-min]').getAttribute('aria-expanded')), 'false');
    a.equal(await page.evaluate(() => S.cust[VD()].min), true);
    await page.reload(); await page.waitForFunction(() => typeof render === 'function' && document.getElementById('app').innerHTML.length > 0);
    a.equal(await page.evaluate(() => !!document.querySelector('.xw')), false, 'minimized state should survive a reload');
    await page.click('[data-act=w-min]');
    a.ok(await page.evaluate(() => !!document.querySelector('.xw')));
    a.equal(await page.evaluate(id => S.cust[VD()].sets[id].length, BENCH), 1);
  },

  async 'typing a note saves once after a pause, and a hidden page flushes it at once'(page, a){
    await page.evaluate(() => { window.__saves = 0; const o = Store.save.bind(Store); Store.save = d => { window.__saves++; return o(d); }; });
    await page.evaluate(() => { S.ui.fold.review = true; render(); });
    await page.type('[data-in="rv.win"]', 'felt strong', { delay: 5 });
    a.ok(await page.evaluate(() => window.__saves) <= 1, 'saved on (nearly) every keystroke');
    await page.waitForTimeout(700);
    a.equal(await page.evaluate(() => window.__saves), 1);
    a.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('forge.v1')).days[T].rv.win), 'felt strong');
    await page.type('[data-in="rv.win"]', '!');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    a.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('forge.v1')).days[T].rv.win), 'felt strong!', 'typed text was not saved when the page was hidden');
  },

  async 'history beyond 60 workouts is reachable'(page, a){
    await page.evaluate(() => { for (let i = 1; i <= 75; i++) S.cust[dkey(-i)] = { ...newCW('with'), name: 'W' + i, items: ['plank'], sets: { plank: [{ t: 30 }] } };
      view = 'wlog'; wlSub = 'workouts'; render(); });
    a.equal(await page.evaluate(() => document.querySelectorAll('.wlhead').length), 60);
    await page.click('[data-act=wl-more]');
    a.equal(await page.evaluate(() => document.querySelectorAll('.wlhead').length), 75);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=wl-more]')), false);
  },

  async 'the briefing is one line until opened, so the workout is on the first screen; opening and closing it sticks for the day'(page, a){
    a.ok(await page.evaluate(() => !!document.querySelector('.brief.col')), 'briefing should start collapsed');
    a.ok(await page.evaluate(() => document.querySelector('.nextup').getBoundingClientRect().top < innerHeight), 'next-up card is below the fold');
    await page.click('.brief.col');
    a.ok(await page.evaluate(() => !!document.querySelector('.brief .brline')));
    await page.click('.brx');
    a.ok(await page.evaluate(() => !!document.querySelector('.brief.col')));
  },

  async 'the backup nag is a single compact line'(page, a){
    await page.evaluate(() => { S.log.push({ date: T, weight: 80 }); S.meta.start = dkey(-30); render(); });
    a.ok(await page.evaluate(() => { const b = [...document.querySelectorAll('.banner')].find(x => /Data lives only/.test(x.textContent)); return b && b.getBoundingClientRect().height < 60; }), 'backup banner is tall');
  },

  async 'Settings holds backup, restore and export (not Codex); the gear says so'(page, a){
    await page.click('.gear');
    a.match(await page.evaluate(() => document.querySelector('.view .disp').textContent), /Program, week and data/);
    a.ok(await page.evaluate(() => !!document.querySelector('[data-act=s-backup]') && !!document.getElementById('importfile') && !!document.querySelector('[data-act=s-csv]')));
    await page.evaluate(() => { view = 'codex'; render(); });
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=s-backup]')), false);
  },

  async 'tapping a top bar explains what it is made of'(page, a){
    await page.click('[data-act=vital][data-v=WILL]');
    a.match(await page.evaluate(() => document.querySelector('.toast').textContent), /WILL: pure consistency/);
    for (const k of ['BODY', 'COMBAT', 'MIND', 'WILL', 'CAPITAL']) a.ok(await page.evaluate(k => !!VITAL_HELP[k], k), k + ' has no explanation');
  },

  async 'Ledger lists logged lifts and folds the rest into one line'(page, a){
    await page.evaluate(() => { S.prs.squat = { w: 100, r: 5, e1rm: 116, date: T }; view = 'ledger'; render(); });
    a.equal(await page.evaluate(() => document.querySelectorAll('.stand .standtop').length > 0 && /Not logged yet: .*Bench press/.test(document.getElementById('app').textContent)), true);
    a.equal(await page.evaluate(() => /Not logged yet — log a set/.test(document.getElementById('app').textContent)), false);
  },

  async 'the day-type badge says it swaps the day'(page, a){
    a.match(await text(page, '.dayhead .badge'), /SWAP/);
  },

  async 'text size: LARGE and EXTRA LARGE grow the small print, persist, and do not overflow a 320px phone'(page, a){
    const px = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs-body'));
    a.equal(await px(), '11px');
    await page.evaluate(() => { view = 'plan'; render(); });
    await page.click('[data-act=textsize][data-v=large]');
    a.equal(await px(), '13px');
    a.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('forge.v1')).ui.text), 'large');
    const pg = await openApp(page.ctx.browser(), { width: 320, state: await page.evaluate(() => ({ ...S, ui: { ...S.ui, text: 'xl' } })) });
    try {
      for (const v of ['today', 'plan', 'build', 'ledger', 'codex']){
        await pg.evaluate(v => { view = v; render(); }, v);
        a.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, v + ' overflows at 320px in extra large');
      }
    } finally { await pg.ctx.close(); }
  },
} };
