const fs = require('fs'), path = require('path');

const app = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
/* add a food the way a person does: open the picker, search, (optionally enter grams), tap the row */
const addByName = async (page, name, grams) => {
  const idx = await page.evaluate(name => FOODS.findIndex(f => f[0] === name), name);
  if (idx < 0) throw new Error('no food ' + name);
  await page.evaluate(() => { foodOpen = true; render(); });
  await page.fill('#foodq', name);
  if (grams) await page.fill('#foodg', String(grams));
  await page.click(`[data-act=addfood][data-v="${idx}"][data-v2="1"]`);
};

module.exports = { name: 'Food data: no duplicates, micronutrients, collapsible food list', tests: {
  async 'the food list has no duplicates (case, spacing or punctuation) and no mangled names'(page, a){
    const r = await page.evaluate(() => {
      const seen = new Map(), dupes = [], key = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '');
      FOODS.forEach(f => { const k = key(f[0]); if (seen.has(k)) dupes.push(f[0] + ' / ' + seen.get(k)); else seen.set(k, f[0]); });
      return { dupes, caps: FOODS.map(f => f[0]).filter(n => /[a-z]Nuts\b/.test(n)), brazil: FOODS.filter(f => /brazil ?nut/i.test(f[0])).map(f => f[0]) };
    });
    a.deepEqual(r.dupes, []);
    a.deepEqual(r.caps, [], 'the "peaNuts"/"walNuts" name bug is back');
    a.equal(r.brazil.length, 2, 'Brazil nuts: the 1 oz serving and the USDA 100 g row, not three: ' + JSON.stringify(r.brazil));
  },

  async 'every micronutrient reference in the food list points at a real USDA record'(page, a){
    const r = await page.evaluate(async () => {
      loadMicros(); await new Promise(res => { const t = setInterval(() => { if (microReady()) { clearInterval(t); res(); } }, 20); });
      const bad = [], w = MICRO_DEF.length; let withRef = 0;
      FOODS.forEach(f => { if (f[6]) { withRef++; const rec = MICROS[Math.abs(f[6])]; if (!rec) bad.push(f[0]); else if (!f[5] && !(f[7] > 0)) bad.push(f[0] + ' (no grams)'); } });
      const longest = Math.max(...Object.values(MICROS).map(r => r.length));
      return { bad, withRef, total: FOODS.length, longest, defs: w };
    });
    a.deepEqual(r.bad, []);
    a.ok(r.withRef > 6900, 'expected most of the list to carry micronutrient data, got ' + r.withRef + ' of ' + r.total);
    a.ok(r.longest <= r.defs, 'a micro record has more values than MICRO_DEF has nutrients');
  },

  async 'a logged food remembers its USDA record, and the MICROS view adds up vitamins and minerals'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; render(); });
    await addByName(page, 'Banana');
    const f = await page.evaluate(() => day(VD()).food[0]);
    a.ok(f.mk > 0 && f.mg > 50, 'the entry should carry mk/mg: ' + JSON.stringify(f));
    await page.click('[data-act=foodview][data-v=micro]');
    await page.waitForFunction(() => /Potassium/.test(document.getElementById('app').textContent));
    const t = await app(page);
    a.match(t, /Counted from 1 of 1 food/);
    const k = await page.evaluate(() => { const m = dayMicros(day(VD()).food); return m.tot[MICRO_DEF.findIndex(d => d[0] === 'Potassium')]; });
    a.ok(k > 300 && k < 500, 'a banana has about 420 mg potassium, got ' + k);
    a.equal(await page.evaluate(() => S.ui.fv), 'micro', 'the choice is saved');
    await page.click('[data-act=foodview][data-v=macro]');
    a.ok(await page.$('.fuelbar') || /Log a weight/.test(await app(page)), 'back on macros');
  },

  async 'USDA 100 g rows scale by the grams you enter, and doubling a serving doubles the micros'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; render(); });
    await addByName(page, 'Spinach, raw', 200);
    await page.evaluate(() => { loadMicros(); return new Promise(res => { const t = setInterval(() => { if (microReady()) { clearInterval(t); res(); } }, 20); }); });
    const r = await page.evaluate(() => { const e = day(VD()).food[0]; const m = entryMicros(e); return { mg: e.mg, k: m.v[MICRO_DEF.findIndex(d => d[0] === 'Vitamin K')] }; });
    a.equal(r.mg, 200);
    a.ok(r.k > 900 && r.k < 1100, '200 g of raw spinach is ~966 µg vitamin K, got ' + r.k);
    await page.evaluate(() => { day(VD()).food[0].q = 2; });
    a.ok(await page.evaluate(() => entryMicros(day(VD()).food[0]).v[MICRO_DEF.findIndex(d => d[0] === 'Vitamin K')]) > 1800);
  },

  async 'foods with no data are reported, not silently counted; older entries are found by name'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; S.ui.fv = 'micro';
      day(VD()).food = [{ n: 'Homemade chili', kcal: 400, p: 30, c: 30, f: 15, q: 1 }, { n: 'Banana', kcal: 105, p: 1, c: 27, f: 0, q: 1 }]; render(); });
    await page.waitForFunction(() => /Counted from/.test(document.getElementById('app').textContent));
    const t = await app(page);
    a.match(t, /Counted from 1 of 2 foods/);
    a.match(t, /No micronutrient data for: Homemade chili/);
  },

  async 'the foods-eaten list closes and opens, and each food opens to its macros and micros'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; day(VD()).food = [{ n: 'Banana', kcal: 105, p: 1, c: 27, f: 0, q: 1 }, { n: 'Egg, large', kcal: 72, p: 6, c: 0, f: 5, q: 2 }]; render(); });
    a.equal(await page.evaluate(() => document.querySelectorAll('.foodlist .cmt').length), 2);
    await page.click('[data-act=fold][data-v=foodlist]');
    a.equal(await page.evaluate(() => document.querySelectorAll('.foodlist .cmt').length), 0, 'closed list hides the foods');
    a.match(await app(page), /FOODS EATEN · 2/, 'the header still shows the count');
    await page.click('[data-act=fold][data-v=foodlist]');
    await page.click('[data-act=foodrow][data-v="1"]');
    const d = await page.evaluate(() => document.querySelector('.fdet').textContent.replace(/\s+/g, ' '));
    a.match(d, /P 12g/, 'two eggs: 12 g protein');
    await page.waitForSelector('.fdet .mgrid');
    a.equal(await page.evaluate(() => document.querySelectorAll('.fdet').length), 1);
    await page.click('[data-act=foodrows]');
    a.equal(await page.evaluate(() => document.querySelectorAll('.fdet').length), 2, 'EXPAND ALL opens every food');
    await page.click('[data-act=foodrows]');
    a.equal(await page.evaluate(() => document.querySelectorAll('.fdet').length), 0, 'COLLAPSE ALL closes them');
  },

  async 'the new rows are small enough and the micro file is cached for offline use'(page, a){
    const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    a.match(sw, /micros-db\.js/);
    a.ok(fs.statSync(path.join(__dirname, '..', 'micros-db.js')).size < 800 * 1024);
  },

  async 'micro view and open food rows fit a 320px phone'(page, a){
    const { openApp } = require('./lib');
    const pg = await openApp(page.ctx.browser(), { width: 320 });
    try {
      await pg.evaluate(() => { S.ui.fold.food = true; S.ui.fv = 'micro';
        day(VD()).food = [{ n: 'Pantothenic test, 150 g', kcal: 100, p: 5, c: 10, f: 2, q: 1, mk: 11090, mg: 150 }, { n: 'Banana', kcal: 105, p: 1, c: 27, f: 0, q: 1 }]; render(); loadMicros();
        return new Promise(res => { const t = setInterval(() => { if (microReady()) { clearInterval(t); res(); } }, 20); }); });
      await pg.evaluate(() => { foodRows.add(VD() + '|0'); foodRows.add(VD() + '|1'); render(); });
      const w = await pg.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      a.ok(w[0] <= w[1], 'page is wider than the phone: ' + w);
    } finally { await pg.ctx.close(); }
  },

  async 'energy-linked targets scale with the calorie target, the rest stay fixed'(page, a){
    const r = await page.evaluate(async () => {
      loadMicros(); await new Promise(res => { const t = setInterval(() => { if (microReady()) { clearInterval(t); res(); } }, 20); });
      const list = [{ n: 'Banana', kcal: 105, p: 1, c: 27, f: 0, q: 1, ...microRef(FOODS.find(x => x[0] === 'Banana')) }];
      const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      return { base: strip(microPanelHTML(list)), big: strip(microPanelHTML(list, { kcal: 3000 })), scale: [microScale(null), microScale({ kcal: 3000 }), microScale({ kcal: 500 })] };
    });
    a.deepEqual(r.scale, [1, 1.5, 0.75]);
    a.match(r.big, /Fiber[^%]*% of 42 g/, 'fiber target is 14 g per 1,000 kcal: 42 g at 3,000 kcal');
    a.match(r.big, /scaled to your 3,000 kcal target/);
    a.ok(!/Potassium[^%]*% of/.test(r.big), 'potassium is not scaled');
    a.ok(!/scaled to your/.test(r.base), 'no scaling note at 2,000 kcal / no target');
  },

  async 'supplements: log a nutrient and amount, convert IU, remember it, and count it in the totals'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; S.ui.fv = 'micro'; day(VD()).food = []; render(); });
    const days0 = await page.evaluate(() => Object.keys(S.days).length);
    await page.click('[data-act=suppform]');
    const add = async (key, amt, unit) => { await page.selectOption('#sp_k', key); await page.fill('#sp_a', String(amt)); await page.selectOption('#sp_u', unit); await page.click('[data-act=addsupp]');
      /* the first add starts loading the micro table, and its arrival re-renders the form: wait for that or the next entry is typed into a form about to be rebuilt */
      await page.waitForFunction(() => microState === 2);
      if (!(await page.$('#sp_k'))) await page.click('[data-act=suppform]'); };
    await add('vitc', 500, 'mg');
    a.deepEqual(await page.evaluate(() => day(VD()).supps), [{ k: 'vitc', a: 500 }]);
    a.equal(await page.$eval('#sp_a', e => e.value), '', 'the amount box is empty again once the supplement is added');
    await add('vitd', 2000, 'IU');
    a.equal(await page.evaluate(() => day(VD()).supps[1].a), 50, '2000 IU of vitamin D is 50 µg');
    await add('b12', 1000, 'µg');
    await add('zn', 15, 'mg');
    a.deepEqual(await page.evaluate(() => day(VD()).supps.map(s => s.k + ':' + s.a)), ['vitc:500', 'vitd:50', 'b12:1000', 'zn:15']);
    // the unit box follows the nutrient, and IU is refused where it means nothing
    await page.selectOption('#sp_k', 'zn');
    a.equal(await page.$eval('#sp_u', e => e.value), 'mg');
    await page.fill('#sp_a', '10'); await page.selectOption('#sp_u', 'IU'); await page.click('[data-act=addsupp]');
    a.equal(await page.evaluate(() => day(VD()).supps.length), 4, 'IU for zinc must not be saved');
    await page.waitForFunction(() => /500 mg of that from supplements/.test(document.getElementById('app').textContent));
    const t = await app(page);
    a.match(t, /Includes 4 supplements/);
    a.match(t, /Vitamin C 556 mg|Vitamin C 500 mg/, 'vitamin C total shows');
    // kept as one-tap presets (no duplicates), and logging one adds it again
    a.equal(await page.evaluate(() => S.mysupps.length), 4);
    await page.click('[data-act=addmysupp][data-v="0"]');
    a.equal(await page.evaluate(() => day(VD()).supps.length), 5);
    await page.click('[data-act=delsupp][data-v="4"]');
    a.equal(await page.evaluate(() => day(VD()).supps.length), 4);
    a.equal(await page.evaluate(() => Object.keys(S.days).length), days0, 'only today got a record');
  },

  async 'supplements above the adult upper limit are flagged, and yesterday can be copied'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; S.ui.fv = 'micro';
      S.days[dkey(-1)] = { blocks: {}, habits: {}, rv: {}, nudge: {}, food: [], supps: [{ k: 'zn', a: 60 }, { k: 'mg', a: 400 }, { k: 'vitc', a: 500 }] }; render(); });
    a.match(await page.evaluate(() => document.querySelector('[data-act=copysupps]').textContent), /YESTERDAY'S SUPPLEMENTS · 3/);
    const n0 = await page.evaluate(() => Object.keys(S.days).length);
    await page.click('[data-act=copysupps]');
    a.equal(await page.evaluate(() => day(VD()).supps.length), 3);
    await page.waitForFunction(() => /above the adult upper limit/.test(document.getElementById('app').textContent));
    const t = await app(page);
    a.match(t, /Today is above the adult upper limit of 40 mg/, 'zinc 60 mg > 40 mg');
    a.match(t, /Supplements alone are above the adult upper limit of 350 mg/, 'supplemental magnesium 400 mg > 350 mg');
    a.equal((t.match(/above the adult upper limit/g) || []).length, 2, 'vitamin C 500 mg is fine');
  },

  async 'a day with only supplements still shows micros, and old saved days without supplements load'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; S.ui.fv = 'micro'; delete day(VD()).supps; day(VD()).food = []; render(); });
    a.match(await app(page), /Log some food or a supplement/);
    await page.evaluate(() => { day(VD()).supps = [{ k: 'se', a: 100 }, { k: 'bogus', a: 5 }, null, { k: 'ca', a: -3 }]; render(); loadMicros(); });
    await page.waitForFunction(() => /Includes \d+ supplement/.test(document.getElementById('app').textContent));
    a.match(await app(page), /Includes 1 supplement\./, 'malformed entries are ignored');
    a.deepEqual(await page.evaluate(() => [suppAmount('vita', 5000, 'IU'), suppAmount('vite', 400, 'IU'), suppAmount('zn', 5, 'IU'), suppAmount('se', 100, 'µg'), suppAmount('mg', 0.4, 'g')]), [1500, 268, null, 100, 400]);
  },
} };
