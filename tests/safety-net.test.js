/* The rules these protect: saved data is never overwritten by something the app has not managed to draw, two open copies cannot
   erase each other's work, a restore can be previewed and merged, and dates behave across midnight and daylight-saving changes. */
const { openApp, serve, baseUrl, oldState } = require('./lib');

const stored = pg => pg.evaluate(() => localStorage.getItem('forge.v1'));
const ready = pg => pg.waitForFunction(() => typeof S !== 'undefined' && document.getElementById('app') && document.getElementById('app').innerHTML.length > 0);
/* open the app on a raw stored string, without the helpers that assume it boots */
async function rawBoot(browser, json){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(v => { if (!localStorage.getItem('__seeded')){ localStorage.setItem('forge.v1', v); localStorage.setItem('__seeded', '1'); } }, json);
  const pg = await ctx.newPage(); await pg.goto(await baseUrl()); await ready(pg); await pg.waitForTimeout(150);
  return pg;
}
const snaps = pg => pg.evaluate(async () => { const out = {}; for (const k of await snapKeys()) out[k] = await snapGet(k); return out; });
const importText = (pg, json, act) => pg.evaluate(([json, act]) => { view = 'plan'; importOpen = true; importErr = ''; render();
  const ta = document.getElementById('importtxt'); ta.value = json; ta.dispatchEvent(new Event('input', { bubbles: true }));
  if (act) document.querySelector(`[data-act=${act}]`).click(); }, [json, act]);

module.exports = { name: 'Safety net: schema version, boot order, two copies, restore preview + merge, dates', tests: {
  async 'a save that parses but cannot be drawn is left exactly as it was'(page, a){
    for (const bad of ['{"profile":null,"days":null}', '5', '[1,2]', '"hi"', '{"profile":{"unit":"imperial"},"days":{},"log":[],"schemaVersion":99}']){
      const pg = await rawBoot(page.ctx.browser(), bad);
      try {
        a.equal(await pg.evaluate(() => !!document.getElementById('rc_snap')), true, `no recovery screen for ${bad}`);
        a.equal(await stored(pg), bad, `the stored data was rewritten for ${bad}`);
      } finally { await pg.context().close(); }
    }
  },

  async 'data from a newer build is refused with a reload button, not rewritten'(page, a){
    const pg = await rawBoot(page.ctx.browser(), JSON.stringify({ profile: { unit: 'metric', height: 180 }, days: {}, log: [{ date: '2026-01-05', weight: 80 }], schemaVersion: 7 }));
    try {
      a.match(await pg.evaluate(() => document.getElementById('app').textContent), /saved by a newer FORGE/);
      a.equal(await pg.evaluate(() => !!document.getElementById('rc_reload')), true);
      a.equal(JSON.parse(await stored(pg)).schemaVersion, 7);
    } finally { await pg.context().close(); }
  },

  async 'old data gets a schema version, the exact original is snapshotted first, and nothing is lost'(page, a){
    const raw = oldState(), json = JSON.stringify(raw), old = await openApp(page.ctx.browser(), { state: raw });
    try {
      a.equal(await old.evaluate(() => S.schemaVersion), await old.evaluate(() => SCHEMA));
      await old.waitForFunction(() => snapList !== null);
      const sn = await snaps(old), pre = Object.keys(sn).filter(k => k.startsWith('pre-v0-'));
      a.equal(pre.length, 1, 'no pre-migration snapshot: ' + Object.keys(sn));
      a.equal(sn[pre[0]], json, 'the pre-migration snapshot is not the exact original');
      a.equal(sn[await old.evaluate(() => T)], json, "today's snapshot is not the data as it was loaded");
      a.deepEqual(await old.evaluate(() => backupCounts(S)), await old.evaluate(json => backupCounts(JSON.parse(json)), json), 'counts changed in the migration');
      a.equal(JSON.parse(await stored(old)).schemaVersion, 1, 'the migrated data was not saved');
      await old.reload(); await ready(old); await old.waitForFunction(() => snapList !== null);
      a.equal(Object.keys(await snaps(old)).filter(k => k.startsWith('pre-')).length, 1, 'a second boot must not snapshot again');
    } finally { a.deepEqual(old.errors, []); await old.ctx.close(); }
  },

  async 'a fresh install starts at the current schema version'(page, a){
    a.equal(await page.evaluate(() => S.schemaVersion === SCHEMA && JSON.parse(localStorage.getItem('forge.v1')).schemaVersion === SCHEMA), true);
  },

  async 'two open copies: the older one reloads instead of erasing what the newer one saved'(page, a){
    const b = await page.ctx.newPage(); await b.goto(await baseUrl()); await ready(b);
    await page.evaluate(() => { S.log.push({ date: T, weight: 80 }); commit(); });
    await b.waitForFunction(() => S.log.length === 1, null, { timeout: 5000 }).catch(() => { throw new Error('the second copy never picked up the first copy\'s save'); });
    await b.evaluate(() => { day(T).water = 500; commit(); });
    await page.waitForFunction(() => typeof day === 'function' && day(T).water === 500, null, { timeout: 5000 });
    a.equal(await page.evaluate(() => S.log.length), 1, 'the weigh-in was erased');
    await b.close();
  },

  async 'a copy that was in the background while another saved reloads when it comes back'(page, a){
    await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('forge.v1')); o.log.push({ date: T, weight: 77 }); localStorage.setItem('forge.v1', JSON.stringify(o)); });   // same tab: no storage event
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => typeof S !== 'undefined' && S.log.length === 1, null, { timeout: 5000 });
    a.equal(await page.evaluate(() => S.log[0].weight), 77);
  },

  async 'restore shows a preview of the file against this phone before anything changes'(page, a){
    await page.evaluate(() => { S.log.push({ date: T, weight: 80 }); day(T).food.push({ n: 'Rice', kcal: 200, p: 4, c: 44, f: 0, q: 1 }); commit(); });
    const file = await page.evaluate(() => { const o = JSON.parse(JSON.stringify(S)); o.log.push({ date: dkey(-1), weight: 81 }, { date: dkey(-2), weight: 82 }); o.gym[dkey(-1)] = { squat: [{ w: 100, r: 5 }, { w: 100, r: 5 }] }; return JSON.stringify(o); });
    await importText(page, file);
    const t = await page.evaluate(() => document.getElementById('importprev').textContent.replace(/\s+/g, ' '));
    a.match(t, /Weigh-ins \+ measurements31/); a.match(t, /Sets logged20/); a.match(t, /Program lift days10/);
    a.equal(await page.evaluate(() => S.log.length), 1, 'previewing changed the data');
    await importText(page, '{"not":"a backup"}');
    a.match(await page.evaluate(() => document.getElementById('importprev').textContent), /not a FORGE backup/);
  },

  async 'replace needs a second tap; merge keeps this phone and adds only what is missing'(page, a){
    await page.evaluate(() => { S.log.push({ date: T, weight: 80 }); day(T).food.push({ n: 'Phone rice', kcal: 200, p: 4, c: 44, f: 0, q: 1 }); S.myfoods.push({ n: 'Shake', kcal: 300, p: 40, c: 20, f: 5 });
      S.gym[dkey(-3)] = { bench: [{ w: 60, r: 5 }] }; commit(); });
    const file = await page.evaluate(() => JSON.stringify({ profile: { unit: 'metric', height: 190, program: 'fighter' }, log: [{ date: T, weight: 99 }, { date: dkey(-5), weight: 78 }],
      days: { [T]: { food: [{ n: 'File oats', kcal: 150, p: 5, c: 27, f: 3, q: 1 }] }, [dkey(-5)]: { food: [{ n: 'File eggs', kcal: 140, p: 12, c: 1, f: 10, q: 2 }], habits: { h3: true } } },
      gym: { [dkey(-3)]: { bench: [{ w: 999, r: 1 }] }, [dkey(-5)]: { squat: [{ w: 100, r: 5 }] } }, swap: { [dkey(-5)]: 2 },
      myfoods: [{ n: 'shake', kcal: 1, p: 1, c: 1, f: 1 }, { n: 'Bar', kcal: 200, p: 20, c: 20, f: 6 }] }));
    await importText(page, file, 'importgo');
    a.equal(await page.evaluate(() => S.profile.unit), 'imperial', 'one tap replaced everything');
    a.match(await page.evaluate(() => document.querySelector('[data-act=importgo]').textContent), /TAP AGAIN/);
    a.equal(await page.evaluate(() => document.getElementById('importtxt').value.length > 50), true, 'the pasted backup was wiped by the first tap');
    await page.evaluate(() => document.querySelector('[data-act=importmerge]').click());
    const r = await page.evaluate(() => ({ unit: S.profile.unit, program: S.profile.program, today: S.log.find(e => e.date === T).weight, old: (S.log.find(e => e.date === dkey(-5)) || {}).weight,
      food: day(T).food.map(f => f.n), oldFood: foodOf(dkey(-5)).map(f => f.n), habit: S.days[dkey(-5)].habits.h3, bench: S.gym[dkey(-3)].bench[0].w, squat: S.gym[dkey(-5)].squat[0].w,
      swap: S.swap[dkey(-5)], myfoods: S.myfoods.map(f => f.n + ':' + f.kcal), v: S.schemaVersion, toast: document.querySelector('.toast').textContent }));
    a.deepEqual([r.unit, r.program, r.today, r.old], ['imperial', 'standard', 80, 78], 'settings or a measurement this phone had were overwritten');
    a.deepEqual([r.food, r.oldFood, r.habit], [['Phone rice'], ['File eggs'], true]);
    a.deepEqual([r.bench, r.squat], [60, 100]);
    a.equal(typeof r.swap, 'string', 'an old backup was merged without being migrated (numeric swap)');
    a.deepEqual(r.myfoods, ['Shake:300', 'Bar:200']);
    a.match(r.toast, /Merged: \d+ days and entries added/);
    await page.waitForFunction(async () => (await snapKeys()).some(k => k.startsWith('undo-')));
  },

  async 'back up, wipe, restore: the data comes back identical'(page, a){
    const raw = oldState(), old = await openApp(page.ctx.browser(), { state: raw });
    try {
      const backup = await old.evaluate(() => JSON.stringify(S));                       // exactly what BACK UP NOW writes to the file
      await old.evaluate(() => { localStorage.removeItem('forge.v1'); });      // __seeded stays, so the test harness does not put the fixture back
      await old.reload(); await ready(old);
      a.equal(await old.evaluate(() => S.log.length + Object.keys(S.gym).length), 0, 'the wipe did not wipe');
      await old.evaluate(() => { S.meta.onboarded = true; });
      await importText(old, backup, 'importgo'); await old.evaluate(() => document.querySelector('[data-act=importgo]').click());
      a.deepEqual(await old.evaluate(() => JSON.parse(JSON.stringify(S))), JSON.parse(backup));
      await old.reload(); await ready(old);
      a.deepEqual(await old.evaluate(() => JSON.parse(JSON.stringify(S))), JSON.parse(backup), 'not identical after a reload');
    } finally { a.deepEqual(old.errors, []); await old.ctx.close(); }
  },

  async 'looking at totals does not create empty day records'(page, a){
    const n = await page.evaluate(() => { const b = Object.keys(S.days).length; for (let i = 1; i < 30; i++) foodTotals(dkey(-i)); view = 'ledger'; render(); return [b, Object.keys(S.days).length]; });
    a.equal(n[1], n[0]);
  },

  async 'dates and the streak are right across both daylight-saving changes'(page, a){
    for (const [zone, noon] of [['America/New_York', '2026-03-10T16:00:00Z'], ['America/New_York', '2026-11-03T17:00:00Z'], ['Australia/Lord_Howe', '2026-10-05T02:00:00Z']]){
      const pg = await openApp(page.ctx.browser(), { timezoneId: zone });
      try {
        await pg.clock.setFixedTime(new Date(noon)); await pg.reload(); await ready(pg);
        const r = await pg.evaluate(() => { const keys = Array.from({ length: 9 }, (_, i) => dkey(-i));
          keys.slice(0, 6).forEach(k => { day(k).blocks.x = true; });
          return { keys, back: keys.map((k, i) => addDays(T, -i)), gaps: keys.slice(1).map((k, i) => daysBetween(k, keys[i])), dows: keys.map(dowIdx), streak: streak(), monday: dowIdx(mondayOf(0)), T }; });
        a.equal(new Set(r.keys).size, 9, `${zone}: a date repeated or was skipped: ${r.keys}`);
        a.deepEqual(r.back, r.keys, `${zone}: addDays and dkey disagree`);
        a.deepEqual(r.gaps, Array(8).fill(1), `${zone}: days are not one day apart`);
        a.deepEqual(r.dows.map((d, i) => (d + i) % 7), Array(9).fill(r.dows[0]), `${zone}: weekdays do not run consecutively`);
        a.equal(r.streak, 6, `${zone}: streak across the clock change`); a.equal(r.monday, 0);
      } finally { await pg.ctx.close(); }
    }
  },

  async 'a set typed hours ago does not stop Today from rolling over to the new date'(page, a){
    await page.clock.setFixedTime(new Date(2026, 4, 12, 23, 59, 0)); await page.reload(); await ready(page);
    const t0 = await page.evaluate(() => { cdraft[VD() + '|barbell-bench-press'] = { w: '135', rpe: '8' }; return T; });
    a.equal(t0, '2026-05-12');
    await page.mouse.click(5, 5);                                         // someone using the app at 23:59...
    await page.clock.setFixedTime(new Date(2026, 4, 13, 0, 0, 30));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(300);
    a.equal(await page.evaluate(() => T), t0, 'reloaded under someone who touched the app 90 seconds ago');
    a.equal(await page.evaluate(() => Object.keys(cdraft).length), 1);     // ...keeps what they were typing
    await page.clock.setFixedTime(new Date(2026, 4, 13, 7, 0, 0));         // the next morning the stale draft must not block the new day
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => typeof T !== 'undefined' && T === '2026-05-13', null, { timeout: 5000 })
      .catch(() => { throw new Error('Today stayed on yesterday: the old draft blocked the reload'); });
  },
} };
