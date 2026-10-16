const { openApp, oldState } = require('./lib');

const cards = page => page.evaluate(() => [...document.querySelectorAll('.tour')].map(t => t.querySelector('.eyebrow').textContent));
const go = (page, v, sub) => page.evaluate(([v, sub]) => { view = v; if (v === 'wlog') wlSub = sub || 'workouts'; if (v === 'build') buildSub = 'target'; viewOff = 0; render(); }, [v, sub]);
const fresh = page => page.evaluate(() => { S.ui.seen = {}; render(); });

module.exports = { name: 'First-run tour', tests: {
  async 'each screen shows its own card once; GOT IT hides it for good (and survives a reload)'(page, a){
    await fresh(page);
    a.deepEqual(await cards(page), ['QUICK TOUR · TODAY']);
    await page.click('[data-act=tour-ok][data-v=today]');
    a.deepEqual(await cards(page), []);
    for (const [v, name] of [['wlog', 'TRAIN'], ['build', 'BODY'], ['mind', 'MIND'], ['ledger', 'LEDGER'], ['plan', 'SETTINGS']]){
      await go(page, v);
      a.deepEqual(await cards(page), ['QUICK TOUR · ' + name], v + ' should show its card');
      await page.click(`[data-act=tour-ok][data-v=${v}]`);
      a.deepEqual(await cards(page), []);
    }
    await page.reload(); await page.waitForFunction(() => typeof render === 'function' && document.getElementById('app').innerHTML.length > 0);
    a.equal(await page.evaluate(() => Object.keys(S.ui.seen).length), 6);
    a.deepEqual(await cards(page), []);
  },

  async 'SKIP TOUR dismisses every card at once'(page, a){
    await fresh(page);
    await page.click('[data-act=tour-skip]');
    for (const v of ['today', 'wlog', 'build', 'mind', 'ledger', 'plan']){ await go(page, v); a.deepEqual(await cards(page), [], v); }
  },

  async 'REPLAY THE TOUR in Settings brings the cards back, starting on Today'(page, a){
    await go(page, 'plan');
    a.deepEqual(await cards(page), []);
    await page.click('[data-act=tour-replay]');
    a.equal(await page.evaluate(() => view), 'today');
    a.deepEqual(await cards(page), ['QUICK TOUR · TODAY']);
    await go(page, 'mind'); a.deepEqual(await cards(page), ['QUICK TOUR · MIND']);
  },

  async 'not shown on another day, nor under the setup screen'(page, a){
    await fresh(page);
    await page.click('[data-act=daygo][data-v="1"]');
    a.deepEqual(await cards(page), [], 'the Today card should only show on today');
    await page.evaluate(() => { S.meta.onboarded = false; viewOff = 0; render(); });
    a.deepEqual(await cards(page), [], 'tour card was drawn behind the first-run setup');
  },

  async 'saved data from before the tour, and restored backups, are not treated as a first run'(page, a){
    const pg = await openApp(page.ctx.browser(), { state: oldState() });
    try {
      a.equal(await pg.evaluate(() => Object.keys(S.ui.seen).length), 6);
      a.deepEqual(await cards(pg), []);
      // a backup without the key restores as "seen"
      const backup = await pg.evaluate(() => { const c = JSON.parse(JSON.stringify(S)); delete c.ui.seen; return JSON.stringify(c); });
      await pg.evaluate(() => { S.ui.seen = {}; view = 'plan'; importOpen = true; render(); });
      await pg.evaluate(json => { document.getElementById('importtxt').value = json; document.querySelector('[data-act=importgo]').click(); }, backup);
      a.equal(await pg.evaluate(() => Object.keys(S.ui.seen).length), 6);
    } finally { await pg.ctx.close(); }
  },

  async 'a brand-new install gets the tour once setup is done'(page, a){
    const pg = await openApp(page.ctx.browser());
    try {
      await pg.evaluate(() => { localStorage.clear(); });
      await pg.reload(); await pg.waitForFunction(() => typeof render === 'function' && document.getElementById('app').innerHTML.length > 0);
      a.equal(await pg.evaluate(() => S.meta.onboarded), false);
      a.deepEqual(await cards(pg), []);
      await pg.click('[data-act=ob-skip]');
      a.deepEqual(await cards(pg), ['QUICK TOUR · TODAY']);
    } finally { await pg.ctx.close(); }
  },

  async 'cards fit a 320px phone at extra-large text'(page, a){
    const pg = await openApp(page.ctx.browser(), { width: 320 });
    try {
      await pg.evaluate(() => { S.ui.seen = {}; S.ui.text = 'xl'; });
      for (const v of ['today', 'wlog', 'build', 'mind', 'ledger', 'plan']){
        await go(pg, v);
        a.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, v + ' overflows');
      }
    } finally { await pg.ctx.close(); }
  },
} };
