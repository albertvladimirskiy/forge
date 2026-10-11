const { BENCH, SQUAT, LB, workout, logSet, sets, text } = require('./lib');

const hint = (page, id, list) => page.evaluate(([id, list]) => { S.cust[dkey(-1)] = { ...newCW('with'), items: [id], sets: { [id]: list } };
  const h = nextWeightHint(id, VD()); return h && { mode: h.mode, lb: Math.round(h.w * 2.20462 * 100) / 100, text: h.text }; }, [id, list]);

module.exports = { name: 'Bodyweight trend and next-weight hint', tests: {
  async 'targets use the 7-day average; a weekly weigher is unchanged'(page, a){
    a.deepEqual(await page.evaluate(() => [trendWeight(), nutrition(T)]), [null, null]);
    const kcalFor = kg => page.evaluate(kg => { const p = S.profile, bmr = 10 * kg + 6.25 * (+p.height) - 5 * (+p.age || 22) + (p.sex === 'm' ? 5 : -161); return Math.round(bmr * (+p.activity || 1.725) / 10) * 10; }, kg);
    await page.evaluate(() => { S.profile.goal = 'recomp'; S.log = [{ date: dkey(-20), weight: 80 }, { date: dkey(-2), weight: 82 }]; });
    a.deepEqual(await page.evaluate(() => { const t = trendWeight(); return [t.smoothed, t.kg]; }), [false, 82]);
    a.equal(await page.evaluate(() => nutrition(T).kcal), await kcalFor(82));
    await page.evaluate(() => { S.log = [80, 80.4, 79.8, 80.2, 80, 80.1, 82.6].map((w, i) => ({ date: dkey(-6 + i), weight: w })); });
    const t = await page.evaluate(() => trendWeight());
    a.equal(t.smoothed, true); a.equal(t.n, 7); a.ok(Math.abs(t.kg - 80.4429) < 0.001); a.equal(t.raw, 82.6);
    a.equal(await page.evaluate(() => nutrition(T).kcal), await kcalFor(t.kg), 'targets should follow the average, not the salty spike');
    await page.evaluate(() => { S.log = [{ date: dkey(-30), weight: 70 }, { date: dkey(-1), weight: 80 }, { date: T, weight: 82 }]; });
    a.equal(await page.evaluate(() => trendWeight().kg), 81, 'a 30-day-old weigh-in leaked into the window');
    a.deepEqual(await page.evaluate(() => { S.log = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ date: dkey(-8 + i), weight: 80 + i })); return weightTrendSeries().map(v => +v.toFixed(2)); }),
      [80, 80.5, 81, 81.5, 82, 82.5, 83, 84, 85]);
  },

  async 'weight chart shows the dashed average and the note; other charts and single weigh-ins do not'(page, a){
    await page.evaluate(() => { S.log = [0, 1, 2, 3, 4, 5, 6].map(i => ({ date: dkey(-6 + i), weight: 80 + i % 3, squat: 100 + i })); view = 'build'; buildSub = 'log'; chartKey = 'weight'; render(); });
    a.equal(await page.evaluate(() => !!document.querySelector('.spark path[stroke-dasharray]')), true);
    a.match(await page.evaluate(() => document.getElementById('app').textContent), /7-day average .* from 7 weigh-ins/);
    await page.evaluate(() => { chartKey = 'squat'; render(); });
    a.equal(await page.evaluate(() => !!document.querySelector('.spark path[stroke-dasharray]')), false);
    await page.evaluate(() => { S.log = [{ date: T, weight: 80 }]; buildSub = 'fuel'; render(); });
    a.doesNotMatch(await page.evaluate(() => document.getElementById('app').textContent), /7-day average/);
    await page.evaluate(() => { S.log = [0, 1, 2].map(i => ({ date: dkey(-i), weight: 80 + i })); render(); });
    a.match(await page.evaluate(() => document.getElementById('app').textContent), /Based on your 7-day average weight/);
  },

  async 'no hint without history, for timed exercises, or when only warm-ups were logged'(page, a){
    a.equal(await page.evaluate(id => nextWeightHint(id, VD()), BENCH), null);
    a.equal(await page.evaluate(() => nextWeightHint('plank', VD())), null);
    a.equal(await hint(page, BENCH, [{ w: LB(45), r: 10, wu: 1 }]), null);
  },

  async 'go up / repeat rules'(page, a){
    const w = lb => LB(lb);
    let h = await hint(page, BENCH, [{ w: w(135), r: 8 }, { w: w(135), r: 8 }, { w: w(135), r: 8 }]);
    a.deepEqual([h.mode, h.lb], ['up', 140]);
    h = await hint(page, BENCH, [{ w: w(135), r: 8 }, { w: w(135), r: 7 }, { w: w(135), r: 6 }]);
    a.deepEqual([h.mode, h.lb], ['repeat', 135]);
    h = await hint(page, BENCH, [{ w: w(185), r: 5 }, { w: w(185), r: 5 }, { w: w(185), r: 5 }]);
    a.equal(h.mode, 'repeat'); a.match(h.text, /Log RPE on heavy sets/);
    h = await hint(page, BENCH, [{ w: w(185), r: 5, rpe: 7.5 }, { w: w(185), r: 5, rpe: 8 }, { w: w(185), r: 5, rpe: 8 }]);
    a.deepEqual([h.mode, h.lb], ['up', 190]);
    h = await hint(page, BENCH, [{ w: w(135), r: 8, rpe: 8 }, { w: w(135), r: 8, rpe: 9 }, { w: w(135), r: 8, rpe: 9.5 }]);
    a.equal(h.mode, 'repeat'); a.match(h.text, /RPE 9\.5/);
    h = await hint(page, BENCH, [{ w: w(135), r: 8, rpe: 9 }, { w: w(135), r: 8, rpe: 9 }]);
    a.equal(h.mode, 'repeat');
    h = await hint(page, BENCH, [{ w: w(135), r: 10 }]);
    a.equal(h.mode, 'repeat', 'one unrated set is too little to go on');
    h = await hint(page, BENCH, [{ w: w(135), r: 8, rpe: 7 }]);
    a.deepEqual([h.mode, h.lb], ['up', 140]);
    h = await hint(page, BENCH, [{ w: w(45), r: 10, wu: 1 }, { w: w(135), r: 8 }, { w: w(135), r: 8 }]);
    a.deepEqual([h.mode, h.lb], ['up', 140]);
    h = await hint(page, BENCH, [{ w: w(95), r: 12 }, { w: w(115), r: 10 }, { w: w(135), r: 8 }, { w: w(135), r: 8 }]);
    a.deepEqual([h.mode, h.lb], ['up', 140]);
    h = await hint(page, SQUAT, [{ w: w(225), r: 8 }, { w: w(225), r: 8 }]);
    a.deepEqual([h.mode, h.lb], ['up', 235], 'lower-body barbell lifts jump 10 lb');
    await page.evaluate(() => { S.profile.unit = 'metric'; });
    h = await hint(page, BENCH, [{ w: 100, r: 8 }, { w: 100, r: 8 }]);
    a.match(h.text, /Try 102\.5 kg/);
  },

  async 'NEXT TIME line renders, USE fills the weight box, hard sets get no USE button'(page, a){
    await page.evaluate(([id, kg]) => { S.cust[dkey(-1)] = { ...newCW('with'), items: [id], sets: { [id]: [{ w: kg, r: 8 }, { w: kg, r: 8 }, { w: kg, r: 8 }] } }; }, [BENCH, LB(135)]);
    await workout(page, [BENCH]);
    a.match(await text(page, '.benchn'), /NEXT TIME · 3 sets at 135 lb, all 8\+ reps, no drop-off\. Try 140 lb\. USE 140 lb/);
    await page.click('[data-act=w-usenext]');
    a.equal(await page.evaluate(id => document.querySelector(`[data-dr="${id}|w"]`).value, BENCH), '140');
    await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.equal(Math.round((await sets(page, BENCH))[0].w * 2.20462), 140);
    await page.evaluate(([id, kg]) => { S.cust[dkey(-1)].sets[id] = [{ w: kg, r: 8, rpe: 9.5 }]; render(); }, [BENCH, LB(135)]);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-usenext]')), false);
  },
} };
