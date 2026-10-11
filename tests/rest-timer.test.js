const { BENCH, SQUAT, workout, logSet, text } = require('./lib');

/* count bells without needing audio output */
const spyBell = page => page.evaluate(() => { window.__bells = 0; const o = tmrBell; window.tmrBell = n => { window.__bells++; return o(n); }; });

module.exports = { name: 'Rest timer', tests: {
  async 'default rest starts after a set; per-exercise override and OFF work'(page, a){
    await page.evaluate(() => { S.cpref.rest = 90; });
    await workout(page, [BENCH, SQUAT]);
    await logSet(page, BENCH, { w: 135, r: 5 });
    a.equal(await page.evaluate(() => rest && rest.total), 90);
    a.match(await text(page, '[data-act=w-exrest]'), /REST: DEFAULT/);
    await page.click('[data-act=w-exrest]');
    a.match(await text(page, '[data-act=w-exrest]'), /REST: OFF/);
    await page.evaluate(() => { rest = null; });
    await logSet(page, BENCH, { w: 135, r: 5 });
    a.equal(await page.evaluate(() => rest), null, 'rest started although this exercise is set to OFF');
    await page.click('[data-act=w-exrest]');
    await logSet(page, BENCH, { w: 135, r: 5 });
    a.equal(await page.evaluate(() => rest && rest.total), 45);
    a.equal(await page.evaluate(id => restFor(id), SQUAT), 90, 'other exercises keep the default');
  },

  async 'bell rings when rest ends, stays quiet when SILENT or when the tick is very late'(page, a){
    await spyBell(page);
    await page.evaluate(() => { restStart(1); rest.end = Date.now() + 300; });
    await page.waitForTimeout(1200);
    a.equal(await page.evaluate(() => window.__bells), 1);
    await page.evaluate(() => { S.cpref.restSound = false; window.__bells = 0; restStart(1); rest.end = Date.now() + 300; });
    await page.waitForTimeout(1200);
    a.equal(await page.evaluate(() => window.__bells), 0, 'rang while SILENT');
    await page.evaluate(() => { S.cpref.restSound = true; window.__bells = 0; rest = null; restStart(60); rest.end = Date.now() - 20000; });
    await page.waitForTimeout(800);
    a.equal(await page.evaluate(() => window.__bells), 0, 'rang for a rest that ended 20s ago (phone slept)');
  },

  async 'a warm-up set does not start the rest timer'(page, a){
    await workout(page, [BENCH]);
    await page.fill(`[data-dr="${BENCH}|w"]`, '95'); await page.fill(`[data-dr="${BENCH}|r"]`, '5');
    await page.click(`[data-act=w-wu][data-v="${BENCH}"]`);
    await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.equal(await page.evaluate(() => rest), null);
  },

  async 'older saved data without the new keys loads'(page, a){
    await page.evaluate(() => { delete S.cpref.restEx; delete S.cpref.restSound; normalizeCustom(); });
    a.deepEqual(await page.evaluate(() => [S.cpref.restEx, S.cpref.restSound]), [{}, true]);
  },
} };
