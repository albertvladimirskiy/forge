/* Ranks, marks, tiered missions, the streak rule and callouts. Earned from logged work only. */
const SQ = 'barbell-back-squat', BP = 'barbell-bench-press';
/* a completed session on a date: an own workout of three exercises */
const train = `(k, w = 100) => { S.cust[k] = Object.assign(newCW('with'), { items: ['${SQ}', '${BP}', 'barbell-row'], sets: { '${SQ}': [{ w, r: 5 }], '${BP}': [{ w: w * 0.6, r: 5 }], 'barbell-row': [{ w: 60, r: 8 }] } }); }`;

module.exports = { name: 'Motivation: streak rule, ranks, marks, tiered missions, callouts', tests: {
  async 'a streak day is won by a session, by protein, or by three habits: not by one ticked box'(page, a){
    const r = await page.evaluate(train => { const tr = eval(train); S.log = [{ date: T, weight: 80 }]; const N = nutrition(dkey(-3));
      day(dkey(-1)).blocks = { meal1: true }; day(dkey(-1)).habits = { h1: true, h2: true };                    // one meal ticked + two habits: not enough
      day(dkey(-2)).habits = { h1: true, h2: true, h3: true };                                                  // three habits
      day(dkey(-3)).food = [{ n: 'x', kcal: 2000, p: N.protein * 0.9, c: 0, f: 0, q: 1 }];                       // protein at 90%
      day(dkey(-4)).food = [{ n: 'x', kcal: 2000, p: N.protein * 0.8, c: 0, f: 0, q: 1 }];                       // protein short
      tr(dkey(-5)); _memo = null;
      const won = [1, 2, 3, 4, 5].map(i => dayWon(dkey(-i))), st0 = streak();
      day(dkey(-1)).habits.h3 = true; _memo = null; const st1 = streak();
      S.off[dkey(-4)] = 'rest'; _memo = null;
      return { won, st0, st1, st2: streak(), old: dayScore(dkey(-4)) > 0 }; }, train);
    a.deepEqual(r.won, [false, true, true, false, true]);
    a.equal(r.st0, 0, 'yesterday was one meal and two habits'); a.equal(r.st1, 3); a.equal(r.st2, 4, 'a day off pauses the streak, as before');
  },

  async 'strength score is the mean of four lifts against their bodyweight standards, capped at 100%'(page, a){
    const s = await page.evaluate(() => { S.log = [{ date: T, weight: 100, squat: 100, bench: 150, dead: 300 }]; _memo = null; return strengthScore(); });
    a.deepEqual(s.lifts.map(x => x.pct), [0.5, 1, 1, 0], 'squat 1.0x of 2x, bench 1.5x of 1.5x, deadlift 3x of 2.5x (capped), press never logged');
    a.equal(s.score, 0.625);
  },

  async 'rank: needs strength, discipline and marks together; it is recorded and never taken away'(page, a){
    const r = await page.evaluate(train => { const tr = eval(train), out = {};
      S.meta.start = dkey(-200); S.log = [{ date: T, weight: 80, squat: 80, bench: 60, dead: 100, ohp: 40 }];       // 50% on every lift
      _memo = null; syncRank(); out.start = [S.rank.i, rankState().req.map(q => q.ok)];
      const wk = weekOf(T);
      for (let w = 1; w <= 4; w++) for (const d of [0, 2, 4]) tr(addDays(wk, -7 * w + d));                          // 3 sessions a week, 4 weeks
      _memo = null; syncRank(); out.noMarks = [S.rank.i, rankState().req.map(q => q.ok), marksTotal().total];
      for (let w = 1; w <= 10; w++) S.missions.w[addDays(wk, -7 * w)] = [{ t: 'sessions', tiers: [1, 2, 3] }];      // four of these weeks reached MAX: 12 marks
      _memo = null; syncRank(); out.iron = [S.rank.i, RANKS[S.rank.i].n, S.rank.at[1] === T, marksTotal().weekly];
      for (let w = 1; w <= 4; w++) for (const d of [0, 2, 4]) delete S.cust[addDays(wk, -7 * w + d)];              // stop training entirely
      _memo = null; syncRank(); const rs = rankState(); out.after = [S.rank.i, rs.slipping, rs.next.n];
      return out; }, train);
    a.deepEqual(r.start, [0, [true, false, false]]);
    a.deepEqual(r.noMarks, [0, [true, true, false], 0], 'strength and discipline without marks is not a rank');
    a.deepEqual(r.iron, [1, 'IRON', true, 12]);
    a.deepEqual(r.after, [1, true, 'STEEL'], 'the rank is kept; slipping is shown instead');
  },

  async 'missions: three bars each, and reaching further pays more (1 / 2 / 3, plus 1 for all three at HARD)'(page, a){
    const r = await page.evaluate(train => { const tr = eval(train), wk = weekOf(T), out = {};
      S.log = [{ date: addDays(wk, -1), weight: 80 }];
      S.missions.w[wk] = [{ t: 'sessions', tiers: [2, 3, 4] }, { t: 'weigh', tiers: [1, 2, 3] }, { t: 'tonnage', tiers: [1000, 1050, 1100] }];
      const tiers = () => { _memo = null; return S.missions.w[wk].map(m => missionTier(m, missionVal(m, wk, addDays(wk, 6)))); };
      out.t0 = tiers(); out.m0 = marksTotal().total;
      const days = Array.from({ length: 7 }, (_, i) => addDays(wk, i)).filter(k => k <= T);
      tr(days[0], 100); S.log.push({ date: days[0], weight: 80 });                                                    // 1 session, 1 weigh-in, 500 + 300 + 480 = 1280 kg
      out.t1 = tiers(); out.marks1 = marksTotal();
      S.log.push({ date: days[0] === T ? addDays(wk, -2) : T, weight: 81 }); return out; }, train);
    a.deepEqual(r.t0, [0, 0, 0]); a.equal(r.m0, 0);
    a.deepEqual(r.t1, [0, 1, 3], 'no session bar yet, BASE on weigh-ins, MAX on tonnage');
    a.equal(r.marks1.weekly, 0 + 1 + 3); a.equal(r.marks1.sweeps, 0);
  },

  async 'missions are generated from last week, hold their targets, and the weak point can be swapped once'(page, a){
    const r = await page.evaluate(train => { const tr = eval(train), wk = weekOf(T), out = {};
      S.meta.start = dkey(-90); S.missions = { w: {}, m: {}, swap: {} };
      _memo = null; ensureMissions(); out.empty = Object.keys(S.missions.w).length;                                    // nothing to build missions from yet
      S.log = [{ date: addDays(wk, -8), weight: 80 }];
      for (let w = 1; w <= 3; w++) for (const d of [0, 2, 4]) tr(addDays(wk, -7 * w + d), 100 + w);
      _memo = null; ensureMissions();
      const W = S.missions.w[wk]; out.types = W.map(m => m.t); out.tiers = W.map(m => m.tiers.length); out.rising = W.every(m => m.tiers[0] <= m.tiers[1] && m.tiers[1] <= m.tiers[2]);
      out.protein = W[1].tiers; out.month = S.missions.m[T.slice(0, 7)].t;
      const before = JSON.stringify(W); tr(T, 300); _memo = null; ensureMissions(); out.stable = JSON.stringify(S.missions.w[wk]) === before;
      view = 'today'; S.ui.fold.missions = true; render();
      document.querySelector('[data-act=mis-swap]').click(); out.swapped = [S.missions.w[wk][2].t !== JSON.parse(before)[2].t, !!S.missions.swap[wk], !!document.querySelector('[data-act=mis-swap]')];
      out.text = document.getElementById('app').textContent.replace(/\s+/g, ' ');
      return out; }, train);
    a.equal(r.empty, 0);
    a.deepEqual(r.types.slice(0, 2), ['sessions', 'protein']); a.deepEqual(r.tiers, [3, 3, 3]); a.equal(r.rising, true);
    a.deepEqual(r.protein, [4, 6, 7], 'no protein days last week: the base bar starts at 4, MAX is always all 7');
    a.ok(['e1rm', 'msessions'].includes(r.month)); a.equal(r.stable, true, 'a mission must not be regenerated once it exists');
    a.deepEqual(r.swapped, [true, true, false]);
    a.match(r.text, /MISSIONS.*BASE.*HARD.*MAX.*THIS MONTH/); a.doesNotMatch(r.text, /NaN|undefined|Infinity/);
  },

  async 'callouts: one line, by priority, and silence when on plan'(page, a){
    const r = await page.evaluate(train => { const tr = eval(train), out = {};
      S.meta.start = dkey(-60); S.log = [{ date: T, weight: 80 }];
      const co = () => { _memo = null; const c = callout(); return c && c.k; };
      out.fresh = co();                                                                                               // nothing logged at all: say nothing
      for (let i = 2; i <= 30; i += 2) tr(dkey(-i), 100);                                                             // trains every other day, but not yesterday
      const y = dkey(-1), plannedY = !offOf(y) && dayDef(y).type !== 'recover';
      out.missed = co(); out.plannedY = plannedY;
      tr(y, 100); out.onPlan = co();
      tr(T, 120); out.pr = [co(), callout().t];
      S.rank.i = 1; S.rank.at[1] = T; out.rank = callout().t;
      return out; }, train);
    a.equal(r.fresh, null);
    a.ok(r.plannedY ? ['missed', 'missed2'].includes(r.missed) : r.missed === null, `after a missed planned day: ${r.missed}`);
    a.equal(r.onPlan, null, 'on plan it says nothing');
    a.equal(r.pr[0], 'pr'); a.match(r.pr[1], /^\d+\. That's the new floor\.$/);
    a.equal(r.rank, 'Rank earned: IRON.');
  },

  async 'the header shows the rank, Ledger shows the ladder, and old saved data gets both without errors'(page, a){
    const old = await require('./lib').openApp(page.ctx.browser(), { state: require('./lib').oldState() });
    try {
      const t = await old.evaluate(() => { view = 'ledger'; render(); return document.getElementById('app').textContent.replace(/\s+/g, ' '); });
      a.match(t, /(RAW|IRON|STEEL)( · \d\/3 TO [A-Z]+)? · \d+ MARKS/); a.match(t, /RANK.*STRENGTH SCORE.*THE LADDER.*DAMASCUS/); a.doesNotMatch(t, /NaN|undefined|Infinity/);
      a.equal(await old.evaluate(() => JSON.parse(localStorage.getItem('forge.v1')).rank.i >= 0 && Object.keys(JSON.parse(localStorage.getItem('forge.v1')).missions.w).length), 1, 'missions and rank were not saved');
      a.deepEqual(old.errors, []);
    } finally { await old.ctx.close(); }
  },
} };
