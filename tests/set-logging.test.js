const { BENCH, LB, workout, logSet, sets, text } = require('./lib');

const editRow = (page, i) => page.evaluate(i => document.querySelectorAll('.xbody .setedit')[i].click(), i);
/* the first strength day's first loggable program lift, opened on Today */
async function programLift(page){
  return page.evaluate(() => { S.meta.start = dkey(-60);
    const def = WEEK.find(d => d.type === 'strength' && d.blocks.some(bk => BLOCKEX[bk.id])); S.swap[VD()] = def.id;
    const bk = def.blocks.find(bk => BLOCKEX[bk.id]); openBlock = 'train'; openBlock2 = bk.id; render(); return BLOCKEX[bk.id][0]; });
}

module.exports = { name: 'Set logging (edit, warm-ups, RPE)', tests: {
  async 'edit a custom set in place: no rest timer, cancel, delete clears edit mode'(page, a){
    await page.evaluate(() => { S.cpref.rest = 90; });
    await workout(page, [BENCH]);
    await logSet(page, BENCH, { w: 135, r: 5 }); await logSet(page, BENCH, { w: 155, r: 5 }); await logSet(page, BENCH, { w: 175, r: 3 });
    await page.evaluate(() => { rest = null; });
    await editRow(page, 1);
    a.match(await text(page, '.xbody .note'), /EDITING SET 2/);
    a.deepEqual(await page.evaluate(id => [document.querySelector(`[data-dr="${id}|w"]`).value, document.querySelector(`[data-dr="${id}|r"]`).value], BENCH), ['155', '5']);
    await page.fill(`[data-dr="${BENCH}|w"]`, '160'); await page.fill(`[data-dr="${BENCH}|r"]`, '4');
    await page.click('[data-act=w-log]');
    const s = await sets(page, BENCH);
    a.equal(s.length, 3); a.equal(Math.round(s[1].w * 2.20462), 160); a.equal(s[1].r, 4);
    a.equal(await page.evaluate(() => rest), null, 'saving an edit started the rest timer');
    await editRow(page, 0); await page.click('[data-act=w-editcancel]');
    a.equal(await page.evaluate(() => editSet), null);
    await editRow(page, 2); await page.click('[data-act=w-del][data-v2="0"]');
    a.equal(await page.evaluate(() => editSet), null);
  },

  async 'editing works for timed, cardio (clearing distance), carry and bodyweight sets'(page, a){
    const carry = await page.evaluate(() => EXDB.find(o => o.k === 'carry').id);
    await workout(page, ['plank', 'run', carry, 'pull-up']);
    const open = id => page.evaluate(id => { cwOpen = id; render(); }, id);
    const fill = (id, o) => Promise.all(Object.entries(o).map(([f, v]) => page.fill(`[data-dr="${id}|${f}"]`, String(v))));
    await open('plank'); await logSet(page, 'plank', { tm: 1, ts: 30 });
    await editRow(page, 0); await fill('plank', { ts: 45 }); await page.click('[data-act=w-log][data-v=plank]');
    a.deepEqual(await sets(page, 'plank'), [{ t: 105 }]);
    await open('run'); await logSet(page, 'run', { tm: 20, ts: 0, d: 2 });
    await editRow(page, 0); await fill('run', { d: '' }); await page.click('[data-act=w-log][data-v=run]');
    a.deepEqual(await sets(page, 'run'), [{ t: 1200 }]);
    await open(carry); await logSet(page, carry, { w: 100, d: 40 });
    await editRow(page, 0); await fill(carry, { d: 60 }); await page.click(`[data-act=w-log][data-v="${carry}"]`);
    a.equal((await sets(page, carry))[0].d, 60);
    await open('pull-up'); await logSet(page, 'pull-up', { r: 8 });
    await editRow(page, 0);
    a.equal(await page.evaluate(() => document.querySelector('[data-dr="pull-up|w"]').value), '', 'a blank added-weight must stay blank in edit mode');
    await fill('pull-up', { r: 10 }); await page.click('[data-act=w-log][data-v=pull-up]');
    a.deepEqual(await sets(page, 'pull-up'), [{ w: 0, r: 10 }]);
  },

  async 'editing and deleting a program-lift set recomputes the PR and keeps typed text'(page, a){
    const ex = await programLift(page);
    const add = async (w, r) => { await page.fill('#sw_' + ex, String(w)); await page.fill('#sr_' + ex, String(r)); await page.click(`[data-act=addset][data-v="${ex}"]`); };
    const pr = () => page.evaluate(ex => S.prs[ex] && Math.round(S.prs[ex].w * 2.20462), ex);
    await add(100, 5); await add(120, 5); await add(110, 5);
    a.equal(await pr(), 120);
    await page.evaluate(() => document.querySelectorAll('.setlog .setedit')[1].click());
    a.equal(await page.evaluate(ex => document.getElementById('sw_' + ex).value, ex), '120');
    await page.fill('#sw_' + ex, '90'); await page.click(`[data-act=addset][data-v="${ex}"]`);
    a.equal(await pr(), 110, 'PR did not fall back after lowering the best set');
    await page.evaluate(() => document.querySelectorAll('.setlog .setedit')[0].click());
    await page.fill('#sw_' + ex, ''); await page.click(`[data-act=addset][data-v="${ex}"]`);
    a.equal(await page.evaluate(ex => S.gym[VD()][ex].length, ex), 3, 'a blank weight must not save');
    a.equal(await page.evaluate(() => !!gymEdit), true);
    await page.click('[data-act=geditcancel]');
    await page.evaluate(() => { const i = S.gym[VD()][Object.keys(S.gym[VD()])[0]].findIndex(s => Math.abs(s.w - 110 / 2.20462) < 0.1); document.querySelectorAll('.setlog [data-act=delset]')[i].click(); });
    a.equal(await pr(), 100);
    await page.fill('#sw_' + ex, '100'); await page.click(`[data-act=w-rpe][data-v="g:${ex}|9"]`);
    a.equal(await page.evaluate(ex => document.getElementById('sw_' + ex).value, ex), '100', 'tapping an RPE chip wiped the typed weight');
  },

  async 'warm-ups stay out of PRs, prefill, counts, volume and "done"'(page, a){
    // yesterday: a light warm-up, then the real set. The warm-up must not become the benchmark.
    await page.evaluate(([id, kg]) => { S.cust[dkey(-1)] = { ...newCW('with'), items: [id], sets: { [id]: [{ w: 20, r: 10, wu: 1 }, { w: kg, r: 5 }] } }; }, [BENCH, LB(135)]);
    await workout(page, [BENCH]);
    a.equal(await page.evaluate(id => document.querySelector(`[data-dr="${id}|w"]`).value, BENCH), '135', 'prefill picked the warm-up');
    a.equal(await text(page, '.benchv'), '135 lb × 5');
    await page.fill(`[data-dr="${BENCH}|w"]`, '225'); await page.click(`[data-act=w-ramp][data-v="${BENCH}"]`);
    const ramp = await page.evaluate(id => S.cust[VD()].sets[id].map(s => Math.round(s.w * 2.20462) + 'x' + s.r), BENCH);
    a.deepEqual(ramp, ['45x8', '115x5', '160x3', '190x1']);
    a.equal(await page.evaluate(() => rest), null);
    a.deepEqual(await page.evaluate(() => cwStats(S.cust[VD()])), { ex: 0, sets: 0, vol: 0 });
    a.equal(await page.evaluate(() => cwDone(S.cust[VD()])), false);
    await page.fill(`[data-dr="${BENCH}|w"]`, '225'); await page.fill(`[data-dr="${BENCH}|r"]`, '5'); await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.deepEqual(await page.evaluate(id => prFlags(id, VD(), S.cust[VD()].sets[id]), BENCH), [false, false, false, false, true]);
    a.equal(await page.evaluate(id => Math.round(bestSet(id).w * 2.20462), BENCH), 225);
    a.equal(await page.evaluate(() => cwStats(S.cust[VD()]).sets), 1);
  },

  async 'warm-up toggle: keeps typed text, resets after logging, survives an edit round trip'(page, a){
    await workout(page, [BENCH]);
    await page.fill(`[data-dr="${BENCH}|w"]`, '95'); await page.fill(`[data-dr="${BENCH}|r"]`, '5');
    await page.click(`[data-act=w-wu][data-v="${BENCH}"]`);
    a.equal(await page.evaluate(() => document.querySelector('[data-act=w-wu]').classList.contains('on')), true);
    a.equal(await page.evaluate(id => document.querySelector(`[data-dr="${id}|w"]`).value, BENCH), '95');
    await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.equal((await sets(page, BENCH))[0].wu, 1);
    a.equal(await page.evaluate(() => document.querySelector('[data-act=w-wu]').classList.contains('on')), false);
    await editRow(page, 0);
    a.equal(await page.evaluate(() => document.querySelector('[data-act=w-wu]').classList.contains('on')), true);
    await page.click(`[data-act=w-wu][data-v="${BENCH}"]`); await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.equal((await sets(page, BENCH))[0].wu, undefined);
  },

  async 'warm-up ramp: sensible steps for light weights, dumbbells, metric'(page, a){
    const ramp = (w, eq) => page.evaluate(([w, eq]) => warmupRamp(w, { eq }, 'x'), [w, eq]);
    a.deepEqual(await ramp(45, 'barbell'), []); a.deepEqual(await ramp(55, 'barbell'), []);
    a.deepEqual(await ramp(95, 'barbell'), [[45, 8], [65, 3], [80, 1]]);
    a.deepEqual(await ramp(315, 'barbell'), [[45, 8], [160, 5], [220, 3], [270, 1]]);
    a.deepEqual(await ramp(60, 'dumbbell'), [[25, 8], [35, 5], [50, 3]]);
    await page.evaluate(() => { S.profile.unit = 'metric'; });
    a.deepEqual(await ramp(100, 'barbell'), [[20, 8], [50, 5], [70, 3], [85, 1]]);
  },

  async 'RPE on custom sets: select, toggle off, log, edit, shown in rows and history'(page, a){
    await workout(page, [BENCH, 'plank']);
    await page.fill(`[data-dr="${BENCH}|w"]`, '135');
    await page.click(`[data-act=w-rpe][data-v="${BENCH}|8.5"]`);
    a.equal(await page.evaluate(() => document.querySelector('.rpe .on').textContent), '8.5');
    a.equal(await page.evaluate(id => document.querySelector(`[data-dr="${id}|w"]`).value, BENCH), '135');
    await page.click(`[data-act=w-rpe][data-v="${BENCH}|8.5"]`);
    a.equal(await page.evaluate(() => !document.querySelector('.rpe .on')), true);
    await page.click(`[data-act=w-rpe][data-v="${BENCH}|9"]`);
    await logSet(page, BENCH, { w: 135, r: 5 }); await logSet(page, BENCH, { w: 135, r: 5 });
    let s = await sets(page, BENCH); a.equal(s[0].rpe, 9); a.equal(s[1].rpe, undefined);
    a.match(await text(page, '.xbody .setedit'), /135 lb × 5 @9/);
    await editRow(page, 1); await page.click(`[data-act=w-rpe][data-v="${BENCH}|9.5"]`); await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    s = await sets(page, BENCH); a.equal(s[1].rpe, 9.5);
    a.equal(await page.evaluate(id => fmtSets('wr', S.cust[VD()].sets[id]), BENCH), '135 lb × 5, 5  ·  top RPE 9.5');
    await page.evaluate(() => { cwOpen = 'plank'; render(); });
    a.equal(await page.evaluate(() => !!document.querySelector('.rpe.c8')), false, 'RPE row appeared on a timed exercise');
  },

  async 'RPE on program lifts: stored, edited, and a plain-text nudge (never a changed prescription) at 9.5+'(page, a){
    const ex = await programLift(page);
    await page.fill('#sw_' + ex, '100'); await page.fill('#sr_' + ex, '5');
    await page.click(`[data-act=w-rpe][data-v="g:${ex}|9.5"]`);
    await page.click(`[data-act=addset][data-v="${ex}"]`);
    a.equal(await page.evaluate(ex => S.gym[VD()][ex][0].rpe, ex), 9.5);
    const line = await page.evaluate(ex => { const E = EXS[ex]; S.gym[dkey(-3)] = { [ex]: Array.from({ length: E.sets }, () => ({ w: 50, r: E.reps, rpe: 9.5 })) }; delete S.gym[VD()]; return exRxLine(ex, false).replace(/<[^>]+>/g, ''); }, ex);
    a.match(line, /NEW WEIGHT: .* · last session hit RPE 9\.5, repeat it if that was a grind/);
    const easy = await page.evaluate(ex => { S.gym[dkey(-3)][ex].forEach(x => x.rpe = 8); return exRxLine(ex, false).replace(/<[^>]+>/g, ''); }, ex);
    a.doesNotMatch(easy, /RPE/);
  },
} };
