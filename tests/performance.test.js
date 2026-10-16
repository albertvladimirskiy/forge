/* A generous guard, not a benchmark: two years of heavy use (about 800 KB of saved data) must still render quickly.
   Measured at 5-25 ms per screen on a dev machine; the limit is 10x that to avoid flaking on a slow runner. */
module.exports = { name: 'Performance with two years of data', tests: {
  async 'screens render, tap, search and snapshot quickly with a huge history'(page, a){
    await page.evaluate(() => {
      const ids = ['barbell-bench-press', 'barbell-row', 'barbell-back-squat', 'dumbbell-curl', 'plank', 'run', 'pull-up', 'dip'];
      for (let i = 0; i < 730; i++){ const k = dkey(-i), d = day(k); d.habits = { sleep: i % 2 === 0 }; d.food = Array.from({ length: 7 }, (_, j) => ({ n: 'Food ' + ((i * 7 + j) % 90), kcal: 100 + j * 30, p: 10, c: 20, f: 5, q: 1 })); d.water = 2000; }
      for (let i = 0; i < 400; i++){ S.cust[dkey(-i * 2 - 1)] = { name: 'W' + i, mode: 'with', items: ids.slice(), sets: Object.fromEntries(ids.map(id => [id, Array.from({ length: 4 }, (_, j) => ({ w: 40 + j * 5 + i % 30, r: 8, rpe: 8 }))])), sup: {}, note: '', t0: 1, t1: 2, fin: true }; }
      for (let i = 0; i < 150; i++) S.gym[dkey(-i * 3 - 2)] = { squat: [{ w: 100, r: 5 }, { w: 100, r: 5 }], bench: [{ w: 70, r: 8 }] };
      for (let i = 0; i < 300; i++) S.log.push({ date: dkey(-i * 2 - 400), weight: 80 + Math.sin(i) });
      S.log.sort((x, y) => x.date < y.date ? -1 : 1);
      S.cust[dkey(0)] = newCW('with'); S.cust[dkey(0)].items = ids.slice(); cwOpen = ids[0]; view = 'today'; viewOff = 0; render(); });
    const screens = [['today', ''], ['build', 'log'], ['build', 'fuel'], ['build', 'target'], ['wlog', 'workouts'], ['wlog', 'lifts'], ['wlog', 'body']];
    for (const [v, sub] of screens){
      const ms = await page.evaluate(([v, sub]) => { if (v === 'build') buildSub = sub; if (v === 'wlog') wlSub = sub; view = v; render();
        const t0 = performance.now(); for (let i = 0; i < 5; i++) render(); return (performance.now() - t0) / 5; }, [v, sub]);
      a.ok(ms < 250, `${v}/${sub} took ${ms.toFixed(0)} ms per render (limit 250)`);
    }
    const t = await page.evaluate(() => { view = 'today'; render(); const out = {};
      let t0 = performance.now(); S.cust[dkey(0)].sets['barbell-bench-press'] = [{ w: 60, r: 8 }]; commit(); render(); out.logSet = performance.now() - t0;
      t0 = performance.now(); foodQ = 'chick'; foodResultsHTML(); out.food = performance.now() - t0;
      t0 = performance.now(); exQ = 'press'; exResultsHTML(); out.exercise = performance.now() - t0;
      t0 = performance.now(); JSON.stringify(S); JSON.stringify(S); out.undoSnapshot = performance.now() - t0;
      out.kb = JSON.stringify(S).length / 1024; return out; });
    a.ok(t.kb > 400, 'the test data should be big (' + Math.round(t.kb) + ' KB)');
    a.ok(t.logSet < 400, `logging a set took ${t.logSet.toFixed(0)} ms`);
    a.ok(t.food < 150, `a food-search keystroke took ${t.food.toFixed(0)} ms`);
    a.ok(t.exercise < 200, `an exercise-search keystroke took ${t.exercise.toFixed(0)} ms`);
    a.ok(t.undoSnapshot < 200, `snapshotting for undo took ${t.undoSnapshot.toFixed(0)} ms`);
  },
} };
