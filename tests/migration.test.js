const { oldState, openApp, text, app } = require('./lib');

/* Every screen the app has, as [view, sub-state] pairs */
const SCREENS = [['today', ''], ['plan', ''], ['build', 'target'], ['build', 'fuel'], ['build', 'log'], ['build', 'ch90'], ['mind', ''], ['ledger', ''], ['codex', ''],
  ['wlog', 'workouts'], ['wlog', 'body'], ['wlog', 'lifts'], ['wlog', 'fights']];
const open = (browser, opts) => openApp(browser, opts);

module.exports = { name: 'Data saved by the original build', tests: {
  async 'loads, keeps everything, and every screen renders without errors, NaN or undefined'(page, a){
    const browser = page.ctx.browser(), st = oldState();
    const old = await open(browser, { state: st });
    try {
      const counts = await old.evaluate(() => ({ log: S.log.length, cust: Object.keys(S.cust).length, gym: Object.keys(S.gym).length, days: Object.keys(S.days).length, fights: Object.keys(S.fights).length, routines: S.routines.length, myex: S.myex.length }));
      a.deepEqual(counts, { log: 20, cust: 10, gym: 8, days: 60, fights: 2, routines: 1, myex: 1 });
      a.deepEqual(await old.evaluate(() => [S.cpref.rest, Object.keys(S.cpref.fav), S.cpref.restSound, S.cpref.notes, S.cpref.bar, S.myfoods]), [120, ['barbell-bench-press'], true, {}, {}, []], 'old prefs lost, or new defaults missing');
      for (const [view, sub] of SCREENS){
        const len = await old.evaluate(([v, sub]) => { if (v === 'wlog') wlSub = sub; if (v === 'build') buildSub = sub; view = v; render(); return document.getElementById('app').textContent.length; }, [view, sub]);
        a.ok(len > 300, `${view}/${sub} rendered almost nothing`);
        const t = await app(old);
        a.doesNotMatch(t, /NaN|undefined|\[object/, `${view}/${sub} shows a broken value`);
      }
      // past days, including ones with custom workouts, fights and food
      for (const off of [0, -1, -2, -3, -9, -10, -17, -45]){
        await old.evaluate(off => { view = 'today'; viewOff = off; render(); }, off);
        a.doesNotMatch(await app(old), /NaN|undefined|\[object/, `Today at offset ${off} shows a broken value`);
      }
    } finally { a.deepEqual(old.errors, [], 'the app threw an uncaught error'); await old.ctx.close(); }
  },

  async 'old workouts, sets and food totals are unchanged'(page, a){
    const raw = oldState(), old = await open(page.ctx.browser(), { state: raw });
    try {
      const k = Object.keys(raw.cust).sort().pop();
      a.deepEqual(await old.evaluate(k => JSON.parse(JSON.stringify(S.cust[k].sets)), k), raw.cust[k].sets);
      a.deepEqual(await old.evaluate(() => Object.keys(S.gym).sort().map(k => S.gym[k])), Object.keys(raw.gym).sort().map(k => raw.gym[k]));
      const f = Object.keys(raw.days)[0], want = raw.days[f].food.reduce((t, x) => t + x.kcal * x.q, 0);
      a.equal(await old.evaluate(f => foodTotals(f).kcal, f), want);
      a.equal(await old.evaluate(() => S.cust[Object.keys(S.cust).sort()[0]].sup && Object.keys(S.cust[Object.keys(S.cust).sort()[0]].sup).length), 0, 'old workouts get an empty superset map');
    } finally { a.deepEqual(old.errors, []); await old.ctx.close(); }
  },

  async 'a weekly weigher gets exactly the same targets as before the 7-day average'(page, a){
    const raw = oldState(), old = await open(page.ctx.browser(), { state: raw });
    try {
      const t = await old.evaluate(() => trendWeight());
      a.equal(t.smoothed, false);
      const want = await old.evaluate(() => { const L = latestField('weight'), p = S.profile, bmr = 10 * L.weight + 6.25 * (+p.height) - 5 * (+p.age) + (p.sex === 'm' ? 5 : -161);
        return Math.round(bmr * (+p.activity) / 10) * 10; });
      a.equal(await old.evaluate(() => nutrition(T).kcal), want);
    } finally { a.deepEqual(old.errors, []); await old.ctx.close(); }
  },

  async 'every new feature works on old data and survives a reload'(page, a){
    const raw = oldState(), pg = await open(page.ctx.browser(), { state: raw });
    try {
      const day = Object.keys(raw.cust).sort().pop(), BENCH = 'barbell-bench-press', ROW = 'barbell-row';
      await pg.evaluate(([day, BENCH]) => { viewOff = -((new Date(T) - new Date(day)) / 86400000); view = 'today'; cwOpen = BENCH; render(); }, [day, BENCH]);
      a.equal(await pg.evaluate(() => VD()), day, 'did not land on the old workout day');
      const sets = () => pg.evaluate(([day, id]) => S.cust[day].sets[id], [day, BENCH]);
      const before = (await sets()).length;
      // edit, RPE, warm-up, ramp, note, link, rest override, bar, water, my food
      await pg.evaluate(() => document.querySelectorAll('.xbody .setedit')[0].click());
      await pg.fill(`[data-dr="${BENCH}|w"]`, '170'); await pg.click(`[data-act=w-rpe][data-v="${BENCH}|8.5"]`); await pg.click(`[data-act=w-log][data-v="${BENCH}"]`);
      await pg.click(`[data-act=w-ramp][data-v="${BENCH}"]`);
      await pg.fill(`[data-exnote="${BENCH}"]`, 'seat at 4');
      await pg.click(`[data-act=w-ss][data-v="${BENCH}"]`);
      await pg.click(`[data-act=w-exrest][data-v="${BENCH}"]`); await pg.click(`[data-act=w-exbar][data-v="${BENCH}"]`);
      await pg.evaluate(() => { S.ui.fold.food = true; S.log.push({ date: T, weight: 80 }); render(); });
      await pg.click('[data-act=water][data-v="237"]');
      await pg.evaluate(() => { foodOpen = true; render(); });
      await pg.fill('#cf_n', 'Bar'); await pg.fill('#cf_k', '200'); await pg.click('[data-act=addcustomfood]');
      const snap = () => pg.evaluate(([day, id]) => ({ sets: S.cust[day].sets[id].length, rpe: S.cust[day].sets[id][0].rpe, wu: S.cust[day].sets[id].filter(s => s.wu).length, note: S.cpref.notes[id],
        sup: S.cust[day].sup, restEx: S.cpref.restEx[id], barEx: S.cpref.barEx[id], water: (S.days[day] && S.days[day].water) || 0, my: S.myfoods.map(f => f.n), summary: workoutSummary(day).split('\n')[0] }), [day, BENCH]);
      const s1 = await snap();
      a.equal(s1.sets, before + 4); a.equal(s1.rpe, 8.5); a.equal(s1.wu, 4); a.equal(s1.note, 'seat at 4'); a.deepEqual(s1.sup, { [BENCH]: true });
      a.equal(s1.restEx, 0); a.ok(s1.barEx && s1.barEx.imperial === 35); a.equal(s1.water, 237); a.deepEqual(s1.my, ['Bar']); a.match(s1.summary, /^(Push|Pull) · /);
      await pg.waitForTimeout(300);
      await pg.reload(); await pg.waitForFunction(() => typeof S !== 'undefined' && document.getElementById('app').innerHTML.length > 0);
      await pg.evaluate(() => { S.meta.onboarded = true; });
      const s2 = await snap();
      a.deepEqual(s2, s1, 'something the app showed as saved was lost on reload');
      a.deepEqual(await pg.evaluate(() => buildCSV('workouts').length > 30), true);
    } finally { a.deepEqual(pg.errors, []); await pg.ctx.close(); }
  },

  async 'restoring the old backup through the paste box works and can be undone'(page, a){
    const raw = oldState();
    await page.evaluate(() => { S.log.push({ date: T, weight: 99 }); commit(); });
    await page.evaluate(json => { view = 'plan'; importOpen = true; render(); importtxt.value = json; document.querySelector('[data-act=importgo]').click(); }, JSON.stringify(raw));
    await page.waitForTimeout(300);
    a.equal(await page.evaluate(() => S.log.length), 20);
    a.doesNotMatch(await app(page), /NaN|undefined|\[object/);
    await page.evaluate(async () => { await snapRestore((await snapKeys()).find(k => k.startsWith('undo-'))); });
    a.equal(await page.evaluate(() => S.log.length), 1);
  },
} };
