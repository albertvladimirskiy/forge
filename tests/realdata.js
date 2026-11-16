#!/usr/bin/env node
/* Run a REAL backup through the app and prove nothing is lost.   Usage:  node realdata.js [path/to/forge-backup.json]
   Default path: tests/real/backup.json (the folder is git-ignored, so personal data is never committed).

   Get the file: on the phone, gear icon -> Data + backup -> BACK UP NOW -> save it, then put it at tests/real/backup.json.

   What it checks, on a copy (the phone is never touched):
     1. the file boots as saved data: counts before (raw file) and after (migrated, as the app holds it) must match
     2. every screen draws with no error, NaN or undefined, on today and on past days
     3. the exact original is kept as a pre-migration snapshot whenever the data format changed
     4. back up -> wipe -> restore gives identical data
     5. merging the file into itself changes nothing */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { launch, openApp } = require('./lib');
const file = process.argv[2] || path.join(__dirname, 'real', 'backup.json');
if (!fs.existsSync(file)){ console.error(`No backup at ${file}\nExport one from the app (gear -> Data + backup -> BACK UP NOW) and save it there.`); process.exit(2); }
const txt = fs.readFileSync(file, 'utf8'), raw = JSON.parse(txt);
const SCREENS = [['today', ''], ['plan', ''], ['week', ''], ['build', 'target'], ['build', 'fuel'], ['build', 'log'], ['build', 'ch90'], ['mind', ''], ['ledger', ''],
  ['wlog', 'workouts'], ['wlog', 'body'], ['wlog', 'lifts'], ['wlog', 'fights']];
const ready = pg => pg.waitForFunction(() => typeof S !== 'undefined' && document.getElementById('app') && document.getElementById('app').innerHTML.length > 0);

(async () => {
  const browser = await launch(), pg = await openApp(browser, { state: raw });
  const step = (n, ok) => console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  try {
    assert.equal(await pg.evaluate(() => !!document.getElementById('rc_snap')), false, 'the app showed its recovery screen for this file');
    const before = await pg.evaluate(t => backupCounts(JSON.parse(t)), txt), after = await pg.evaluate(() => backupCounts(S));
    console.log(`\n${'what'.padEnd(12)}${'file'.padStart(10)}${'app'.padStart(10)}`);
    for (const k of Object.keys(before)) console.log(`${k.padEnd(12)}${String(before[k]).padStart(10)}${String(after[k]).padStart(10)}${before[k] === after[k] ? '' : '   <-- DIFFERENT'}`);
    console.log(`schema       ${String(raw.schemaVersion || 0).padStart(9)}${String(await pg.evaluate(() => S.schemaVersion)).padStart(10)}\n`);
    assert.deepEqual(after, before, 'counts changed between the file and the loaded app'); step('1. nothing lost on load / migration (counts match)', true);

    for (const [v, sub] of SCREENS){
      const t = await pg.evaluate(([v, sub]) => { if (v === 'wlog') wlSub = sub; if (v === 'build') buildSub = sub; view = v; render(); return document.getElementById('app').textContent; }, [v, sub]);
      assert.doesNotMatch(t, /NaN|undefined|\[object/, `${v}/${sub} shows a broken value`);
    }
    const offs = await pg.evaluate(() => { const ks = [...new Set([...Object.keys(S.gym), ...Object.keys(S.cust), ...Object.keys(S.days)])].sort().slice(-400); return ks.map(k => daysBetween(T, k)); });
    for (const off of offs){
      const t = await pg.evaluate(off => { view = 'today'; viewOff = off; openBlock = 'train'; render(); return document.getElementById('app').textContent; }, off);
      assert.doesNotMatch(t, /NaN|undefined|\[object/, `Today at day offset ${off} shows a broken value`);
    }
    assert.deepEqual(pg.errors, [], 'the app threw'); step(`2. every screen and ${offs.length} logged days draw cleanly`, true);

    await pg.waitForFunction(() => snapList !== null);
    const pre = await pg.evaluate(async () => { for (const k of await snapKeys()) if (k.startsWith('pre-')) return snapGet(k); return null; });
    if ((raw.schemaVersion || 0) < await pg.evaluate(() => SCHEMA)){ assert.equal(pre, JSON.stringify(raw), 'no exact pre-migration copy was kept'); step('3. exact original kept before the format update', true); }
    else step('3. (file is already on the current format: no migration ran)', true);

    await pg.evaluate(() => { viewOff = 0; view = 'today'; render(); });
    const backup = await pg.evaluate(() => JSON.stringify(S));
    await pg.evaluate(() => localStorage.removeItem('forge.v1')); await pg.reload(); await ready(pg);
    assert.equal(await pg.evaluate(() => backupCounts(S).sets + backupCounts(S).foods + S.log.length), 0, 'wipe failed');
    const restore = act => pg.evaluate(([json, act]) => { S.meta.onboarded = true; view = 'plan'; importOpen = true; importErr = ''; render(); document.getElementById('importtxt').value = json;
      if (act === 'importgo') document.querySelector('[data-act=importgo]').click(); document.querySelector(`[data-act=${act}]`).click(); return importErr; }, [backup, act]);
    assert.equal(await restore('importgo'), '');
    assert.deepEqual(await pg.evaluate(() => JSON.parse(JSON.stringify(S))), JSON.parse(backup)); step('4. back up -> wipe -> restore: identical', true);

    assert.equal(await restore('importmerge'), '');
    assert.deepEqual(await pg.evaluate(() => JSON.parse(JSON.stringify(S))), JSON.parse(backup)); step('5. merging the file into itself changes nothing', true);
    assert.deepEqual(pg.errors, []);
    console.log('\nAll checks passed.');
  } catch (e){ step(e.message.split('\n')[0], false); process.exitCode = 1; }
  finally { await browser.close(); }
})();
