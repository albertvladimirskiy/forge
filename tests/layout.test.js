const { oldState, openApp, app } = require('./lib');

const SCREENS = [['today', '', 0], ['today', '', -3], ['plan', '', 0], ['build', 'target', 0], ['build', 'fuel', 0], ['build', 'log', 0], ['build', 'ch90', 0],
  ['mind', '', 0], ['ledger', '', 0], ['plan', 'arc', 0], ['wlog', 'workouts', 0], ['wlog', 'body', 0], ['wlog', 'lifts', 0], ['wlog', 'fights', 0]];

/* anything poking past the right edge that isn't inside a container that scrolls on purpose */
const overflow = page => page.evaluate(() => {
  const W = window.innerWidth, bad = [];
  if (document.documentElement.scrollWidth > W + 1) bad.push('page is ' + document.documentElement.scrollWidth + 'px wide');
  document.querySelectorAll('#app *').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (r.right > W + 1 || r.left < -1){
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement){ const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return; }
      bad.push(`${(el.className || el.tagName).toString().slice(0, 40)} ends at ${Math.round(r.right)}`);
    }
  });
  return [...new Set(bad)].slice(0, 5);
});
const go = (page, [v, sub, off]) => page.evaluate(([v, sub, off]) => { if (v === 'wlog') wlSub = sub; if (v === 'build') buildSub = sub; viewOff = off; view = v; render(); }, [v, sub, off]);

async function richDay(page){
  const raw = oldState(), day = Object.keys(raw.cust).sort().pop(), id = 'barbell-bench-press', row = 'barbell-row';
  await page.evaluate(([day, id, row]) => { viewOff = -Math.round((new Date(T) - new Date(day)) / 86400000); view = 'today';
    S.cust[day].items = [id, row, 'plank', 'run']; S.cust[day].sup = { [id]: true }; S.cust[day].sets[id].push({ w: 20, r: 8, wu: 1 }, { w: 70, r: 5, rpe: 9.5 });
    S.cpref.notes[id] = 'A fairly long cue that should truncate nicely on the collapsed card instead of pushing the layout wider than the phone';
    S.log.push({ date: T, weight: 80 }); S.ui.fold.food = true; cwOpen = id; render(); }, [day, id, row]);
}

module.exports = { name: 'Layout on small phones and unit switching', tests: {
  async 'nothing sticks out past the edge on any screen at 320px'(page, a){
    const pg = await openApp(page.ctx.browser(), { state: oldState(), width: 320 });
    try {
      for (const s of SCREENS) { await go(pg, s); a.deepEqual(await overflow(pg), [], `${s.join('/')} overflows at 320px`); }
    } finally { await pg.ctx.close(); }
  },

  async 'the new controls fit at 320px: open card, superset tag, notes, RPE row, toast with UNDO, pickers'(page, a){
    const pg = await openApp(page.ctx.browser(), { state: oldState(), width: 320 });
    try {
      await richDay(pg);
      const states = { 'open card': () => {}, 'collapsed card with a long note': () => { cwOpen = 'plank'; render(); }, 'editing a set': () => { cwOpen = 'barbell-bench-press'; document.querySelectorAll('.xbody .setedit')[0].click(); },
        'food picker': () => { foodOpen = true; render(); }, 'undo toast': () => { undoSnap = '{}'; toast('Set deleted', true); }, 'exercise sheet': () => { exPickOpen = true; render(); } };
      for (const [name, fn] of Object.entries(states)){
        await pg.evaluate(fn);
        a.deepEqual(await overflow(pg), [], `${name} overflows at 320px`);
        await pg.evaluate(() => { exPickOpen = false; foodOpen = false; undoSnap = null; toastUndo = false; render(); });
      }
    } finally { await pg.ctx.close(); }
  },

  async 'metric units: every screen renders cleanly with real data, and the unit setting round-trips'(page, a){
    const pg = await openApp(page.ctx.browser(), { state: oldState() });
    try {
      await richDay(pg);
      await pg.evaluate(() => { S.profile.unit = 'metric'; commit(); });
      for (const s of SCREENS){ await go(pg, s); a.doesNotMatch(await app(pg), /NaN|undefined|\[object/, `${s.join('/')} in metric`); }
      await pg.evaluate(() => { viewOff = 0; view = 'today'; render(); });
      a.match(await pg.evaluate(() => document.querySelector('[data-act=water]').closest('.fb').textContent), /WATER ?0 ml|WATER ?0 L|\d+ ml|L/);
      // switching through the real select, both ways, with a workout on screen
      await pg.evaluate(() => { view = 'plan'; render(); });
      await pg.selectOption('[data-in="profile.unit"]', 'imperial');
      a.equal(await pg.evaluate(() => S.profile.unit), 'imperial');
      await pg.selectOption('[data-in="profile.unit"]', 'metric');
      a.equal(await pg.evaluate(() => S.profile.unit), 'metric');
      a.deepEqual(pg.errors, []);
    } finally { await pg.ctx.close(); }
  },
} };
