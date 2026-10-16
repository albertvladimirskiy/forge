const { workout, logSet, BENCH, text } = require('./lib');

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
} };
