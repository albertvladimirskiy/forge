/* Bugs found by a deliberate break-it pass: wrong displayed progression weights, an uncapped 1RM formula, typos accepted as permanent
   records, and an import that could leave the app unable to draw itself. */
const fs = require('fs'), path = require('path');
const { LB, openApp, oldState, workout, logSet, sets, baseUrl, BENCH } = require('./lib');

const lift = async (page, block) => page.evaluate(block => { S.meta.start = dkey(-60);
  S.swap[VD()] = Object.values(ALLDAYS).find(d => d.blocks.some(b => b.id === block)).id; view = 'today'; openBlock = 'train'; openBlock2 = block; render(); }, block);
const done = (page, ex, lb, off = -3) => page.evaluate(([ex, lb, off]) => { const E = EXS[ex], w = lb / 2.20462;
  (S.gym[dkey(off)] = S.gym[dkey(off)] || {})[ex] = Array.from({ length: E.sets }, () => ({ w, r: E.reps, p: w })); render(); }, [ex, lb, off]);
const shown = (page, ex) => page.evaluate(ex => exRxLine(ex, false).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), ex);
const text = page => page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
const toast = page => page.evaluate(() => (document.querySelector('.toast') || {}).textContent || '');

module.exports = { name: 'Break-it fixes: progression display, 1RM cap, typo limits, import safety', tests: {

  async 'the plan shows exactly last weight + one step (a 10 lb deadlift jump from 225 is 235, not 240)'(page, a){
    await lift(page, 'd5b');                                      // Friday: trap bar deadlift, 3 x 5, 10 lb step
    for (const [from, to] of [[135, 145], [225, 235], [315, 325], [405, 415]]){
      await done(page, 'dead', from);
      a.match(await shown(page, 'dead'), new RegExp(`NEW WEIGHT: ${to} lb`), `${from} -> ${to}`);
    }
    await lift(page, 'd1b');                                      // squat: 5 lb step
    await done(page, 'squat', 225);
    a.match(await shown(page, 'squat'), /NEW WEIGHT: 230 lb/);
  },

  async 'every progressing lift at every common load shows the engine value (280 combinations)'(page, a){
    const bad = await page.evaluate(() => { const out = []; S.meta.start = dkey(-60); S.profile.unit = 'imperial';
      for (const ex of Object.keys(EXS)) for (const lb of [45, 65, 95, 115, 135, 155, 185, 205, 225, 245, 275, 315, 365, 405]){
        const E = EXS[ex], w = (E.added ? lb / 2 : lb) / 2.20462; S.gym = { [dkey(-3)]: { [ex]: Array.from({ length: E.sets }, () => ({ w, r: E.reps, p: w })) } };
        const rx = prescribe(ex); if (!rx || rx.mode !== 'progress') continue;
        const want = Math.round(rx.w * 2.20462 * 2) / 2, got = parseFloat(dispLoad(rx.w, ex, rxExact(rx)));
        if (Math.abs(want - got) > 0.01) out.push(`${E.n} ${lb}: engine ${want}, shows ${got}`); }
      return out.slice(0, 5); });
    a.deepEqual(bad, []);
  },

  async 'metric users get loadable kilogram steps (2.5 / 5 / 1.25), never 99.88 or 145.28'(page, a){
    await page.evaluate(() => { S.profile.unit = 'metric'; });
    await lift(page, 'd1b'); await done(page, 'squat', 100 * 2.20462);
    a.match(await shown(page, 'squat'), /NEW WEIGHT: 102\.5 kg/, 'squat: +2.5');
    await lift(page, 'd5b'); await done(page, 'dead', 140 * 2.20462);
    a.match(await shown(page, 'dead'), /NEW WEIGHT: 145 kg/, 'deadlift: +5');
    a.deepEqual(await page.evaluate(() => [incFor('squat'), incFor('dead'), incFor('lateral'), loadStepKg('dead'), loadStepKg('lateral')]), [2.5, 5, 1.25, 2.5, 1.25]);
    await page.evaluate(() => { S.gym = {}; });
    a.equal(await page.evaluate(() => dispLoad(100, 'squat')), '100 kg', 'a guessed weight snaps to 2.5 kg');
    a.equal(await page.evaluate(() => dispLoad(112, 'squat')), '112.5 kg');
  },

  async 'a guessed starting weight is still rounded to something loadable'(page, a){
    await page.evaluate(() => { S.profile.unit = 'imperial'; S.meta.start = dkey(-60); S.log = [{ date: T, weight: 80, dead: 212 / 2.20462 }]; S.gym = {}; });
    a.equal(await page.evaluate(() => dispLoad(prescribe('dead').w, 'dead', rxExact(prescribe('dead')))), '170 lb', '80% of a 212 lb Log entry = 169.6, shown as 170');
  },

  async 'the 1RM estimate stops climbing at 10 reps, so a high-rep set cannot outrank a heavy one'(page, a){
    const r = await page.evaluate(() => { const lb = x => Math.round(x * 2.20462);
      S.cust = {}; S.gym = {}; const id = 'barbell-bench-press';
      S.cust[dkey(-10)] = Object.assign(newCW('with'), { items: [id], sets: { [id]: [{ w: 225 / 2.20462, r: 5 }] } });
      S.cust[dkey(-3)] = Object.assign(newCW('with'), { items: [id], sets: { [id]: [{ w: 135 / 2.20462, r: 30 }] } });
      const b = bestSet(id), s135 = x => ({ w: 135 / 2.20462, r: x });
      return { best: `${lb(b.w)}x${b.r}`, pr: prFlags(id, dkey(-3), S.cust[dkey(-3)].sets[id]), e: [lb(e1rm(225 / 2.20462, 5)), lb(e1rm(100 / 2.20462, 30)), lb(e1rm(100 / 2.20462, 10)), e1rm(80, 1), e1rm(80, 0)],
        morePays: exScore('wr', s135(15)) > exScore('wr', s135(12)) && exScore('wr', s135(12)) > exScore('wr', s135(10)) }; });
    a.equal(r.best, '225x5'); a.deepEqual(r.pr, [false], '135 x 30 is not a PR');
    a.deepEqual(r.e, [263, 133, 133, 80, 80], '225x5 = 263 as before; 30 reps counts as 10; 1 rep is the weight');
    a.equal(r.morePays, true, 'more reps at the same weight still ranks higher');
  },

  async 'the Plan screen refuses an impossible age or height, keeps the last good one, and says so'(page, a){
    await page.evaluate(() => { S.log = [{ date: T, weight: 80 }]; S.profile.unit = 'metric'; S.profile.height = 178; S.profile.age = 25; view = 'plan'; render(); });
    const state = () => page.evaluate(() => [S.profile.age, S.profile.height]);
    for (const v of ['0', '-5', '250', '11', '91']){ await page.fill('[data-in="profile.age"]', v); a.equal((await state())[0], 25, `age ${v} refused`); }
    await page.fill('[data-in="profile.age"]', '28'); a.equal((await state())[0], 28);
    for (const v of ['0', '7', '700', '119', '231']){ await page.fill('[data-in="profile.heightD"]', v); a.equal((await state())[1], 178, `height ${v} refused`); }
    await page.fill('[data-in="profile.heightD"]', '180'); a.equal((await state())[1], 180);
    await page.fill('[data-in="profile.heightD"]', '700'); await page.dispatchEvent('[data-in="profile.heightD"]', 'change');
    a.match(await toast(page), /Height looks off/); a.equal(await page.$eval('[data-in="profile.heightD"]', e => e.value), '180', 'the box goes back to the kept value');
    // a value that is already saved but impossible cannot wreck the targets
    await page.evaluate(() => { S.profile.age = 250; S.profile.height = 7; });
    const k = await page.evaluate(() => nutrition(T).kcal); a.ok(k > 1500 && k < 4500, `kcal ${k}`);
  },

  async 'the Log tab refuses impossible values but still saves the sensible ones from the same form'(page, a){
    await page.evaluate(() => { S.profile.unit = 'metric'; S.log = []; view = 'build'; buildSub = 'log'; render(); });
    const save = async v => { await page.evaluate(() => { S.log = []; render(); });
      await page.evaluate(v => { for (const [id, x] of Object.entries(v)) document.getElementById('f_' + id).value = x; }, v);
      await page.click('[data-act=savelog]'); await page.waitForTimeout(40); return page.evaluate(() => S.log[0] || null); };
    const r = await save({ weight: '80', squat: '-100', bench: '0', dead: '99999', waist: '-5', rhr: '5000', sleep: '99', bf: '15' });
    a.deepEqual([r.weight, r.bf, r.squat, r.bench, r.dead, r.waist, r.rhr, r.sleep], [80, 15, undefined, undefined, undefined, undefined, undefined, undefined]);
    a.match(await toast(page), /out of range/);
    const ok = await save({ weight: '80', squat: '180', bench: '120', dead: '220', waist: '84', shoulder: '120', rhr: '55', sleep: '7.5', pullup: '0' });
    a.deepEqual([ok.squat, ok.bench, ok.dead, ok.waist, ok.shoulder, ok.rhr, ok.sleep, ok.pullup], [180, 120, 220, 84, 120, 55, 7.5, 0], 'sensible values, and 0 added weight on a pull-up, are kept');
  },

  async 'a mistyped set, amount or custom food is refused instead of becoming a permanent record'(page, a){
    // custom workout sets
    await workout(page, [BENCH]);
    const tryset = async f => { await page.evaluate(() => { S.cust[VD()].sets = {}; cdraft = {}; render(); }); await logSet(page, BENCH, f); return (await sets(page, BENCH)).length; };
    a.equal(await tryset({ w: '185', r: '5' }), 1);
    for (const f of [{ w: '-185', r: '5' }, { w: '185', r: '100000' }, { w: '999999', r: '5' }, { w: '185', r: '0' }]) a.equal(await tryset(f), 0, JSON.stringify(f));
    // program lift
    await lift(page, 'd1b');
    await page.fill('#sw_squat', '99999'); await page.fill('#sr_squat', '5'); await page.click('[data-act=addset][data-v="squat"]');
    a.equal(await page.evaluate(() => ((S.gym[VD()] || {}).squat || []).length), 0, 'a 99,999 lb squat is refused');
    // food amount and custom food
    await page.evaluate(() => { S.ui.fold.food = true; foodOpen = true; day(VD()).food = []; render(); });
    const add = async (g, u) => page.evaluate(([g, u]) => { day(VD()).food = []; const f = FOODS.find(x => x[5] === 100 && x[1] > 50); foodQ = f[0].split(',').slice(0, 2).join(' '); foodGU = u; foodG = g; render();
      document.querySelector(`[data-act=addfood][data-v="${FOODS.indexOf(f)}"]`).click(); return day(VD()).food.map(x => x.kcal); }, [g, u]);
    a.equal((await add('150', 'g')).length, 1); a.equal((await add('-50', 'g')).length, 0, '-50 g would log negative calories');
    a.equal((await add('99999', 'g')).length, 0); a.equal((await add('5000', 'g')).length, 1, '5 kg is the limit, and allowed');
    const cf = async v => page.evaluate(v => { day(VD()).food = []; S.myfoods = []; render(); for (const [k, x] of Object.entries(v)) document.getElementById('cf_' + k).value = x; document.querySelector('[data-act=addcustomfood]').click(); return day(VD()).food.length + S.myfoods.length; }, v);
    a.equal(await cf({ n: 'Ok', k: '200', p: '10', c: '20', f: '5' }), 2);
    for (const v of [{ n: 'Neg', k: '-500' }, { n: 'Huge', k: '99999999' }, { n: 'NegP', k: '100', p: '-10' }, { n: 'HugeC', k: '100', c: '5000' }]) a.equal(await cf(v), 0, JSON.stringify(v));
  },

  async 'a damaged backup is cleaned or refused, never left to break the screens; a good one still imports'(page, a){
    const browser = page.ctx.browser(); const results = {};
    const payloads = {
      protoKey: '{"profile":{"height":170,"unit":"metric"},"__proto__":{"polluted":"yes"},"days":{"__proto__":{"x":1}},"log":[{"date":"2026-01-01","weight":80}]}',
      badTypes: '{"profile":{"height":170},"days":{},"log":[{"date":"2026-01-01","weight":"heavy"},{"date":5,"weight":80},null,"x",{"date":"2026-01-02","weight":81}],"cust":{"2026-01-01":{"items":"nope","sets":5}},"fights":{"2026-01-01":[{"min":"x"},null]},"extra":{"2026-01-01":"str"},"fixed":{"mon":"oops"},"nw":[null],"notif":null,"exsw":{"squat":5}}',
    };
    for (const [k, json] of Object.entries(payloads)){
      const pg = await openApp(browser, { state: oldState() });
      results[k] = await pg.evaluate(async json => { view = 'plan'; importOpen = true; render(); document.getElementById('importtxt').value = json; document.querySelector('[data-act=importgo]').click(); await new Promise(r => setTimeout(r, 400));
        let ok = true; try { for (const v of ['today', 'plan', 'build', 'wlog', 'mind', 'ledger']) { view = v; render(); } } catch (e) { ok = e.message; }
        return { ok, log: S.log.map(e => e.date + ':' + e.weight), protoPolluted: ({}).polluted !== undefined || Object.getPrototypeOf(S) !== Object.prototype, importErr }; }, json);
      a.deepEqual(pg.errors, [], k); await pg.ctx.close();
    }
    a.equal(results.protoKey.ok, true); a.equal(results.protoKey.protoPolluted, false); a.deepEqual(results.protoKey.log, ['2026-01-01:80']);
    a.equal(results.badTypes.ok, true, 'every screen draws'); a.deepEqual(results.badTypes.log, ['2026-01-01:undefined', '2026-01-02:81'], 'only the readable entries survive; the unreadable weight is dropped');
  },

  async 'if a file would break a screen, the import is refused and the current data is untouched'(page, a){
    await page.evaluate(() => { S.log = [{ date: T, weight: 80 }]; commit(); });
    const good = JSON.stringify(oldState());
    const r = await page.evaluate(async json => { const real = ViewMind; ViewMind = function(){ throw new Error('boom: a screen cannot draw'); };
      view = 'plan'; importOpen = true; render(); document.getElementById('importtxt').value = json; document.querySelector('[data-act=importgo]').click(); await new Promise(r => setTimeout(r, 400));
      ViewMind = real; return { logLen: S.log.length, err: importErr, open: importOpen, view }; }, good);
    a.equal(r.logLen, 1, 'the 20-entry backup was not adopted'); a.match(r.err, /would break the app \(boom: a screen cannot draw\)\. Nothing was changed/); a.equal(r.open, true);
    a.equal(await page.evaluate(() => S.log.length), 1);
    a.equal(await page.evaluate(() => { view = 'today'; try { render(); return true; } catch (e) { return false; } }), true, 'and the app still draws');
    await page.evaluate(json => { view = 'plan'; importOpen = true; render(); document.getElementById('importtxt').value = json; document.querySelector('[data-act=importgo]').click(); }, good);
    await page.waitForTimeout(400);
    a.equal(await page.evaluate(() => S.log.length), 20, 'the same file imports fine once nothing is broken');
  },

  async 'when the app cannot draw its saved data at launch, a recovery screen replaces the blank page and can restore a snapshot'(page, a){
    const browser = page.ctx.browser(), good = oldState();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('(async function boot(){',
      'const __today = ViewToday; ViewToday = function(...x){ if (localStorage.getItem("__break")) throw new Error("seeded failure"); return __today.apply(this, x); };\n(async function boot(){');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await ctx.addInitScript(json => { if (!localStorage.getItem('__seeded')){ localStorage.setItem('forge.v1', json); localStorage.setItem('__seeded', '1'); localStorage.setItem('__break', '1'); } }, JSON.stringify(good));
    await ctx.route(u => u.pathname === '/' || u.pathname.endsWith('/index.html'), r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    const pg = await ctx.newPage(); const errors = []; pg.on('pageerror', e => errors.push(e.message));
    try {
      await pg.goto(await baseUrl()); await pg.waitForSelector('#rc_snap', { timeout: 8000 });
      const t = await pg.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
      a.match(t, /COULDN'T DRAW YOUR SAVED DATA/); a.match(t, /Nothing has been deleted/); a.match(t, /seeded failure/);
      a.ok(await pg.evaluate(() => !!document.getElementById('rc_dl') && !!document.getElementById('rc_reset')), 'download and start-fresh are offered');
      a.equal(await pg.evaluate(() => (JSON.parse(localStorage.getItem('forge.v1')).log || []).length), 20, 'the saved data is untouched');
      // with no snapshot yet, it says so instead of pretending
      await pg.click('#rc_snap'); await pg.waitForFunction(() => /No automatic snapshot/.test(document.getElementById('rc_msg').textContent), null, { timeout: 5000 });
      // with one, it restores the newest that draws, and the app starts again
      await pg.evaluate(json => snapPut('2026-10-01', json), JSON.stringify(good));
      await pg.evaluate(() => localStorage.removeItem('__break'));
      await Promise.all([pg.waitForNavigation({ timeout: 8000 }), pg.click('#rc_snap')]);
      await pg.waitForFunction(() => typeof S !== 'undefined' && document.querySelector('nav, .nav, #app .view'), null, { timeout: 8000 });
      a.equal(await pg.evaluate(() => S.log.length), 20); a.equal(await pg.evaluate(() => !document.getElementById('rc_snap')), true, 'back in the app');
    } finally { await ctx.close(); }
  },
} };
