#!/usr/bin/env node
/* Runs every tests/*.test.js. Usage:  node run.js [name-filter]
   Each test file exports { name, tests: { 'what it checks': async (page, assert) => {...} } }.
   Every test gets a fresh page; a page error (uncaught exception in the app) fails the test. */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { launch, openApp } = require('./lib');

(async () => {
  const filter = (process.argv[2] || '').toLowerCase();
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
  const browser = await launch();
  let pass = 0, fail = 0; const failures = [];
  for (const f of files) {
    const mod = require(path.join(__dirname, f));
    console.log(`\n${mod.name}`);
    for (const [name, fn] of Object.entries(mod.tests)) {
      if (filter && !(f + ' ' + mod.name + ' ' + name).toLowerCase().includes(filter)) continue;
      const page = await openApp(browser);
      try {
        await fn(page, assert);
        assert.deepEqual(page.errors, [], 'the app threw an uncaught error');
        console.log(`  ok   ${name}`); pass++;
      } catch (e) {
        console.log(`  FAIL ${name}\n         ${String(e.message).split('\n').join('\n         ')}`); fail++; failures.push(`${mod.name}: ${name}`);
      }
      await page.ctx.close();
    }
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFailed:\n  ' + failures.join('\n  ')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(2); });
