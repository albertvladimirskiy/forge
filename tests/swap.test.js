const { LB } = require('./lib');

const open = (page, block, off = 0) => page.evaluate(([block, off]) => { S.meta.start = dkey(-60); viewOff = off;
  S.swap[VD()] = Object.values(ALLDAYS).find(d => d.blocks.some(b => b.id === block)).id;
  view = 'today'; openBlock = 'train'; openBlock2 = block; render(); }, [block, off]);
const INCLINE = 'incline-barbell-bench-press';
const pick = async (page, key, id) => { await page.click(`[data-act=g-swap][data-v="${key}"]`); await page.click(`[data-act=g-swapset][data-v="${key}"][data-v2="${id}"]`); };
const logSets = async (page, ex, lb, n, reps = 5) => { for (let i = 0; i < n; i++){ await page.fill('#sw_' + ex, String(lb)); await page.fill('#sr_' + ex, String(reps)); await page.click(`[data-act=addset][data-v="${ex}"]`); } };
const rx = (page, ex) => page.evaluate(ex => { const r = prescribe(ex); return r && { mode: r.mode, lb: Math.round(r.w * 2.20462) }; }, ex);

module.exports = { name: 'Swapping a program exercise (incline bench for bench)', tests: {
  async 'a planned lift can be swapped for another exercise from the library, with the same set log and tools'(page, a){
    await open(page, 'd3b');
    a.ok(await page.$('[data-act=g-swap][data-v=bench]'), 'the lift card offers SWAP EXERCISE');
    await page.click('[data-act=g-swap][data-v=bench]');
    a.ok(await page.$(`[data-act=g-swapset][data-v=bench][data-v2="${INCLINE}"]`), 'chest exercises are suggested first');
    await page.fill('#swq', 'incline barbell');
    a.match(await page.evaluate(() => document.getElementById('swres').textContent), /Incline Barbell Bench Press/);
    await page.click(`[data-act=g-swapset][data-v=bench][data-v2="${INCLINE}"]`);
    a.equal(await page.evaluate(() => S.exsw.bench), INCLINE);
    a.ok(await page.$(`#sw_${INCLINE}`) && await page.$(`[data-act=addset][data-v="${INCLINE}"]`), 'the swapped lift has the same weight/reps boxes');
    a.ok(!(await page.$('#sw_bench')), 'the original box is gone');
    const t = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
    a.match(t, /Incline Barbell Bench Press: First time in this plan/);
    a.match(t, /Swapped in for Bench press/);
    for (const label of ['WARM-UP RAMP', 'HISTORY', 'REST:', 'BAR:']) a.ok(t.includes(label), 'tool missing: ' + label);
    a.deepEqual(await page.evaluate(() => [EXS['incline-barbell-bench-press'].sets, EXS['incline-barbell-bench-press'].reps, EXS['incline-barbell-bench-press'].from]), [4, 5, 'bench']);
  },

  async 'the swapped lift progresses on its own history, and the original keeps its own'(page, a){
    await page.evaluate(() => { const four = lb => Array.from({ length: 4 }, () => ({ w: lb / 2.20462, r: 5 })); S.gym[dkey(-7)] = { bench: four(150) }; });
    await open(page, 'd3b');
    a.deepEqual(await rx(page, 'bench'), { mode: 'progress', lb: 155 });
    await pick(page, 'bench', INCLINE);
    await logSets(page, INCLINE, 100, 4);
    a.deepEqual(await page.evaluate(() => Object.keys(S.gym[VD()])), [INCLINE], 'sets are logged under the swapped lift');
    a.ok(!(await page.evaluate(() => S.gym[VD()].bench)), 'nothing logged against the original');
    await open(page, 'd3b', 1);
    a.deepEqual(await rx(page, INCLINE), { mode: 'progress', lb: 105 }, 'a clean 4x5 at 100 lb -> 105 next');
    // put the original back: its plan is untouched by the swap
    await page.click(`[data-act=g-swapreset][data-v=bench]`);
    a.deepEqual(await page.evaluate(() => S.exsw), {});
    a.deepEqual(await rx(page, 'bench'), { mode: 'progress', lb: 155 });
    a.ok(await page.$('#sw_bench'));
  },

  async 'a swap carries into history, records, the "start from plan" list, and survives a reload'(page, a){
    await open(page, 'd3b');
    await pick(page, 'bench', INCLINE);
    await logSets(page, INCLINE, 95, 2, 6);
    a.equal(await page.evaluate(() => exHist('incline-barbell-bench-press').length), 1, 'the library history includes the planned-day sets');
    a.deepEqual(await page.evaluate(() => planItemIds(buildDay(VD()).def).includes('incline-barbell-bench-press')), true);
    await page.evaluate(() => { view = 'wlog'; wlSub = 'lifts'; render(); });
    a.match(await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' ')), /Incline Barbell Bench Press/);
    await page.evaluate(() => { flushSave(); });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('forge.v1')));
    a.equal(saved.exsw.bench, INCLINE); a.equal(saved.exreg[INCLINE], 'bench');
    await page.reload(); await page.waitForFunction(() => typeof render === 'function' && document.getElementById('app').innerHTML.length > 0);
    a.ok(await page.evaluate(() => !!EXS['incline-barbell-bench-press'] && effEx('bench') === 'incline-barbell-bench-press'), 'the swap is re-registered on load');
  },

  async 'swapping to the original exercise resets, bodyweight lifts swap to weighted ones, and bad data is ignored'(page, a){
    await open(page, 'd3b');
    await pick(page, 'bench', INCLINE);
    await pick(page, 'bench', 'barbell-bench-press');                       // choosing the original is a reset
    a.deepEqual(await page.evaluate(() => S.exsw), {});
    // pull-up (added weight) -> a machine row keeps working
    await open(page, 'd3c');
    await page.click('[data-act=g-swap][data-v=pullup]');
    await page.fill('#swq', 'lat pulldown');
    const id = await page.evaluate(() => document.querySelector('#swres [data-act=g-swapset]').dataset.v2);
    await page.click(`#swres [data-act=g-swapset][data-v2="${id}"]`);
    a.ok(await page.$(`#sw_${id}`));
    a.equal(await page.evaluate(id => EXS[id].added, id), false, 'a pulldown is weight x reps, not added weight');
    // corrupt saved swaps are dropped instead of breaking the day
    await page.evaluate(() => { S.exsw = { bench: 'no-such-exercise-xyz', nonsense: 'x' }; normalizeCustom(); });
    a.deepEqual(await page.evaluate(() => Object.keys(S.exsw).filter(k => k === 'nonsense' || S.exsw[k] === 'no-such-exercise-xyz')), []);
  },
} };
