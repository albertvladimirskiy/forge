const { BENCH, workout, logSet, sets, text } = require('./lib');

const seed = page => page.evaluate(id => {
  S.cust[VD()] = newCW('with'); S.cust[VD()].items = [id]; S.cust[VD()].name = 'Push, "heavy"';
  S.cust[VD()].sets[id] = [{ w: 20.4, r: 8, wu: 1 }, { w: 61.2, r: 5, rpe: 8.5 }, { w: 61.2, r: 5 }]; cwOpen = id;
  day(VD()).food.push({ n: '=SUM(A1)', kcal: 100, p: 10, c: 5, f: 2, q: 2 }, { n: 'Rice, "white"', kcal: 200, p: 4, c: 44, f: 0, q: 1 });
  S.log.push({ date: T, weight: 82.5, bf: 15, waist: 81, squat: 140 });
  S.fights[VD()] = [{ id: 'a', disc: 'boxing', min: 60, rounds: 6, rpe: 7, worked: 'jab, then right', caught: 'dropped hands' }];
  S.gym[dkey(-2)] = { squat: [{ w: 100, r: 5, rpe: 9 }] }; render(); }, BENCH);
const csv = (page, kind) => page.evaluate(k => csvRows(buildCSV(k)).replace('﻿', '').trim().split('\r\n'), kind);

module.exports = { name: 'Undo, CSV export, snapshots', tests: {
  async 'deleting a set offers UNDO and undo restores everything'(page, a){
    await seed(page);
    await page.evaluate(() => document.querySelector('[data-act=w-del][data-v2="1"]').click());
    a.equal((await sets(page, BENCH)).length, 2);
    a.match(await text(page, '.toast'), /Set deleted\s*UNDO/);
    await page.click('.toastundo');
    const s = await sets(page, BENCH);
    a.equal(s.length, 3); a.equal(s[1].rpe, 8.5);
    a.match(await text(page, '.toast'), /Restored/);
  },

  async 'any other tap or typing makes the undo stale'(page, a){
    await seed(page);
    await page.evaluate(() => document.querySelector('[data-act=w-del][data-v2="0"]').click());
    await page.evaluate(() => document.querySelector('[data-act=w-hist]').click());
    a.equal(await page.evaluate(() => !!document.querySelector('.toastundo')), false);
    await page.evaluate(() => document.querySelector('[data-act=w-del][data-v2="0"]').click());
    await page.fill('.xwname', 'x');
    a.equal(await page.evaluate(() => undoSnap), null);
  },

  async 'tap-twice-to-confirm: the arming tap offers nothing, the confirming tap does'(page, a){
    await seed(page);
    await page.evaluate(() => document.querySelector('[data-act=w-rmex]').click());
    a.equal(await page.evaluate(() => !!document.querySelector('.toastundo')), false);
    await page.evaluate(() => document.querySelector('[data-act=w-rmex]').click());
    a.equal(await page.evaluate(() => S.cust[VD()].items.length), 0);
    await page.click('.toastundo');
    a.equal(await page.evaluate(() => S.cust[VD()].items.length), 1);
    a.equal((await sets(page, BENCH)).length, 3);
  },

  async 'undo covers food removal and dropping a workout'(page, a){
    await seed(page);
    await page.evaluate(() => { S.ui.fold.food = true; render(); });
    await page.evaluate(() => document.querySelector('[data-act=delfood][data-v="1"]').click());
    a.equal(await page.evaluate(() => day(VD()).food.length), 1);
    await page.click('.toastundo');
    a.equal(await page.evaluate(() => day(VD()).food.length), 2);
    await page.evaluate(() => document.querySelector('[data-act=w-discard]').click());
    a.equal(await page.evaluate(() => !!document.querySelector('.toastundo')), false);
    await page.evaluate(() => document.querySelector('[data-act=w-discard]').click());
    a.equal(await page.evaluate(() => !S.cust[VD()]), true);
    await page.click('.toastundo');
    a.equal(await page.evaluate(() => S.cust[VD()].name), 'Push, "heavy"');
  },

  async 'the undo toast expires'(page, a){
    await page.evaluate(() => { undoSnap = '{}'; toast('t', true); });
    await page.waitForTimeout(7300);
    a.equal(await page.evaluate(() => undoSnap), null);
    a.equal(await page.evaluate(() => document.querySelector('.toast').classList.contains('show')), false);
  },

  async 'CSV exports: workouts, body, food, fights (quoting, formula guard, units)'(page, a){
    await seed(page);
    const w = await csv(page, 'workouts');
    a.equal(w[0], 'date,source,workout,exercise,set,warmup,weight_lb,reps,rpe,seconds,distance_mi');
    a.ok(w.some(r => r.includes('"Push, ""heavy"""') && r.includes(',1,yes,45,8,')), 'warm-up row missing');
    a.ok(w.some(r => r.includes(',2,,135,5,8.5,')), 'rpe row missing');
    a.ok(w.some(r => r.includes(',program,,Back squat,1,,220.5,5,9,')), 'program lift row missing');
    const f = await csv(page, 'food');
    a.ok(f.some(r => r.includes(",'=SUM(A1),2,200,20,10,4")), 'formula-looking name must be neutralised and quantities multiplied');
    a.ok(f.some(r => r.includes('"Rice, ""white""",1,200,4,44,0')));
    const b = await csv(page, 'body');
    a.match(b[1], /,182,15,31\.9,,,,308\.75,/);
    const fi = await csv(page, 'fights');
    a.ok(fi[1].includes('Boxing,60,6,7,,"jab, then right",dropped hands'));
    await page.evaluate(() => { S.profile.unit = 'metric'; });
    a.match((await csv(page, 'body'))[0], /weight_kg,body_fat_pct,waist_cm/);
  },

  async 'CSV export downloads a file, and says so when there is nothing to export'(page, a){
    await seed(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportCSV('food'))]);
    a.match(dl.suggestedFilename(), /^forge-food-\d{4}-\d\d-\d\d\.csv$/);
    await page.evaluate(() => { S.log = []; });
    await page.evaluate(() => exportCSV('body'));
    a.match(await text(page, '.toast'), /Nothing to export/);
  },

  async 'two weeks of daily snapshots are kept'(page, a){
    a.equal(await page.evaluate(() => SNAP_KEEP), 14);
  },
} };
