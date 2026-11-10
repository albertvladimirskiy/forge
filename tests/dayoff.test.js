/* Days off (sick, travel, rest), the My Week screen split out of Settings, and the trimmed Today. */
const app = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
const today = (page, day) => page.evaluate(d => { S.meta.start = dkey(-60); S.swap[T] = d; view = 'today'; viewOff = 0; render(); }, day);

module.exports = { name: 'Days off and My Week', tests: {
  async 'a sick day sets the plan aside: no training slot, no training calories, guidance shown'(page, a){
    await page.evaluate(() => { S.log = [{ date: T, weight: 80 }]; S.cust = {}; S.fights = {}; });
    await today(page, 'd1');
    const before = await page.evaluate(() => nutrition(T).tdee);
    await page.click('[data-act=off-open]');
    await page.click('[data-act=off-pick][data-v=sick]');
    await page.click('[data-act=off-save]');
    a.equal(await page.evaluate(() => S.off[T]), 'sick');
    a.equal(await page.evaluate(() => buildDay(T).entries.some(e => e.id === 'train')), false);
    a.equal(before - await page.evaluate(() => nutrition(T).tdee), 476, 'Lower A no longer costed');
    const t = await app(page);
    a.match(t, /Sick day/); a.match(t, /SICK DAY · LOWER A SET ASIDE/); a.match(t, /Neck check/);
    a.ok(!(await page.$('[data-act=off-open]')), 'no second DAY OFF button on a day off');
    await page.click('[data-act=off-clear]');
    a.equal(await page.evaluate(() => buildDay(T).entries.some(e => e.id === 'train')), true, 'BACK ON IT restores the session');
  },

  async 'travel covers several days in a row, and BACK ON IT clears the rest of the run'(page, a){
    await today(page, 'd1');
    await page.click('[data-act=off-open]');
    await page.click('[data-act=off-pick][data-v=travel]');
    await page.fill('#off_to', await page.evaluate(() => addDays(T, 3)));
    await page.click('[data-act=off-save]');
    a.deepEqual(await page.evaluate(() => [0, 1, 2, 3, 4].map(i => offOf(addDays(T, i)))), ['travel', 'travel', 'travel', 'travel', null]);
    await page.evaluate(() => { viewOff = 2; render(); });
    a.match(await app(page), /Travel day/); a.match(await app(page), /Hotel-room circuit/);
    await page.click('[data-act=off-clear]');
    a.deepEqual(await page.evaluate(() => [0, 1, 2, 3].map(i => offOf(addDays(T, i)))), ['travel', 'travel', null, null]);
  },

  async 'days off pause the streak instead of breaking it, and stay out of the slipping pattern'(page, a){
    const st = () => page.evaluate(() => streak());
    await page.evaluate(() => { S.days = {}; for (const i of [1, 2, 5, 6]) S.days[dkey(-i)] = { blocks: { x: true, y: true, z: true }, habits: {}, rv: {}, nudge: {}, food: [] }; });
    a.equal(await st(), 2, 'a gap breaks it');
    await page.evaluate(() => { S.off[dkey(-3)] = 'sick'; S.off[dkey(-4)] = 'sick'; });
    a.equal(await st(), 4, 'two sick days bridge it, without counting themselves');
    a.equal(await page.evaluate(() => bestStreakEver()), 4);
    await page.evaluate(() => { S.meta.start = dkey(-60); S.days = {}; S.off = {}; for (let i = 1; i <= 28; i++) if (dowIdx(dkey(-i)) === 0) S.off[dkey(-i)] = 'rest'; });
    a.ok(await page.evaluate(() => { const p = skipPattern(); return !p || p.day !== 'Mon'; }), 'Mondays taken off are not "the day you skip"');
  },

  async 'no evening streak nag on a day off, and junk in S.off is ignored'(page, a){
    await page.evaluate(() => { S.off = { [T]: 'rest' }; });
    a.equal(await page.evaluate(() => briefTag()), 'general');
    for (const bad of [{ [await page.evaluate(() => T)]: '__proto__' }, { x: 5 }, 'sick', null, []]){
      await page.evaluate(b => { S.off = b; view = 'today'; render(); }, bad);
      a.ok(await page.evaluate(() => offOf(T) === null), JSON.stringify(bad));
    }
    await page.evaluate(() => { S.off = 'junk'; render(); });
    await page.click('[data-act=off-open]'); await page.click('[data-act=off-save]');
    a.equal(await page.evaluate(() => S.off[T]), 'sick', 'a junk value is replaced, not written into');
  },

  async 'My Week has its own screen behind the calendar icon; Settings keeps settings'(page, a){
    await page.click('.gear[data-v=week]');
    let t = await app(page);
    for (const x of ['Plan the week', 'WEEK AHEAD', 'MY WEEK', 'ONE-OFF EVENT', 'PUT IT IN YOUR CALENDAR']) a.ok(t.includes(x), 'week: ' + x);
    for (const x of ['BARBELL + PLATES', 'BODY PROFILE', 'TEXT SIZE']) a.ok(!t.includes(x), 'week should not have ' + x);
    await page.click('[data-act=planday][data-v=tue]'); await page.click('[data-act=preset][data-v=Class]'); await page.click('[data-act=addcmt]');
    a.equal(await page.evaluate(() => S.fixed.tue.length), 1, 'adding a commitment still works there');
    await page.click('.gear[data-v=plan]');
    t = await app(page);
    for (const x of ['TRAINING PROGRAM', 'BOUNDARIES', 'BARBELL + PLATES', 'BODY PROFILE', 'TEXT SIZE']) a.ok(t.includes(x), 'settings: ' + x);
    for (const x of ['WEEK AHEAD', 'ONE-OFF EVENT', "Put the week in your phone's calendar"]) a.ok(!t.includes(x), 'settings should not have ' + x);
  },

  async 'Today: no settings/reset buttons, RESET TIMES lives in the schedule view, mobility replaces outreach'(page, a){
    await today(page, 'd1');
    a.ok(!(await page.$('#app main [data-act=view][data-v=plan]')), 'no SETTINGS + WEEK button');
    a.equal(await page.evaluate(() => document.querySelectorAll('main [data-act=reflow]').length), 0, 'no RESET TIMES while the schedule view is folded');
    await page.evaluate(() => { S.ui.fold.rail = true; render(); });
    a.equal(await page.evaluate(() => document.querySelectorAll('.railhint [data-act=reflow]').length), 1);
    a.deepEqual(await page.evaluate(() => HABITS.map(h => h.l)), ['7.5h sleep', 'No phone first hour', 'Hit protein', '10 min mobility', 'Read 30 min', 'No alcohol']);
    a.ok(await page.$('[data-act=inj-open]') && await page.$('[data-act=off-open]'), 'HURT? and DAY OFF sit together');
  },
} };
