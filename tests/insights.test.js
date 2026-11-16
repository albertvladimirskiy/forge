/* The insights layer: every number is checked against a value worked out by hand. */
const near = (a, x, y, msg) => a.ok(Math.abs(x - y) < 1e-6, `${msg || ''} got ${x}, want ${y}`);
const SQ = 'barbell-back-squat', BP = 'barbell-bench-press';

module.exports = { name: 'Insights: tonnage, load ratio, e1RM, PRs, plateau, weight trend, correlation, readiness', tests: {
  async 'tonnage: working sets x reps x weight, helpers at half, warm-ups and bodyweight excluded'(page, a){
    const t = await page.evaluate(([SQ, BP]) => {
      S.gym[T] = { squat: [{ w: 60, r: 5, wu: 1 }, { w: 100, r: 5 }, { w: 100, r: 5 }], pullup: [{ w: 10, r: 5 }, { w: 0, r: 8 }] };
      S.cust[T] = Object.assign(newCW('with'), { items: [BP, 'plank'], sets: { [BP]: [{ w: 60, r: 8 }], plank: [{ t: 60 }] } });
      return dayTonnage(T); }, [SQ, BP]);
    a.equal(t.total, 1000 + 50 + 480); a.equal(t.sets, 5);
    a.deepEqual([t.byLift[SQ], t.byLift[BP], t.byLift['weighted-pull-up']], [1000, 480, 50]);
    a.deepEqual([t.byMuscle.quads, t.byMuscle.glutes, t.byMuscle.chest, t.byMuscle.triceps, t.byMuscle.back, t.byMuscle.biceps], [1000, 500, 480, 240, 50, 25]);
  },

  async 'weekly load groups Monday to Sunday; the load ratio is last 7 days over the average week of the last 28'(page, a){
    const r = await page.evaluate(() => {
      const out = { early: null };
      for (let i = 0; i < 20; i += 7) S.gym[dkey(-i)] = { squat: [{ w: 100, r: 10 }] };
      out.early = acwr();                                                        // under 28 days of history
      _memo = null;                                                              // (the app clears its per-task cache on every save and render)
      S.gym[dkey(-21)] = { squat: [{ w: 100, r: 10 }] }; S.gym[dkey(-27)] = { squat: [{ w: 1, r: 1 }] };
      out.steady = acwr(); _memo = null;
      S.gym[dkey(0)].squat.push({ w: 100, r: 10 });                              // this week doubled
      _memo = null; out.spike = acwr();
      const wl = weeklyLoad(2); out.weeks = wl.map(w => [dowIdx(w.week), w.week <= T]); out.sum = wl[0].tonnage + wl[1].tonnage;
      out.want = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].filter(i => dkey(-i) >= wl[0].week).reduce((s, i) => s + dayTonnage(dkey(-i)).total, 0);
      return out; });
    a.equal(r.early, null);
    near(a, r.steady.ratio, 1000 / ((4000 + 1) / 4)); near(a, r.spike.ratio, 2000 / ((5000 + 1) / 4));
    a.deepEqual(r.weeks, [[0, true], [0, true]]); a.equal(r.sum, r.want);
  },

  async 'e1RM series uses the best working set per session (Epley, reps capped at 10)'(page, a){
    const sr = await page.evaluate(BP => {
      S.cust[dkey(-7)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: [{ w: 100, r: 5 }, { w: 90, r: 12 }, { w: 120, r: 3, wu: 1 }] } });
      S.gym[dkey(-1)] = { bench: [{ w: 100, r: 1 }] };
      return e1rmSeries(BP); }, BP);
    a.equal(sr.length, 2);
    near(a, sr[0].e1, 90 * (1 + 10 / 30)); a.equal(sr[0].r, 12);      // 90 x 12 counts as 10 reps: 120, which beats 100 x 5 = 116.67
    a.equal(sr[1].e1, 100);                                           // a single is the weight itself; a program-lift set counts for its library lift
  },

  async 'records: weight, reps at a weight, e1RM and session volume; the first session sets baselines'(page, a){
    const prs = await page.evaluate(BP => {
      const day = (off, sets) => { S.cust[dkey(off)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: sets } }); };
      day(-21, [{ w: 100, r: 5 }]); day(-14, [{ w: 100, r: 6 }]); day(-7, [{ w: 105, r: 3 }]); day(0, [{ w: 100, r: 6 }]);
      return liftPRs(BP).map(p => daysBetween(p.date, T) + ':' + p.type); }, BP);
    a.deepEqual(prs, ['14:e1rm', '14:reps', '14:volume', '7:weight']);
  },

  async 'plateau: four sessions over three weeks with no more than 1% gain'(page, a){
    const r = await page.evaluate(BP => {
      const day = (off, w) => { S.cust[dkey(off)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: [{ w, r: 5 }] } }); };
      day(-35, 100); day(-28, 102.5); const few = plateau(BP); _memo = null;
      day(-21, 102.5); day(-14, 103); day(-7, 102.5); day(0, 103);
      const flat = plateau(BP); _memo = null;
      day(0, 105); const moved = plateau(BP); _memo = null;
      day(0, 103); delete S.cust[dkey(-21)]; S.cust[dkey(-10)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: [{ w: 102.5, r: 5 }] } });
      return { few, flat, moved, short: plateau(BP) }; }, BP);
    a.equal(r.few, null, 'needs five sessions');
    a.equal(r.flat.stalled, true); a.equal(r.flat.days, 21); near(a, r.flat.before, 102.5 * (1 + 5 / 30));
    a.equal(r.moved.stalled, false, '105 is more than 1% over 102.5');
    a.equal(r.short.stalled, false, 'four sessions inside 14 days is not a plateau yet'); a.equal(r.short.days, 14);
  },

  async 'weight trend is a gap-aware EWMA (alpha 0.1); relative strength divides by it'(page, a){
    const r = await page.evaluate(BP => {
      S.log = [{ date: dkey(-4), weight: 80 }, { date: dkey(-3), weight: 81 }, { date: dkey(0), weight: 82 }, { date: dkey(-2), bf: 15 }];
      S.cust[dkey(-3)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: [{ w: 80.1, r: 1 }] } });
      return { t: weightTrend().map(p => p.trend), at: [trendAt(dkey(-5)), trendAt(dkey(-1))], rel: relStrength(BP)[0].rel }; }, BP);
    near(a, r.t[0], 80); near(a, r.t[1], 80.1); near(a, r.t[2], 80.1 + (1 - Math.pow(0.9, 3)) * (82 - 80.1));
    a.equal(r.at[0], null); near(a, r.at[1], 80.1); near(a, r.rel, 1);
  },

  async 'correlation is Pearson r with n, and nothing under three pairs'(page, a){
    const r = await page.evaluate(() => [pearson([1, 2, 3], [2, 4, 6]), pearson([1, 2, 3], [3, 2, 1]), pearson([1, 2, 3, 4], [1, 3, 2, 4]), pearson([1, 2], [1, 2]), pearson([1, 1, 1], [1, 2, 3])]);
    near(a, r[0].r, 1); near(a, r[1].r, -1); near(a, r[2].r, 0.8); a.equal(r[2].n, 4);
    a.equal(r[3].r, null); a.equal(r[4].r, null, 'a constant has no correlation');
  },

  async 'a nutrition week counts protein days (90% of target) and calorie days (within 10%)'(page, a){
    const r = await page.evaluate(() => {
      S.log = [{ date: T, weight: 80 }]; const wk = weekOf(dkey(-7)), N = nutrition(wk);
      const eat = (i, kcal, p) => { day(addDays(wk, i)).food = [{ n: 'x', kcal, p, c: 0, f: 0, q: 1 }]; };
      eat(0, nutrition(addDays(wk, 0)).kcal, nutrition(addDays(wk, 0)).protein);            // on target
      eat(1, nutrition(addDays(wk, 1)).kcal * 1.2, nutrition(addDays(wk, 1)).protein * 0.91); // over on calories, protein just made
      eat(2, nutrition(addDays(wk, 2)).kcal * 0.95, nutrition(addDays(wk, 2)).protein * 0.5); // calories fine, protein missed
      return nutritionWeek(wk); });
    a.deepEqual([r.logged, r.proteinDays, r.kcalDays], [3, 2, 2]);
    a.ok(r.balance > 0, 'balance is kcal a day over target');
  },

  async 'readiness: a labelled model that leaves out what was not logged'(page, a){
    const r = await page.evaluate(() => {
      const none = readiness();
      S.log = [{ date: T, weight: 80, sleep: 6 }]; const sleepOnly = readiness(); _memo = null;
      for (let i = 1; i <= 31; i++) if (i % 2) S.gym[dkey(-i)] = { squat: [{ w: 100, r: 10 }] };       // every other day, yesterday included
      return { none, sleepOnly, full: readiness(), a: acwr(dkey(-1)) }; });
    a.equal(r.none, null);
    a.equal(r.sleepOnly.score, 80); a.deepEqual(r.sleepOnly.missing, ['load', 'fresh']);
    const load = Math.min(1, Math.max(0, 1 - (r.a.ratio - 1.1) / 0.7)), fresh = 0.6;                    // yesterday was exactly a typical day
    a.equal(r.full.score, Math.round((0.8 * 0.40 + load * 0.35 + fresh * 0.25) * 100)); a.deepEqual(r.full.missing, []);
  },

  async 'report card: counts the week and names one thing to fix'(page, a){
    const r = await page.evaluate(BP => {
      S.meta.start = dkey(-60); S.log = [{ date: dkey(-20), weight: 80 }];
      const wk = addDays(weekOf(T), -7);
      for (const back of [-14, -7]) S.cust[addDays(wk, back)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: [{ w: 100, r: 5 }] } });   // 'best lift' needs two earlier sessions
      S.cust[addDays(wk, 1)] = Object.assign(newCW('with'), { items: [BP], sets: { [BP]: [{ w: 105, r: 5 }, { w: 105, r: 5 }] } });
      const c = reportCard(wk);
      return { tonnage: c.tonnage, prev: c.prevTonnage, prs: c.prs.map(p => p.type).sort(), best: c.best && [c.best.id, Math.round(c.best.gain * 1000)], prLifts: c.prLifts, fix: c.fix.k, planned: c.planned, done: c.done }; }, BP);
    a.deepEqual([r.tonnage, r.prev], [1050, 500]);
    a.deepEqual(r.prs, ['e1rm', 'volume', 'weight']); a.deepEqual(r.best, [BP, 50]); a.deepEqual(r.prLifts, [BP]);
    a.ok(r.planned - r.done >= 2); a.equal(r.fix, 'sessions');
  },

  async 'screens: each panel draws in its tab with data and with none, and its controls work'(page, a){
    const show = (v, sub) => page.evaluate(([v, sub]) => { view = v; if (v === 'wlog') wlSub = sub; if (v === 'build') buildSub = sub; render(); return document.getElementById('app').textContent.replace(/\s+/g, ' '); }, [v, sub]);
    a.match(await show('wlog', 'lifts'), /STRENGTH TREND.*Log the same weighted lift in two sessions/);
    a.match(await show('wlog', 'body'), /TRAINING LOAD.*Log weighted sets/);
    a.match(await show('build', 'fuel'), /^(?!.*FOOD AGAINST RESULTS)|FOOD AGAINST RESULTS.*Once a full week/);
    a.match(await show('ledger'), /REPORT CARD.*FIX (THIS|NEXT) WEEK/);
    a.match(await show('today'), /READINESS log sleep to start/);
    await page.evaluate(([SQ, BP]) => {
      S.log = [{ date: dkey(-40), weight: 80 }, { date: dkey(-1), weight: 81 }];
      for (let i = 0; i < 8; i++){ const k = dkey(-i * 5);
        S.cust[k] = Object.assign(newCW('with'), { items: [BP, SQ], sets: { [BP]: [{ w: 60 + i, r: 5 }], [SQ]: [{ w: 100, r: 5 }] } }); }
      for (let i = 7; i < 35; i++) day(dkey(-i)).food = [{ n: 'x', kcal: 2500, p: 150, c: 0, f: 0, q: 1 }];
      view = 'wlog'; wlSub = 'lifts'; render(); }, [SQ, BP]);
    const lifts = await show('wlog', 'lifts');
    a.match(lifts, /estimated 1RM/); a.match(lifts, /Status\s*(Moving|Stalled)/); a.doesNotMatch(lifts, /NaN|undefined|Infinity/);
    const before = await page.evaluate(() => document.querySelector('.hero b').textContent);
    await page.click(`[data-act=ins-lift][data-v="${BP}"]`); await page.click(`[data-act=ins-lift][data-v="${SQ}"]`);
    a.equal(await page.evaluate(() => document.querySelector('.hero b').textContent), String(Math.round(100 * (1 + 5 / 30) * 2.20462)));
    a.ok(before);
    for (const [v, sub, rx] of [['wlog', 'body', /lifted this week.*Load ratio.*THIS WEEK BY MUSCLE|lifted this week.*Load ratio/], ['build', 'fuel', /FOOD AGAINST RESULTS.*Week of.*needs 8 comparable weeks/], ['ledger', '', /REPORT CARD.*LIFT RECORDS.*Best lift/]]){
      const t = await show(v, sub); a.match(t, rx, `${v}/${sub}`); a.doesNotMatch(t, /NaN|undefined|Infinity/, `${v}/${sub}`);
    }
    await show('today');
    await page.fill('#rd_sleep', '6'); await page.click('[data-act=rd-sleep]');
    a.equal(await page.evaluate(() => S.log.find(e => e.date === T).sleep), 6);
    a.match(await show('today'), /READINESS \d+ · model.*Sleep\s*6 h of 7.5 h/);
    a.equal(await page.evaluate(() => !!document.getElementById('rd_sleep')), false, 'the sleep box should go once sleep is logged');
    await page.click('[data-act=rc-week][data-v="0"]', { trial: true }).catch(() => {});
  },

  async 'a backup file carries the progress photos and a restore puts them back'(page, a){
    const n = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = c.height = 8; c.getContext('2d').fillRect(0, 0, 8, 8);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg'));
      await photoPut('ph_test_front', blob);
      S.log.push({ date: T, weight: 80 }); S.ch90 = { start: T, goal: '', checkins: [{ week: 0, date: T, photos: { front: 'ph_test_front' } }], past: [] };
      window.__backup = await backupText(); const o = JSON.parse(window.__backup);
      await photoDel('ph_test_front'); await idbDo('readwrite', st => st.delete('ph_test_front'));
      return [Object.keys(o.photos), o.photos.ph_test_front.slice(0, 15), !!(await photoGet('ph_test_front'))]; });
    a.deepEqual(n, [['ph_test_front'], 'data:image/jpeg', false]);
    await page.evaluate(() => { view = 'plan'; importOpen = true; render(); const ta = document.getElementById('importtxt'); ta.value = window.__backup; ta.dispatchEvent(new Event('input', { bubbles: true })); });
    a.match(await page.evaluate(() => document.getElementById('importprev').textContent), /carries 1 progress photos/);
    await page.evaluate(() => { document.querySelector('[data-act=importgo]').click(); document.querySelector('[data-act=importgo]').click(); });
    await page.waitForFunction(async () => !!(await photoGet('ph_test_front')), null, { timeout: 5000 });
    a.equal(await page.evaluate(() => 'photos' in S || /"photos":\{"ph_/.test(localStorage.getItem('forge.v1'))), false, 'photo data leaked into the saved state');
  },

  async 'the whole layer runs on old saved data and on an empty app without errors'(page, a){
    const run = () => { const ids = insightLifts(1); ids.forEach(id => { e1rmSeries(id); liftPRs(id); plateau(id); relStrength(id); });
      weeklyLoad(12); acwr(); weightTrend(); nutritionVsResults(); readiness(); return JSON.stringify(reportCard()).length > 50; };
    a.equal(await page.evaluate(run), true);
    const old = await require('./lib').openApp(page.ctx.browser(), { state: require('./lib').oldState() });
    try { a.equal(await old.evaluate(run), true); a.doesNotMatch(await old.evaluate(() => JSON.stringify([reportCard(), weeklyLoad(4), nutritionVsResults()])), /NaN|undefined/); a.deepEqual(old.errors, []); }
    finally { await old.ctx.close(); }
  },
} };
