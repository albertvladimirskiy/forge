/* Fixes from the full-app review: damaged saves, food quantities, the BODY score, deadlift steps, fight camp dates,
   the ramp banner, recomp wording, onboarding goal, and the library's first view. */
const app = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
const sets = (w, r, n) => Array.from({ length: n }, () => ({ w, r }));

module.exports = { name: 'Review fixes', tests: {
  async 'a damaged save opens the recovery screen and is not overwritten'(page, a){
    await page.evaluate(() => { localStorage.setItem('forge.v1', '{"days":{"2026-01-01"'); });
    await page.reload(); await page.waitForFunction(() => document.getElementById('app').innerHTML.length > 0);
    a.match(await app(page), /COULDN'T DRAW YOUR SAVED DATA/);
    a.match(await app(page), /damaged/);
    await page.waitForTimeout(300);
    a.equal(await page.evaluate(() => localStorage.getItem('forge.v1')), '{"days":{"2026-01-01"', 'the damaged file is left alone for recovery');
    page.errors.length = 0;
  },

  async 'a food entry without a quantity counts once instead of turning the day into NaN'(page, a){
    const t = await page.evaluate(() => { day(T).food = [{ n: 'Old entry', kcal: 200, p: 20, c: 10, f: 5 }, { n: 'Half', kcal: 100, p: 0, c: 0, f: 0, q: 0.5 }]; return foodTotals(T); });
    a.deepEqual(t, { kcal: 250, p: 20, c: 10, f: 5 });
  },

  async 'BODY counts the strength standards your program trains, so hitting them all reaches the full lift share'(page, a){
    const v = await page.evaluate(() => {
      S.log = [{ date: T, weight: 80 }]; S.tiers = {}; S.gym = {};
      for (const s of LIFTS) if (!['ohp', 'dip'].includes(s.k)) S.log.push({ date: dkey(-1), [s.k]: 80 * s.m });
      return pillars()[0].v;
    });
    a.equal(Math.round(v), 60, 'six program lifts at standard = the whole 60% lift share (ohp and dips are in no program)');
    const w = await page.evaluate(() => { S.log.push({ date: dkey(-1), ohp: 40 }); return pillars()[0].v; });
    a.ok(w < 60, 'logging a lift outside the plan adds it to the average');
  },

  async 'deadlift climbs 10 lb while every session is clean, then 5 lb once reps have been missed'(page, a){
    const lb = kg => Math.round(kg * 2.20462);
    const rx = () => page.evaluate(() => { const r = prescribe('dead'); return [r.mode, r.w]; });
    await page.evaluate(() => { S.meta.start = dkey(-60); S.deload = {}; S.gym = { [dkey(-7)]: { dead: [] }, [dkey(-3)]: { dead: [] } };
      S.gym[dkey(-7)].dead = Array.from({ length: 3 }, () => ({ w: 90, r: 5 })); S.gym[dkey(-3)].dead = Array.from({ length: 3 }, () => ({ w: 94.54, r: 5 })); });
    let [m, w] = await rx(); a.equal(m, 'progress'); a.equal(lb(w), lb(94.54 + 4.54), '+10 lb');
    await page.evaluate(() => { S.gym[dkey(-7)].dead[2].r = 3; });
    [m, w] = await rx(); a.equal(lb(w), lb(94.54 + 2.27), '+5 lb after a miss');
    await page.evaluate(() => { S.gym[dkey(-7)].dead[2].r = 5; S.gym[dkey(-3)].dead[2].rpe = 9; });
    [m, w] = await rx(); a.equal(lb(w), lb(94.54 + 2.27), '+5 lb after a grinding RPE 9 session');
    a.equal(await page.evaluate(() => { S.gym = { [dkey(-3)]: { squat: Array.from({ length: 4 }, () => ({ w: 100, r: 5 })) } }; return Math.round((prescribe('squat').w - 100) * 100); }), 227, 'single-step lifts are unchanged');
  },

  async 'a fight camp refuses a weigh-in after the fight'(page, a){
    await page.evaluate(() => { view = 'wlog'; wlSub = 'fights'; campEdit = true; render(); });
    await page.fill('#cp_date', await page.evaluate(() => addDays(T, 20)));
    await page.fill('#cp_wi', await page.evaluate(() => addDays(T, 21)));
    await page.click('[data-act=camp-save]');
    a.equal(await page.evaluate(() => S.camp.date), undefined);
    a.match(await page.evaluate(() => document.querySelector('.toast').textContent), /after the fight/);
  },

  async 'the ramp-week banner only shows on days with a lift to load'(page, a){
    const ramp = day => page.evaluate(d => { S.meta.start = T; S.swap[T] = d; view = 'today'; render(); return /Ramp week 1 of 2/.test(document.getElementById('app').textContent); }, day);
    a.equal(await ramp('d2'), false, 'striking'); a.equal(await ramp('d4'), false, 'jiu-jitsu'); a.equal(await ramp('d1'), true, 'lower A');
  },

  async 'recomp reads as maintenance, not "-3 kcal" from rounding'(page, a){
    await page.evaluate(() => { S.log = [{ date: T, weight: 79.38 }]; Object.assign(S.profile, { height: 177.8, age: 22, sex: 'm', goal: 'recomp', activity: 1.3 }); S.swap[T] = 'd2'; view = 'build'; buildSub = 'target'; render(); });
    const t = await app(page);
    a.match(t, /Right at maintenance/); a.ok(!/-\d kcal vs your/.test(t));
  },

  async 'onboarding asks the goal and daily life, and they set the calorie target'(page, a){
    await page.evaluate(() => { S.meta.onboarded = false; obStep = 1; obD = null; render(); });
    await page.fill('[data-ob=weight]', '175');
    await page.click('[data-act=ob-set][data-v=goal][data-v2=lean]');
    await page.click('[data-act=ob-set][data-v=activity][data-v2="1.45"]');
    for (let i = 0; i < 4; i++) await page.click('[data-act=ob-next]');
    a.deepEqual(await page.evaluate(() => [S.profile.goal, S.profile.activity, S.meta.onboarded]), ['lean', 1.45, true]);
  },

  async 'the library opens folded, or on the track you are reading'(page, a){
    await page.evaluate(() => { openTrack = undefined; view = 'mind'; render(); });
    a.ok(!/The Psychology of Money/.test(await app(page)), 'no track open on a first visit');
    await page.evaluate(() => { openTrack = undefined; S.books.ph2 = 1; render(); });
    a.match(await app(page), /The Last Days of Socrates/);
  },
} };
