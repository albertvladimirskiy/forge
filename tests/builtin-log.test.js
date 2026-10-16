const { LB } = require('./lib');

const day = (page, block, off = 0) => page.evaluate(([block, off]) => { S.meta.start = dkey(-60); viewOff = off;
  S.swap[VD()] = Object.values(ALLDAYS).find(d => d.blocks.some(b => b.id === block)).id;
  view = 'today'; openBlock = 'train'; openBlock2 = block; render(); }, [block, off]);
const body = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));

module.exports = { name: 'Built-in sessions: Train > Workouts + logging for carries, core, dips', tests: {
  async 'a planned session with logged lifts shows under Train > Workouts, not just custom ones'(page, a){
    await page.evaluate(() => { const k = dkey(-1); S.swap[k] = 'd1'; S.gym[k] = { squat: [{ w: 100, r: 5 }, { w: 100, r: 5 }] }; day(k).blocks.d1b = true; day(k).blocks.d1c = true;
      view = 'wlog'; wlSub = 'workouts'; render(); });
    const t = await body(page);
    a.match(t, /Lower A/, 'the planned session title should be listed');
    a.match(t, /2\/\d+ blocks/);
    await page.click('[data-act=wl-day]');
    a.match(await body(page), /Back squat.*× 5, 5/, 'the logged squat should be in the expanded session');
  },

  async 'a day with only ticked blocks is listed; a craft day and an untouched day are not'(page, a){
    await page.evaluate(() => { S.swap[dkey(-2)] = 'd4'; day(dkey(-2)).blocks.d4b = true;      // Brazilian Jiu-Jitsu
      S.swap[dkey(-3)] = 'd6'; day(dkey(-3)).blocks.d6a = true;                                  // Craft Day
      view = 'wlog'; wlSub = 'workouts'; render(); });
    const t = await body(page);
    a.match(t, /Brazilian Jiu-Jitsu/);
    a.ok(!/Craft Day/.test(t), 'craft is not a workout');
  },

  async 'carries, core, dips and power work have a real log inside their block'(page, a){
    const cases = [['d1a', 'Box Jump'], ['d1e', "Farmer's Walk"], ['d1f', 'Pallof Press'], ['d2e', 'Plank'], ['d3f', 'Dead Hang'],
      ['d5a', 'Medicine Ball Rotational Throw'], ['d5d', 'Kettlebell Swing'], ['d8f', "Farmer's Walk"], ['d8g', 'Dip'], ['d9d', 'Plate Pinch Carry']];
    for (const [block, name] of cases){
      await day(page, block);
      a.ok(await page.evaluate(n => exInfo(exSlug(n)).n === n, name), name + ' must exist in the exercise library');
      a.ok(await page.$(`[data-act=w-blkadd][data-v="${await page.evaluate(n => exSlug(n), name)}"]`), name + ' should offer a log button in ' + block);
    }
  },

  async 'logging a farmer carry and dips inside the block keeps weight, reps and distance, and does not open "your workout"'(page, a){
    await day(page, 'd8f');
    const id = await page.evaluate(() => exSlug("Farmer's Walk"));
    await page.click(`[data-act=w-blkadd][data-v="${id}"]`);
    a.ok(await page.$('.xbody'), 'the exercise card opens in the block');
    const fields = await page.$$eval('.xbody input', els => els.length);
    a.ok(fields >= 2, 'weight and distance inputs');
    a.ok(!(await body(page)).includes('YOUR WORKOUT'), 'the day-level workout panel stays out of the way');
    await page.evaluate(id => { const cw = curCW(); cw.sets[id] = [{ w: 40, d: 40 }]; render(); }, id);
    a.match(await body(page), /40 m/);
    // the same exercise logged in a block on another day is the benchmark here too
    await page.evaluate(() => { view = 'wlog'; wlSub = 'workouts'; render(); });
    a.match(await body(page), /Upper B/, 'a day with only block logs is named after its planned session');
    await page.click('[data-act=wl-day]');
    a.match(await body(page), /Farmer's Walk.*40 m/);
  },

  async 'EDIT WORKOUT still works after logging in a block, and DROP keeps the block log'(page, a){
    await day(page, 'd1e');
    const id = await page.evaluate(() => exSlug("Farmer's Walk"));
    await page.click(`[data-act=w-blkadd][data-v="${id}"]`);
    await page.evaluate(id => { curCW().sets[id] = [{ w: 30, d: 40 }]; render(); }, id);
    await page.evaluate(() => { openBlock = null; render(); });
    a.ok(await page.$('[data-act=w-new]'), 'the add/edit workout tile should still be offered');
    await page.click('[data-act=w-new]');
    a.match(await body(page), /YOUR WORKOUT/);
    await page.click('[data-act=w-discard]'); await page.click('[data-act=w-discard]');
    a.equal(await page.evaluate(id => (curCW().sets[id] || []).length, id), 1, 'the carry logged in the block survives dropping your own workout');
  },

  async 'an exercise you add to your own workout stays in YOUR WORKOUT even when a planned block also uses it'(page, a){
    await day(page, 'd2e');                                                     // Striking day: its core block uses Plank
    await page.evaluate(() => { const cw = (S.cust[VD()] = newCW('with')); cw.items = ['plank', 'barbell-bench-press']; cwOpen = 'plank'; openBlock = null; render(); });
    a.ok(await page.$('.xlist .xbody'), 'the own-workout card should be listed');
    a.match(await body(page), /YOUR WORKOUT/);
  },

  async 'the timeline line stops at an open block instead of running through its steps and logs'(page, a){
    await day(page, 'd8f');
    await page.click(`[data-act=w-blkadd][data-v="${await page.evaluate(() => exSlug("Farmer's Walk"))}"]`);
    const hit = await page.evaluate(() => { const sb = document.querySelector('.subblocks'), tl = document.querySelector('.tl'), r = sb.getBoundingClientRect();
      sb.scrollIntoView({ block: 'center' }); const r2 = sb.getBoundingClientRect(), x = tl.getBoundingClientRect().left + 57, y = Math.min(innerHeight / 2, r2.bottom - 5);
      const el = document.elementFromPoint(x, y); return !!(el && el.closest('.subblocks')); });
    a.ok(hit, 'the timeline rail is drawn over the open block');
  },
} };
