/* Injuries: report one on Today, get the rehab for the stage you're in, see which planned blocks to skip or go light on,
   and have the day's calorie target stop paying for training you can't do. */
const open = (page, day) => page.evaluate(day => { S.meta.start = dkey(-60); S.swap[VD()] = day; view = 'today'; openBlock = 'train'; render(); }, day);
const hurt = (page, area, sev, daysAgo) => page.evaluate(([area, sev, daysAgo]) => { S.injury = { area, sev, on: dkey(-daysAgo) }; render(); }, [area, sev, daysAgo]);
// block label -> 'AVOID' | 'LIGHT' | '' as drawn on Today
const marks = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.brow')].map(r => [
  r.querySelector('.lab').firstChild.textContent.trim(), (r.querySelector('.lab .badge') || { textContent: '' }).textContent])));
const app = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));

module.exports = { name: 'Injuries: rehab, limits and what to do instead', tests: {
  async 'reporting a sprained ankle from Today starts the plan'(page, a){
    await open(page, 'd1');
    await page.click('[data-act=inj-open]');
    await page.click('[data-act=inj-pick][data-v=area][data-v2=ankle]');
    await page.click('[data-act=inj-pick][data-v=sev][data-v2=mod]');
    await page.fill('#inj_on', await page.evaluate(() => dkey(-2)));
    await page.click('[data-act=inj-pick][data-v=sev][data-v2=mild]');     // picking again must not lose the date
    a.equal(await page.inputValue('#inj_on'), await page.evaluate(() => dkey(-2)));
    await page.click('[data-act=inj-save]');
    a.deepEqual(await page.evaluate(() => [S.injury.area, S.injury.sev, S.injury.on === dkey(-2)]), ['ankle', 'mild', true]);
    const t = await app(page);
    a.match(t, /ANKLE SPRAIN/); a.match(t, /PROTECT · DAY 3/);
    a.match(t, /MOVE ON WHEN/); a.match(t, /REHAB, DAILY/); a.match(t, /Still fine:/); a.match(t, /USE THE TIME/); a.match(t, /See a doctor if/);
    a.ok(!(await page.$('[data-act=inj-open]')), 'the report button goes away while an injury is active');
  },

  async 'an ankle sprain rules out the lower-body blocks and leaves the rest'(page, a){
    await open(page, 'd1'); await hurt(page, 'ankle', 'mild', 0);
    const m = await marks(page);
    for (const k of ['Box jumps — 4 x 3', 'Back squat — 4 x 5 @ RPE 8', 'Romanian deadlift — 3 x 8', 'Bulgarian split squat — 3 x 8/leg', 'Loaded carry — 4 x 40m', 'Finisher — 8 min rope or shadowboxing'])
      a.equal(m[k], 'AVOID', k);
    a.equal(m['Pallof press — 3 x 10/side'], ''); a.equal(m['Cooldown — 5 min'], '');
    a.match(await app(page), /6 of 8 blocks off-limits/);
    await open(page, 'd3');
    a.ok(Object.values(await marks(page)).every(x => x === ''), 'upper body is untouched by an ankle');
    a.match(await app(page), /Nothing here is affected/);
  },

  async 'the stage follows the days since the injury, and severity stretches it'(page, a){
    const stage = async (sev, d) => { await hurt(page, 'ankle', sev, d); return page.evaluate(() => injNow().st.n); };
    a.equal(await stage('mild', 0), 'PROTECT'); a.equal(await stage('mild', 3), 'MOVE'); a.equal(await stage('mild', 8), 'LOAD');
    a.equal(await stage('mild', 18), 'RETURN'); a.equal(await stage('mild', 400), 'RETURN', 'the last stage never runs out');
    a.equal(await stage('mod', 5), 'PROTECT', 'moderate takes twice as long'); a.equal(await stage('mod', 6), 'MOVE');
    a.equal(await stage('severe', 10), 'PROTECT');
    await open(page, 'd1'); await hurt(page, 'ankle', 'severe', 1);
    a.match(await app(page), /You rated this severe\. Get it examined/);
  },

  async 'blocks come back as the injury heals: squats go from AVOID to LIGHT to normal'(page, a){
    await open(page, 'd1');
    const squat = async d => { await hurt(page, 'ankle', 'mild', d); return (await marks(page))['Back squat — 4 x 5 @ RPE 8']; };
    a.equal(await squat(0), 'AVOID'); a.equal(await squat(4), 'LIGHT'); a.equal(await squat(10), 'LIGHT'); a.equal(await squat(20), '');
    a.equal((await marks(page))['Box jumps — 4 x 3'], 'LIGHT', 'impact is only "light" in the return stage');
  },

  async 'a shoulder injury flips it: upper body is out, legs are fine'(page, a){
    await open(page, 'd3'); await hurt(page, 'shoulder', 'mild', 0);
    const m = await marks(page);
    a.equal(m['Pause bench press — 4 x 5 @ RPE 8'], 'AVOID'); a.equal(m['Weighted pull-up — 4 x 5'], 'AVOID'); a.equal(m['Landmine press — 3 x 8/side'], 'AVOID');
    await open(page, 'd1');
    a.equal((await marks(page))['Back squat — 4 x 5 @ RPE 8'], '', 'squats are fine');
  },

  async 'the calorie target stops paying for blocks you cannot do'(page, a){
    await page.evaluate(() => { S.log = [{ date: T, weight: 80 }]; Object.assign(S.profile, { sex: 'm', age: 25, height: 180, activity: 1.3, goal: 'recomp' }); S.swap = { [T]: 'd1' }; S.cust = {}; S.fights = {}; });
    const full = await page.evaluate(() => nutrition(T).tdee);
    await hurt(page, 'ankle', 'mild', 0);
    const hurtKcal = await page.evaluate(() => nutrition(T).tdee);
    a.equal(full - hurtKcal, 476 - Math.round(476 * 2 / 8), 'Lower A is 476 kcal; 6 of its 8 blocks are out, so only a quarter is costed');
    await hurt(page, 'shoulder', 'mild', 0);
    const shoulder = full - await page.evaluate(() => nutrition(T).tdee);
    a.ok(Math.abs(shoulder - 476 / 8) < 1, 'a shoulder takes out only the shadowboxing finisher of a leg day: ' + shoulder);
    await page.evaluate(() => { S.injury = null; });
    a.equal(await page.evaluate(() => nutrition(T).tdee), full, 'healed: back to the full cost');
  },

  async 'USE THE TIME suggests the book you are reading, else the next one, plus a skill'(page, a){
    await open(page, 'd1'); await hurt(page, 'ankle', 'mild', 0);
    const book = await page.evaluate(() => BOOKS.filter(b => S.books[b.id] !== 2).sort((x, y) => x.p - y.p)[0].t);
    a.match(await app(page), new RegExp('Read 30 min: ' + book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*Next on your list'));
    await page.evaluate(() => { S.books.m3 = 1; render(); });
    a.match(await app(page), /Read 30 min: The Intelligent Investor.*You are already in it/);
    a.match(await app(page), /Move (Capital markets|Economics|Language|Presence|Technical craft) up a level/);
    await page.evaluate(() => { BOOKS.forEach(b => S.books[b.id] = 2); render(); });
    a.ok(!/Read 30 min:/.test(await app(page)), 'nothing to read -> no book line, and no crash');
  },

  async 'SORE AGAIN sets the clock back, HEALED clears it, and UNDO brings it back'(page, a){
    await open(page, 'd1'); await hurt(page, 'ankle', 'mild', 5);
    await page.click('[data-act=inj-sore]');
    a.equal(await page.evaluate(() => injNow().days), 2);
    await page.click('[data-act=inj-sore]'); await page.click('[data-act=inj-sore]');
    a.equal(await page.evaluate(() => injNow().days), 0, 'it never moves into the future');
    await page.click('[data-act=inj-heal]');
    a.equal(await page.evaluate(() => S.injury), null);
    a.ok(await page.$('[data-act=inj-open]'), 'the report button is back');
    await page.click('[data-act=undo]');
    a.equal(await page.evaluate(() => S.injury.area), 'ankle');
  },

  async 'the plan survives a reload, an old backup, and a damaged injury entry'(page, a){
    await open(page, 'd1'); await hurt(page, 'ankle', 'mild', 4);
    await page.evaluate(() => Store.save(S));
    await page.reload(); await page.waitForFunction(() => typeof render === 'function' && document.getElementById('app').innerHTML.length > 0);
    a.equal(await page.evaluate(() => injNow().st.n), 'MOVE');
    for (const bad of [{ area: '__proto__', sev: 'mild', on: dkey_() }, { area: 'ankle', sev: 'banana', on: 'soon' }, { area: 'knee' }, 'ankle', 7, []]) {
      await page.evaluate(b => { S.injury = b; render(); }, bad);
      a.ok((await app(page)).length > 100, 'Today still draws with ' + JSON.stringify(bad));
    }
    await page.evaluate(() => { S.injury = { area: 'ankle', sev: 'banana', on: dkey(-1) }; });
    a.equal(await page.evaluate(() => injNow().m), 1, 'an unknown severity counts as mild');
    const old = require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'old-state.json'), 'utf8');
    await page.evaluate(s => { adoptState(JSON.parse(s)); render(); }, old);
    a.equal(await page.evaluate(() => S.injury), null, 'a backup from before injuries restores with none');
  },

  async 'every area has four stages with rehab, a goal, a safe list and a doctor line, and only known movement tags'(page, a){
    const bad = await page.evaluate(() => {
      const tags = new Set(MOVES.map(m => m[0])), out = [];
      for (const [k, v] of Object.entries(INJURY)){
        if (!v.label || !v.flags) out.push(k + ' label/flags');
        if (v.stages.length !== 4) out.push(k + ' stages');
        v.stages.forEach((s, i) => {
          if (!s.goal || !s.ok || s.rehab.length < 3) out.push(`${k}[${i}] text`);
          if (i < 3 && !(s.to > (v.stages[i - 1] ? v.stages[i - 1].to : 0))) out.push(`${k}[${i}] order`);
          for (const t of [...s.avoid, ...s.care]) if (!tags.has(t)) out.push(`${k}[${i}] tag ${t}`);
          if (s.avoid.some(t => s.care.includes(t))) out.push(`${k}[${i}] avoid+care`);
        });
      }
      return out;
    });
    a.deepEqual(bad, []);
  },
} };
function dkey_(){ const d = new Date(); return d.toISOString().slice(0, 10); }
