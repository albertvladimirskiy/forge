/* The day's calorie / macro / water target: BMR x daily life, plus what the day's training costs.
   Hand-computed at 80 kg: one net MET (MET - 1) costs 3.5 * 80 / 200 = 1.4 kcal a minute. */
const setup = (page, extra = {}) => page.evaluate(x => {
  S.log = [{ date: T, weight: 80 }];
  Object.assign(S.profile, { sex: 'm', age: 25, height: 180, activity: 1.3, goal: 'recomp' }, x.profile || {});
  S.swap = {}; S.extra = {}; S.cust = {}; S.fights = {};
  if (x.day) S.swap[T] = x.day;
}, extra);
const N = page => page.evaluate(() => { const n = nutrition(T); return { ...n, items: n.act.map(a => [a.l, a.min, a.kcal]) }; });
const BASE = 2347;                                   // BMR 1805 * 1.3
const LOWER_A = 476, STRIKING = 819, RECOVERY = 196; // 85 min @ 5, 90 min @ 7.5, 70 min @ 3 MET gross

module.exports = { name: 'Training energy: calories, macros and water follow the day', tests: {
  async 'each day type has its own target: recovery < lifting < striking'(page, a){
    const kcal = async day => { await setup(page, { day }); return (await N(page)).tdee; };
    a.equal(await kcal('d7'), BASE + RECOVERY, 'recovery day');
    a.equal(await kcal('d1'), BASE + LOWER_A, 'lower A');
    a.equal(await kcal('d2'), BASE + STRIKING, 'striking');
    a.equal(await kcal('d4'), BASE + STRIKING, 'jiu-jitsu');
  },

  async 'a fight logged on a lifting day adds its own cost, scaled by the effort rating'(page, a){
    await setup(page, { day: 'd1' });
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; });
    let n = await N(page);
    a.equal(n.tdee, BASE + LOWER_A + 1022, '90 min at effort 8 = MET 9.11');
    a.deepEqual(n.items.map(i => i[0]).sort(), ['BJJ (gi)', 'Lower A']);
    await page.evaluate(() => { S.fights[T][0].rpe = 4; });
    a.equal((await N(page)).tdee, BASE + LOWER_A + 798, 'an easy roll costs less (MET 7.33)');
    await page.evaluate(() => { S.fights[T][0].rpe = 0; });
    a.equal((await N(page)).tdee, BASE + LOWER_A + 854, 'no rating = a middling 5');
    await page.evaluate(() => { S.fights[T][0] = { id: 'a', disc: 'drills', min: 60, rpe: 5 }; });
    a.equal((await N(page)).tdee, BASE + LOWER_A + 303, 'technique drilling is gentler (MET 4.61)');
  },

  async 'logging the class you already planned does not count it twice'(page, a){
    await setup(page, { day: 'd4' });                                                      // planned grappling, 90 min
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; });
    let n = await N(page);
    a.equal(n.tdee, BASE + 1022, 'the logged class replaces the planned one');
    a.equal(n.items.length, 1);
    await page.evaluate(() => { S.fights[T][0].min = 120; });
    n = await N(page);
    a.equal(n.items.length, 1, 'a longer class still covers the planned one');
    await page.evaluate(() => { S.fights[T][0].min = 45; });
    n = await N(page);
    a.equal(n.items.map(i => i[1]).sort((x, y) => x - y).join(), '45,45', 'a shorter one covers half of it; the other half stays planned');
    // a tagged BJJ class on a lifting day, then logged
    await setup(page, { day: 'd1' });
    await page.evaluate(() => { S.extra[T] = [{ id: 'e', l: 'BJJ class', s: '18:00', e: '19:30', t: 'physical', sp: 'bjj' }]; });
    const tagged = await N(page);
    a.deepEqual(tagged.items.find(i => /BJJ/.test(i[0])).slice(1), [90, 882], 'class average MET 8: 90 min, net 7');
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; });
    const both = await N(page);
    a.deepEqual(both.items.map(i => i[0]).sort(), ['BJJ (gi)', 'Lower A'], 'the tagged class drops out once it is logged');
  },

  async 'tagged practice is costed at net MET for its sport and time'(page, a){
    await setup(page, { day: 'd7' });
    await page.evaluate(() => { S.extra[T] = [{ id: 'e', l: 'Pickup', s: '17:00', e: '18:00', t: 'physical', sp: 'soccer' }]; });
    const n = await N(page);
    a.deepEqual(n.items.find(i => i[0].startsWith('Pickup')).slice(1), [60, 756], 'soccer: 60 min at MET 10, net 9 = 756');
    a.equal(n.extraMin, 130, 'the 70-minute recovery session plus the hour of soccer');
  },

  async 'custom workouts: lifting by sets and rest, runs by distance, replace removes the plan'(page, a){
    await setup(page, { day: 'd1' });
    const run = await page.evaluate(() => Object.keys(EXBYID).find(i => EXBYID[i].k === 'cardio' && /^run$/i.test(EXBYID[i].n)));
    a.ok(run, 'the library has a plain Run');
    await page.evaluate(run => { S.cust[T] = newCW('with'); S.cust[T].items = [run]; S.cust[T].sets[run] = [{ t: 1500, d: 5000 }]; }, run);
    let n = await N(page);
    a.deepEqual(n.items.find(i => i[0] === 'Run').slice(1), [25, 400], '5 km is about 1 kcal per kg per km, whatever the pace');
    a.equal(n.tdee, BASE + LOWER_A + 400);
    await page.evaluate(() => { S.cust[T].mode = 'replace'; });
    n = await N(page);
    a.equal(n.tdee, BASE + 400, 'a replacement session stands in for the planned one');
    // lifting: 12 sets x (40 s + 90 s rest) = 26 min at MET 5
    await page.evaluate(() => { S.cpref.rest = 90; S.cust[T] = newCW('with'); S.cust[T].items = ['barbell-bench-press']; S.cust[T].sets['barbell-bench-press'] = Array.from({ length: 12 }, () => ({ w: 60, r: 8 })); });
    n = await N(page);
    a.deepEqual(n.items.find(i => i[0] === 'Workout').slice(1), [26, 146]);
    // sets that belong to a planned block are already in the planned session
    await page.evaluate(() => { S.cust[T].blk = ['barbell-bench-press']; });
    a.equal((await N(page)).tdee, BASE + LOWER_A, 'planned-block sets are not counted again');
  },

  async 'macros: protein follows bodyweight, fat stays in a g/kg band, training calories land in carbs'(page, a){
    await setup(page, { day: 'd7' });
    const rest = await N(page);
    await setup(page, { day: 'd1' });
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'muaythai', min: 90, rpe: 8 }]; });
    const hard = await N(page);
    a.equal(rest.protein, 160); a.equal(hard.protein, 160);
    a.ok(hard.kcal > rest.kcal + 1000, 'a double day eats far more');
    a.ok(hard.fat >= 64 && hard.fat <= 96, `fat ${hard.fat} g stays within 0.8-1.2 g/kg`);
    a.ok(rest.fat >= 64 && rest.fat <= 96);
    a.ok(hard.carbs - rest.carbs > 200, 'the extra goes to carbs');
    for (const n of [rest, hard]) a.ok(Math.abs(n.protein * 4 + n.carbs * 4 + n.fat * 9 - n.kcal) <= 10, 'macros add up to the calories');
    await setup(page, { day: 'd1', profile: { goal: 'lean' } });
    const lean = await N(page);
    a.equal(lean.protein, 176, 'more protein while cutting');
    a.equal(lean.kcal, Math.round((BASE + LOWER_A) * 0.85 / 10) * 10);
  },

  async 'water: 40 ml per kg plus about 500 ml an hour of training'(page, a){
    await setup(page, { day: 'd7' });
    a.equal((await N(page)).water, ((3200 + 70 * 8) / 1000).toFixed(1));
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; });
    a.equal((await N(page)).water, ((3200 + 160 * 8) / 1000).toFixed(1));
  },

  async 'the old Weekly load setting is reset once, since training is now added by the day'(page, a){
    const r = await page.evaluate(() => {
      const out = [];
      for (const v of [1.725, 1.55, 1.9, 1.45]){ S.meta.act2 = false; S.profile.activity = v; normalizeCustom(); out.push([S.profile.activity, S.meta.act2]); }
      S.profile.activity = 1.725; normalizeCustom();                       // already migrated: left alone
      out.push(S.profile.activity);
      return out;
    });
    a.deepEqual(r, [[1.3, true], [1.3, true], [1.3, true], [1.45, true], 1.725]);
  },

  async 'Today and Fuel say where the training calories come from'(page, a){
    await setup(page, { day: 'd1' });
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; S.ui.fold.food = true; view = 'today'; render(); });
    const today = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
    a.match(today, /Training this day adds \+1498 kcal to the target: BJJ \(gi\) 90 min \(\+1022\), Lower A 85 min \(\+476\)/);
    await page.evaluate(() => { view = 'build'; buildSub = 'fuel'; render(); });
    const fuel = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
    a.match(fuel, /Maintenance today is near 3845 kcal: 2347 for your body and daily life, plus 1498 for training/);
    a.doesNotMatch(fuel, /NaN|undefined/);
  },
} };
