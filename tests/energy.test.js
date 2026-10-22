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
    // lifting: 12 sets of 8, each 24 s of work + 90 s rest = 22.8 min, unrated so RPE 7 (MET 4.75): net 3.75 x 1.4 x 22.8
    await page.evaluate(() => { S.cpref.rest = 90; S.cust[T] = newCW('with'); S.cust[T].items = ['barbell-bench-press']; S.cust[T].sets['barbell-bench-press'] = Array.from({ length: 12 }, () => ({ w: 60, r: 8 })); });
    n = await N(page);
    a.deepEqual(n.items.find(i => i[0] === 'Workout').slice(1), [23, 120]);
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

  async 'water: 40 ml per kg plus the sweat the day costs'(page, a){
    await setup(page, { day: 'd7' });
    a.equal((await N(page)).water, '3.5', '3,200 ml + 294 ml of sweat (196 kcal of recovery work x 1.5 ml)');
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; });
    a.equal((await N(page)).water, '5.0', 'plus 1,533 ml for a hard 90-minute roll');
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
  async 'a custom lifting set is costed by its RPE: harder sets cost more, unrated sets borrow the other ratings on that exercise'(page, a){
    await setup(page, { day: 'd7' });
    const cost = async rpe => { await page.evaluate(rpe => { S.cpref.rest = 90; S.cust[T] = newCW('with'); S.cust[T].items = ['barbell-bench-press'];
      S.cust[T].sets['barbell-bench-press'] = Array.from({ length: 12 }, () => ({ w: 60, r: 8, ...(rpe ? { rpe } : {}) })); }, rpe);
      return (await N(page)).items.find(i => i[0] === 'Workout').slice(1); };
    a.deepEqual(await cost(5), [23, 80], 'RPE 5 or less: MET 3.5');
    a.deepEqual(await cost(7), [23, 120], 'RPE 7: MET 4.75');
    a.deepEqual(await cost(9), [23, 160], 'RPE 9 or more: MET 6');
    a.deepEqual(await cost(10), [23, 160], 'it tops out at 9');
    a.deepEqual(await cost(0), [23, 120], 'no ratings at all counts as 7');
    await page.evaluate(() => { S.cust[T].sets['barbell-bench-press'].forEach((x, i) => { if (i < 6) x.rpe = 9; else delete x.rpe; }); });
    a.deepEqual((await N(page)).items.find(i => i[0] === 'Workout').slice(1), [23, 160], 'six sets rated 9 and six unrated: the unrated six count as 9');
  },

  async 'the number of sets, muscle size, supersets, warm-ups and plyos all change the cost'(page, a){
    await setup(page, { day: 'd7' });
    const work = sets => page.evaluate(sets => { S.cpref.rest = 90; S.cust[T] = newCW('with'); S.cust[T].items = Object.keys(sets); S.cust[T].sets = sets; }, sets).then(() => N(page)).then(n => n.items.find(i => i[0] === 'Workout').slice(1));
    const bench = (n, x = {}) => Array.from({ length: n }, () => ({ w: 60, r: 8, rpe: 9, ...x }));
    a.deepEqual(await work({ 'barbell-bench-press': bench(6) }), [11, 80], 'half the sets, half the cost');
    a.deepEqual(await work({ 'barbell-bench-press': bench(12) }), [23, 160]);
    a.deepEqual(await work({ 'barbell-curl': bench(12) }), [23, 131], 'isolation work on a small muscle costs 0.85 of the average');
    const squat = await work({ 'barbell-back-squat': bench(12) });
    a.ok(squat[1] > 160 && squat[1] < 190, `a squat costs more than a bench (${squat[1]})`);
    a.deepEqual(await work({ 'barbell-bench-press': bench(12, { wu: true, rpe: 0 }).slice(0, 4) }), [4, 10], 'four warm-up sets are light work with a short rest');
    // a superset partner rests only 15 s, so its sets take far less time
    await page.evaluate(() => { S.cust[T].items = ['barbell-bench-press', 'barbell-row']; S.cust[T].sets = { 'barbell-bench-press': Array.from({ length: 12 }, () => ({ w: 60, r: 8, rpe: 9 })), 'barbell-row': Array.from({ length: 12 }, () => ({ w: 60, r: 8, rpe: 9 })) }; S.cust[T].sup = {}; });
    const apart = (await N(page)).items.find(i => i[0] === 'Workout')[1];
    await page.evaluate(() => { S.cust[T].sup = { 'barbell-bench-press': true }; });
    const linked = (await N(page)).items.find(i => i[0] === 'Workout')[1];
    a.ok(linked < apart * 0.7, `superset ${linked} min vs ${apart} min apart`);
    // a longer rest timer means more minutes on the clock
    await page.evaluate(() => { S.cust[T].sup = {}; S.cpref.restEx['barbell-bench-press'] = 180; });
    a.ok((await N(page)).items.find(i => i[0] === 'Workout')[1] > apart, 'a 3-minute rest makes the session longer');
  },

  async 'cardio by distance: cycling is costed by speed, easy rides cost less than fast ones'(page, a){
    await setup(page, { day: 'd7' });
    const ride = (km, min) => page.evaluate(([km, min]) => { S.cust[T] = newCW('with'); S.cust[T].items = ['bike']; S.cust[T].sets.bike = [{ t: min * 60, d: km * 1000 }]; }, [km, min])
      .then(() => N(page)).then(n => n.items.find(i => i[0] === 'Bike').slice(1));
    a.deepEqual(await ride(20, 40), [40, 616], '30 km/h = MET 12');
    a.deepEqual(await ride(10, 40), [40, 168], '15 km/h = MET 4, net 3');
    a.ok((await ride(25, 40))[1] > 616, 'faster costs more');
  },

  async 'sweat carries sodium, potassium, calcium and magnesium, and the Plan setting scales it'(page, a){
    await setup(page, { day: 'd7' });
    let n = await N(page);
    a.equal(n.sweat, 294);
    a.deepEqual(n.loss, { Sodium: 294, Potassium: 57, Calcium: 12, Magnesium: 3 });
    await page.evaluate(() => { S.profile.sweat = 1.4; });
    n = await N(page);
    a.equal(n.sweat, 412); a.equal(n.loss.Sodium, 412, 'a heavy sweater loses 1.4x');
    await page.evaluate(() => { S.profile.sweat = 0.75; });
    a.equal((await N(page)).sweat, 221);
    await page.evaluate(() => { S.profile.sweat = 1; S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; });
    n = await N(page);
    a.equal(n.sweat, 294 + 1533); a.equal(n.loss.Sodium, 1827, 'a hard roll puts about 1.8 g of sodium in the day');
    // the Plan screen has the setting, and choosing it changes the target
    await page.evaluate(() => { view = 'plan'; render(); });
    await page.selectOption('[data-in="profile.sweat"]', '1.4');
    a.equal(await page.evaluate(() => S.profile.sweat), 1.4);
    a.equal(await page.evaluate(() => nutrition(T).sweat), Math.round(1022 * 1.5 * 1.4) + Math.round(196 * 1.5 * 1.4));
  },

  async 'MICROS targets for sodium, potassium, calcium and magnesium include the sweat; the rest are untouched'(page, a){
    await setup(page, { day: 'd7' });
    await page.evaluate(() => { S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; loadMicros(); });
    await page.waitForFunction(() => microState === 2);
    const html = await page.evaluate(() => { const list = [{ n: 'Banana', kcal: 105, p: 1, c: 27, f: 0, q: 1, mk: 9040, mg: 118 }];
      return microPanelHTML(list, nutrition(T)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); });
    a.match(html, /Sodium[^%]*% of limit of 4127 mg/, 'sodium limit is 2,300 + 1,827');
    a.match(html, /Potassium[^%]*% of 5056 mg/, '4,700 + 356');
    a.match(html, /Calcium[^%]*% of 1373 mg/, '1,300 + 73');
    a.match(html, /Magnesium[^%]*% of 438 mg/, '420 + 18');
    a.doesNotMatch(html, /Zinc[^%]*% of [0-9.]+ mg/, 'zinc is not scaled');
    a.match(html, /include what today's training sweat carries \(about 1,827 mg sodium\)/);
    const bare = await page.evaluate(() => microPanelHTML([{ n: 'Banana', kcal: 105, p: 1, c: 27, f: 0, q: 1, mk: 9040, mg: 118 }], { kcal: 2000 }).replace(/<[^>]+>/g, ' '));
    a.doesNotMatch(bare, /sweat/, 'no sweat note when there is none');
  },

  async 'Fuel explains the sweat, the in-session fuelling and a low energy availability warning'(page, a){
    await setup(page, { day: 'd1', profile: { goal: 'lean' } });
    await page.evaluate(() => { S.log = [{ date: T, weight: 80, bf: 15 }]; S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; view = 'build'; buildSub = 'fuel'; render(); });
    const t = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
    a.match(t, /Your goal is Lean out: the target sits about 15% under maintenance/);
    a.doesNotMatch(t, /set to recomposition/, 'the note follows the goal you chose');
    a.match(t, /Sweat: about 2\.2 L lost today, carrying roughly 2,247 mg sodium, 438 mg potassium, 90 mg calcium and 22 mg magnesium/);
    a.match(t, /During BJJ \(gi\): 30-60 g of carbs an hour, and drink to replace most of the roughly 1\.0 L an hour/);
    a.doesNotMatch(t, /During Lower A/, 'a lifting session is not an endurance-fuelling session');
    a.equal(await page.evaluate(() => nutrition(T).ea), 26, '(3,270 target - 1,498 training) / 68 kg of lean mass');
    a.match(t, /Low energy availability: this target leaves about 26 kcal per kg of lean mass once training is paid for/);
  },

  async 'no low-energy-availability warning at maintenance, or without a body-fat reading'(page, a){
    await setup(page, { day: 'd1' });
    await page.evaluate(() => { S.log = [{ date: T, weight: 80, bf: 15 }]; S.fights[T] = [{ id: 'a', disc: 'bjj', min: 90, rpe: 8 }]; view = 'build'; buildSub = 'fuel'; render(); });
    a.equal(await page.evaluate(() => nutrition(T).ea), 34, '(3,840 - 1,498) / 68');
    a.doesNotMatch(await page.evaluate(() => document.getElementById('app').textContent), /Low energy availability/);
    await page.evaluate(() => { S.profile.goal = 'lean'; S.log = [{ date: T, weight: 80 }]; render(); });
    a.equal(await page.evaluate(() => nutrition(T).ea), null, 'no body fat logged, so no lean mass to divide by');
    a.doesNotMatch(await page.evaluate(() => document.getElementById('app').textContent), /Low energy availability/);
  },
} };
