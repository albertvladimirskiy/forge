/* Progress transfers both ways between a planned lift and your own workouts: a set of the linked library exercise (the plan's
   deadlift is Trap Bar Deadlift) counts for the plan's prescription, records and standards, just as the plan's own sets already
   counted for the library exercise's history. */
const { LB } = require('./lib');
const lbOf = kg => Math.round(kg * 2.20462 * 10) / 10;
const TB = 'trap-bar-deadlift';

const setup = (page, logDeadLb) => page.evaluate(([logLb]) => {
  S.log = [{ date: T, weight: 80, ...(logLb ? { dead: logLb / 2.20462 } : {}) }];
  S.meta.start = dkey(-60);                       // past the two ramp weeks
  S.gym = {}; S.cust = {}; S.prs = {}; S.swap = {};
}, [logDeadLb]);
const own = (page, daysAgo, sets) => page.evaluate(([d, sets]) => {
  const k = dkey(-d); S.cust[k] = newCW('with'); S.cust[k].items = ['trap-bar-deadlift'];
  S.cust[k].sets['trap-bar-deadlift'] = sets.map(([lb, r, x]) => ({ w: lb / 2.20462, r, ...(x || {}) }));
}, [daysAgo, sets]);
const rx = page => page.evaluate(() => { const r = prescribe('dead'); return { mode: r.mode, lb: r.w == null ? null : Math.round(r.w * 2.20462 * 10) / 10 }; });

module.exports = { name: 'Plan and own workouts share lift history', tests: {
  async 'a heavy trap bar deadlift in your own workout sets the built-in deadlift, not the Log-tab guess'(page, a){
    await setup(page, 212);
    a.deepEqual(await rx(page), { mode: 'first', lb: 169.6 }, 'before: 80% of the Log-tab number');
    await own(page, 3, [[225, 5], [225, 5], [225, 5]]);
    a.deepEqual(await rx(page), { mode: 'progress', lb: 235 }, '3 x 5 at 225 earns the next step (+10 lb)');
  },

  async 'missed reps repeat the weight; warm-up sets and a day with no work sets do not count'(page, a){
    await setup(page, 0);
    await own(page, 3, [[225, 5], [225, 5], [225, 3]]);
    a.deepEqual(await rx(page), { mode: 'repeat', lb: 225 }, 'two full sets of three: repeat');
    await own(page, 3, [[315, 5, { wu: true }], [135, 5, { wu: true }]]);
    a.equal((await rx(page)).mode, 'start', 'warm-ups alone make no history');
    await own(page, 2, [[225, 5], [225, 5], [225, 5]]);
    await page.evaluate(() => { delete S.cust[dkey(-3)]; });
    a.deepEqual(await rx(page), { mode: 'progress', lb: 235 });
  },

  async 'plan sets and own sets on the same day add up, and the most recent session leads'(page, a){
    await setup(page, 0);
    await own(page, 7, [[225, 5], [225, 5], [225, 5]]);
    await page.evaluate(() => { const k = dkey(-2); S.gym[k] = { dead: [{ w: 245 / 2.20462, r: 5, p: 235 / 2.20462 }, { w: 245 / 2.20462, r: 5 }] }; S.cust[k] = newCW('with'); S.cust[k].items = ['trap-bar-deadlift']; S.cust[k].sets['trap-bar-deadlift'] = [{ w: 245 / 2.20462, r: 5 }]; });
    a.deepEqual(await rx(page), { mode: 'progress', lb: 255 }, 'two plan sets + one own set at 245 = 3 x 5');
  },

  async 'a deload session in your own workout is not special, but a flagged plan deload still is'(page, a){
    await setup(page, 0);
    await page.evaluate(() => { const k = dkey(-4); S.gym[k] = { dead: [{ w: 135 / 2.20462, r: 5, dl: true }, { w: 135 / 2.20462, r: 5, dl: true }, { w: 135 / 2.20462, r: 5, dl: true }] }; });
    await own(page, 9, [[225, 5], [225, 5], [225, 5]]);
    a.deepEqual(await rx(page), { mode: 'progress', lb: 235 }, 'the flagged easy week never becomes the baseline; the 225 session does');
  },

  async 'records and strength standards follow the combined history; a lift left with no sets keeps its record'(page, a){
    await setup(page, 0);
    await own(page, 3, [[225, 5], [225, 5], [225, 5]]);
    await page.evaluate(() => commit());
    const pr = await page.evaluate(() => S.prs.dead && { lb: Math.round(S.prs.dead.w * 2.20462 * 10) / 10, r: S.prs.dead.r, date: S.prs.dead.date });
    a.deepEqual(pr, { lb: 225, r: 5, date: await page.evaluate(() => dkey(-3)) });
    a.ok(lbOf(await page.evaluate(() => bestLift('dead'))) >= 262, 'the standards read an e1RM of about 262 lb from 225 x 5');
    await page.evaluate(() => { delete S.cust[dkey(-3)]; commit(); });
    a.equal(await page.evaluate(() => S.prs.dead && S.prs.dead.w), 225 / 2.20462, 'a lift with no sets left keeps whatever record it had (nothing is ever silently erased)');
  },

  async 'the same lift logged in the plan still counts for your own workout (the original direction is intact)'(page, a){
    await setup(page, 0);
    await page.evaluate(() => { const k = dkey(-3); S.gym[k] = { dead: [1, 2, 3].map(() => ({ w: 255 / 2.20462, r: 5, p: 255 / 2.20462 })) }; });
    const best = await page.evaluate(() => { const b = bestSet('trap-bar-deadlift'); return b && Math.round(b.w * 2.20462); });
    a.equal(best, 255);
  },

  async 'an old saved app loads with its records intact, and no error'(page, a){
    await page.evaluate(() => { S.gym = { [dkey(-5)]: { squat: [{ w: 100, r: 5 }, { w: 100, r: 5 }, { w: 100, r: 5 }] } }; S.prs = { squat: { w: 100, r: 5, e1rm: 116.7, date: dkey(-5) }, legacy: { w: 1, r: 1, e1rm: 1, date: dkey(-9) } }; normalizeCustom(); });
    a.equal(await page.evaluate(() => S.prs.squat.w), 100);
    a.ok(await page.evaluate(() => !!S.prs.legacy), 'a record with no matching lift is left alone');
  },
} };
