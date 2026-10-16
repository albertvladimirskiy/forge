const { LB, openApp } = require('./lib');

/* open the planned-lift block that logs `ex` (squat -> d1b ...) on the viewed day, with no ramp-week scaling in the way */
async function lift(page, block, off = 0){
  await page.evaluate(([block, off]) => { S.meta.start = dkey(-60); viewOff = off;
    S.swap[VD()] = Object.values(ALLDAYS).find(d => d.blocks.some(b => b.id === block)).id;
    view = 'today'; openBlock = 'train'; openBlock2 = block; render(); }, [block, off]);
}
const seed = (page, ex, sessions) => page.evaluate(([ex, sessions]) => { sessions.forEach(([off, list]) => { (S.gym[dkey(off)] = S.gym[dkey(off)] || {})[ex] = list; }); render(); }, [ex, sessions]);
const logSets = async (page, ex, lb, n, reps = 5) => { for (let i = 0; i < n; i++){ await page.fill('#sw_' + ex, String(lb)); await page.fill('#sr_' + ex, String(reps)); await page.click(`[data-act=addset][data-v="${ex}"]`); } };
const rxText = (page, ex) => page.evaluate(ex => exRxLine(ex, false).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), ex);
const rx = (page, ex) => page.evaluate(ex => { const r = prescribe(ex); return r && { mode: r.mode, lb: Math.round(r.w * 2.20462), back: !!r.back }; }, ex);
const four = lb => Array.from({ length: 4 }, () => ({ w: LB(lb), r: 5 }));

module.exports = { name: 'Program lifts: dropped weight, deload, ramp', tests: {
  async 'a lighter day is repeated, then the plan goes back to what it asked for (not climb from the lighter weight)'(page, a){
    await lift(page, 'd1b');
    await seed(page, 'squat', [[-7, four(150)]]);
    a.deepEqual(await rx(page, 'squat'), { mode: 'progress', lb: 155, back: false });
    await logSets(page, 'squat', 135, 1);
    a.equal(await page.evaluate(() => S.gym[VD()].squat[0].p && Math.round(S.gym[VD()].squat[0].p * 2.20462)), 155, 'the plan was not recorded on the set');
    a.deepEqual(await rx(page, 'squat'), { mode: 'repeat', lb: 135, back: false }, 'mid-day it should say repeat the 135 being lifted');
    await logSets(page, 'squat', 135, 3);
    a.deepEqual(await rx(page, 'squat'), { mode: 'repeat', lb: 155, back: true }, 'finished the lighter day: back to 155');
    a.match(await rxText(page, 'squat'), /BACK TO 155 lb — you dropped last time/);
    // the next day starts there, and a clean 155 moves on to 160
    await lift(page, 'd1b', 1);
    a.deepEqual(await rx(page, 'squat'), { mode: 'repeat', lb: 155, back: true });
    await logSets(page, 'squat', 155, 4);
    a.deepEqual(await rx(page, 'squat'), { mode: 'progress', lb: 160, back: false });
  },

  async 'dropping twice in a row is accepted as the new baseline; failing the lighter weight is not excused'(page, a){
    await lift(page, 'd1b');
    await seed(page, 'squat', [[-14, four(150)]]);
    await logSets(page, 'squat', 135, 4);                    // plan said 155
    await lift(page, 'd1b', 1);
    await logSets(page, 'squat', 135, 4);                    // plan said 155 again
    await lift(page, 'd1b', 2);
    a.deepEqual(await rx(page, 'squat'), { mode: 'progress', lb: 140, back: false }, 'two lighter days in a row should stop being treated as a bad day');
    // a lighter day that was not completed just repeats that weight
    await page.evaluate(() => { for (const k of Object.keys(S.gym)) if (k > dkey(-10)) delete S.gym[k]; });
    await lift(page, 'd1b', 3);
    await logSets(page, 'squat', 135, 3);
    a.deepEqual(await rx(page, 'squat'), { mode: 'repeat', lb: 135, back: false }, 'three of four sets at the lighter weight is a miss at that weight');
  },

  async 'a deload week does not become the baseline the next weeks climb from'(page, a){
    await lift(page, 'd1b');
    await seed(page, 'squat', [[-14, four(150)]]);
    await page.evaluate(() => { S.deload.until = dkey(2); render(); });
    const dl = await rx(page, 'squat'); a.equal(dl.mode, 'deload');
    await logSets(page, 'squat', Math.round(dl.lb / 5) * 5, 3);
    a.equal(await page.evaluate(() => S.gym[VD()].squat.every(s => s.dl === 1)), true);
    await page.evaluate(() => { S.deload.until = null; render(); });
    a.deepEqual(await rx(page, 'squat'), { mode: 'progress', lb: 155, back: false }, 'after the deload the lift should resume from the last real session');
  },

  async 'the ramp-week discount applies to a guessed starting weight only, not on top of weights already lifted'(page, a){
    await page.evaluate(() => { S.meta.start = T; S.log = [{ date: T, weight: 80, squat: 100 }]; render(); });
    const first = await page.evaluate(() => prescribe('squat'));
    a.equal(first.mode, 'first'); a.ok(Math.abs(first.w - 100 * 0.8 * 0.7) < 0.01, 'start at 70% of the guess in ramp week 1');
    await page.evaluate(() => { S.gym[dkey(-1)] = { squat: Array.from({ length: 4 }, () => ({ w: 56, r: 5 })) }; });
    const next = await page.evaluate(() => prescribe('squat'));
    a.equal(next.mode, 'progress'); a.ok(Math.abs(next.w - (56 + 2.27)) < 0.01, `was ${next.w}, should climb from what was lifted`);
  },

  async 'a program lift has the rest timer: default, per-lift OFF, bell setting, warm-ups skip it'(page, a){
    await lift(page, 'd1b');
    await page.evaluate(() => { S.cpref.rest = 90; render(); });
    a.ok(await page.evaluate(() => !!document.querySelector('[data-act=w-rest]')), 'default-rest control missing on a program lift');
    a.ok(await page.evaluate(() => !!document.querySelector('[data-act=w-restsound]')), 'bell control missing on a program lift');
    await logSets(page, 'squat', 135, 1);
    a.equal(await page.evaluate(() => rest && rest.total), 90);
    a.ok(await page.evaluate(() => !!document.getElementById('restbar')), 'the rest bar is not on screen');
    await page.evaluate(() => { rest = null; });
    await page.click('[data-act=w-exrest]');
    a.match(await page.evaluate(() => document.querySelector('[data-act=w-exrest]').textContent), /REST: OFF/);
    await logSets(page, 'squat', 135, 1);
    a.equal(await page.evaluate(() => rest), null, 'rest started although this lift is OFF');
    await page.click('[data-act=w-exrest]');
    await page.click('[data-act=w-wu][data-v="g:squat"]');
    await logSets(page, 'squat', 95, 1, 5);
    a.equal(await page.evaluate(() => rest), null, 'a warm-up set started the rest timer');
    // a custom workout's squat shares the same per-lift setting
    a.equal(await page.evaluate(() => restFor('barbell-back-squat')), await page.evaluate(() => restFor(libOf('squat'))));
  },

  async 'a superset block rests after its last exercise only'(page, a){
    await lift(page, 'd3f');
    await page.evaluate(() => { S.cpref.rest = 60; render(); });
    await logSets(page, 'curl', 60, 1, 10);
    a.equal(await page.evaluate(() => rest), null, 'rested between the two halves of a superset');
    await logSets(page, 'triceps', 30, 1, 12);
    a.equal(await page.evaluate(() => rest && rest.total), 60);
  },

  async 'warm-up sets: tagged, kept out of PRs, sessions and the plan; ramp fills them in'(page, a){
    await lift(page, 'd1b');
    await seed(page, 'squat', [[-7, four(150)]]);
    await page.evaluate(() => { S.prs.squat = { w: LB0(150), r: 5, e1rm: 1, date: dkey(-7) }; function LB0(l){ return l / 2.20462; } });
    await page.click('[data-act=w-wu][data-v="g:squat"]');
    a.equal(await page.evaluate(() => document.querySelector('[data-act=w-wu]').getAttribute('aria-pressed')), 'true');
    await logSets(page, 'squat', 95, 1, 3);
    const first = await page.evaluate(() => S.gym[VD()].squat[0]);
    a.equal(first.wu, 1); a.equal(first.p, undefined, 'a warm-up is not part of the plan');
    a.equal(await page.evaluate(() => document.querySelector('.setlog .setn').textContent), 'W');
    a.equal(await page.evaluate(() => /-2/.test(document.querySelector('.setlog .setrow').textContent)), false, 'a warm-up showed a missed-reps mark');
    a.equal(await page.evaluate(() => S.prs.squat.date), await page.evaluate(() => dkey(-7)), 'warm-up changed the record');
    a.equal(await page.evaluate(() => gymSessions('squat').includes(VD())), false, 'a day with only warm-ups counted as a session');
    a.deepEqual(await rx(page, 'squat'), { mode: 'progress', lb: 155, back: false });
    await page.fill('#sw_squat', '155');
    await page.click('[data-act=g-ramp][data-v=squat]');
    const n = await page.evaluate(() => S.gym[VD()].squat.length); a.ok(n >= 4, 'ramp added no sets');
    a.equal(await page.evaluate(() => S.gym[VD()].squat.every(s => s.wu === 1 && s.w < 155 / 2.20462)), true);
    // editing a warm-up keeps it a warm-up
    await page.click('[data-act=gedit][data-v=squat][data-v2="0"]');
    a.equal(await page.evaluate(() => document.querySelector('[data-act=w-wu]').getAttribute('aria-pressed')), 'true');
    await page.fill('#sw_squat', '100'); await page.fill('#sr_squat', '4'); await page.click('[data-act=addset][data-v=squat]');
    a.deepEqual(await page.evaluate(() => { const s = S.gym[VD()].squat[0]; return [s.wu, Math.round(s.w * 2.20462), s.r]; }), [1, 100, 4]);
  },

  async 'same tools as a custom exercise: steppers, plate math, bar, history, ramp; only barbell lifts get plates'(page, a){
    await lift(page, 'd1b');
    await seed(page, 'squat', [[-7, four(150)]]);
    a.match(await page.evaluate(() => document.getElementById('gplate_squat').textContent), /bar \+ .* per side = 155 lb/, 'plate math for the prescribed weight');
    await page.fill('#sw_squat', '185');
    a.match(await page.evaluate(() => document.getElementById('gplate_squat').textContent), /= 185 lb/);
    await page.click('[data-act=g-step][data-v="squat|w"][data-v2="1"]');
    a.equal(await page.evaluate(() => document.getElementById('sw_squat').value), '190');
    await page.click('[data-act=g-step][data-v="squat|r"][data-v2="-1"]');
    a.equal(await page.evaluate(() => document.getElementById('sr_squat').value), '4');
    a.ok(await page.evaluate(() => /BAR: 45 lb/.test(document.querySelector('[data-act=w-exbar]').textContent)));
    await page.click('[data-act=g-hist][data-v=squat]');
    a.ok(await page.evaluate(() => !!document.querySelector('.histbox')), 'history did not open');
    await lift(page, 'd3c');                                   // weighted pull-up: no bar, no plates
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-exbar]') || !!document.getElementById('gplate_pullup')), false);
    a.ok(await page.evaluate(() => !!document.querySelector('[data-act=g-ramp]')));
  },

  async 'custom timed holds and cardio rest only when that exercise has its own rest'(page, a){
    await page.evaluate(() => { S.cpref.rest = 90; S.cust[VD()] = newCW('with'); S.cust[VD()].items = ['plank', 'run']; cwOpen = 'plank'; render(); });
    await page.fill('[data-dr="plank|tm"]', '1'); await page.click('[data-act=w-log][data-v=plank]');
    a.equal(await page.evaluate(() => rest), null, 'default rest should not apply to a hold');
    await page.click('[data-act=w-exrest][data-v=plank]');      // DEFAULT -> OFF
    await page.click('[data-act=w-exrest][data-v=plank]');      // -> 0:45
    await page.fill('[data-dr="plank|tm"]', '1'); await page.click('[data-act=w-log][data-v=plank]');
    a.equal(await page.evaluate(() => rest && rest.total), 45);
  },

  async 'the program lift card fits a 320px phone, with a warm-up and an editing banner showing'(page, a){
    const pg = await openApp(page.ctx.browser(), { width: 320 });
    try {
      await lift(pg, 'd1b');
      await seed(pg, 'squat', [[-7, four(150)]]);
      await pg.evaluate(() => { S.gym[VD()] = { squat: [{ w: 43, r: 3, wu: 1 }, { w: 70, r: 5, rpe: 8, p: 70 }] }; gymEdit = { ex: 'squat', i: 1, vd: VD() }; gHist = 'squat'; render(); });
      const wide = await pg.evaluate(() => { const W = innerWidth, bad = [];
        document.querySelectorAll('#app *').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width) return;
          if (r.right > W + 1){ for (let p = el.parentElement; p; p = p.parentElement){ const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return; } bad.push((el.className || el.tagName) + ' ' + Math.round(r.right)); } });
        return [document.documentElement.scrollWidth, ...bad.slice(0, 4)]; });
      a.deepEqual(wide, [320]);
    } finally { await pg.ctx.close(); }
  },
} };
