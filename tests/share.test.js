const { BENCH, workout, text } = require('./lib');
const ROW = 'barbell-row';

const seed = page => page.evaluate(([b, r]) => {
  S.cust[VD()] = { ...newCW('with'), name: 'Push day', items: [b, r, 'plank'], sup: { [b]: true }, note: 'Felt strong. Seat at 4.',
    t0: Date.now() - 52 * 60000, t1: Date.now(), fin: true,
    sets: { [b]: [{ w: 20.4, r: 8, wu: 1 }, { w: 61.235, r: 5, rpe: 8.5 }, { w: 61.235, r: 5 }], [r]: [{ w: 43.09, r: 8 }], plank: [{ t: 90 }] } };
  S.fights[VD()] = [{ id: 'a', disc: 'boxing', min: 60, rounds: 6, rpe: 7, worked: '', caught: '' }];
  S.cust[dkey(-1)] = { ...newCW('with'), items: [b], sets: { [b]: [{ w: 50, r: 5 }] } };   // so today's sets can be PRs
  cwOpen = b; render(); }, [BENCH, ROW]);

module.exports = { name: 'Share a workout', tests: {
  async 'the summary reads cleanly: exercises, warm-ups, RPE, PR flags, supersets, totals, note'(page, a){
    await seed(page);
    const lines = (await page.evaluate(d => workoutSummary(d), await page.evaluate(() => VD()))).split('\n');
    a.match(lines[0], /^Push day · /);
    a.equal(lines[1], 'Barbell Bench Press (superset): 45 lb × 8 (warm-up), 135 lb × 5 @8.5 ★PR, 135 lb × 5');
    a.equal(lines[2], 'Barbell Row (superset): 95 lb × 8');
    a.equal(lines[3], 'Plank: 1:30');
    a.equal(lines[4], 'Boxing: 1h · 6 rounds · effort 7/10');
    a.equal(lines[5], '');
    a.match(lines[6], /^3 lifts · 4 sets · 2,110 lb moved · 52 min$/);
    a.equal(lines[8], 'Felt strong. Seat at 4.');
  },

  async 'no summary for a day without a workout; exercises with no sets are left out'(page, a){
    a.equal(await page.evaluate(() => workoutSummary(VD())), '');
    await workout(page, [BENCH, ROW]);
    await page.evaluate(([b]) => { S.cust[VD()].sets[b] = [{ w: 61.235, r: 5 }]; }, [BENCH]);
    const t = await page.evaluate(() => workoutSummary(VD()));
    a.doesNotMatch(t, /Barbell Row/);
  },

  async 'SHARE uses the share sheet when there is one'(page, a){
    await seed(page);
    await page.evaluate(() => { window.__shared = null; navigator.share = async d => { window.__shared = d; }; });
    await page.click('[data-act=w-share]');
    await page.waitForFunction(() => window.__shared);
    const d = await page.evaluate(() => window.__shared);
    a.match(d.title, /Push day · FORGE/); a.match(d.text, /Barbell Bench Press \(superset\)/);
  },

  async 'without a share sheet it copies to the clipboard and says so; a failure is reported'(page, a){
    await seed(page);
    await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true }); });
    await page.click('[data-act=w-share]');
    await page.waitForFunction(() => window.__copied);
    a.match(await page.evaluate(() => window.__copied), /^Push day · /);
    a.match(await text(page, '.toast'), /Copied/);
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } }, configurable: true }); });
    await page.click('[data-act=w-share]');
    await page.waitForFunction(() => /Couldn't copy/.test(document.querySelector('.toast').textContent));
  },

  async 'cancelling the share sheet is silent'(page, a){
    await seed(page);
    await page.evaluate(() => { navigator.share = async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; }; window.__copied = null;
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true }); });
    await page.click('[data-act=w-share]');
    await page.waitForTimeout(300);
    a.equal(await page.evaluate(() => window.__copied), null, 'cancelling must not fall through to the clipboard');
  },

  async 'counts are pluralised correctly (1 set, 1 lift)'(page, a){
    await page.evaluate(([b]) => { S.cust[VD()] = { ...newCW('with'), items: [b], sets: { [b]: [{ w: 61.235, r: 5 }] }, fin: true }; cwOpen = null; render(); }, [BENCH]);
    const t = await page.evaluate(() => document.querySelector('.xw').textContent.replace(/\s+/g, ' '));
    a.match(t, /1\/1 lift1 set/); a.match(t, /Finished\. 1 set across 1 lift,/);
    a.doesNotMatch(t, /1 sets|1 lifts/);
  },

  async 'the button only shows once there is something to share, and past workouts can be shared from history'(page, a){
    await workout(page, [BENCH]);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-share]')), false);
    await seed(page);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-share]')), true);
    await page.evaluate(() => { view = 'wlog'; wlSub = 'workouts'; wlOpenDay = VD(); render(); });
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=wl-share]')), true);
    await page.evaluate(() => { window.__shared = null; navigator.share = async d => { window.__shared = d; }; });
    await page.click('[data-act=wl-share]');
    await page.waitForFunction(() => window.__shared);
  },
} };
