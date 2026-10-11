const { BENCH, workout, logSet, sets, text } = require('./lib');

module.exports = { name: 'Fixes from the first audit pass', tests: {
  async 'rest bar clock does not drift as the fill grows'(page, a){
    await page.evaluate(() => { restStart(120); render(); });
    const x = () => page.evaluate(() => Math.round(document.getElementById('restt').getBoundingClientRect().x));
    const start = await x();
    for (const el of [30, 60, 90, 119]){
      await page.evaluate(e => { rest.end = Date.now() + (120 - e) * 1000; restTick(); }, el);
      await page.waitForTimeout(550);               // the fill animates for .4s
      a.equal(await x(), start, `clock moved at ${el}s elapsed`);
    }
    a.equal(await page.evaluate(() => getComputedStyle(document.getElementById('restfill')).position), 'absolute');
  },

  async 'plate hint spells out the sum'(page, a){
    a.equal(await page.evaluate(() => platesText(115)), '45 lb bar + 35 per side = 115 lb');
    a.equal(await page.evaluate(() => platesText(225)), '45 lb bar + 45 + 45 per side = 225 lb');
    a.equal(await page.evaluate(() => platesText(45)), 'Just the bar (45 lb).');
    a.equal(await page.evaluate(() => platesText(40)), 'Under bar weight (45 lb).');
  },

  async 'food box never steals focus from the exercise search'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; foodOpen = true; foodFocus = true; render(); });
    const active = () => page.evaluate(() => document.activeElement.id || document.activeElement.tagName);
    a.equal(await active(), 'foodq');
    await page.keyboard.type('chick');
    a.equal(await page.evaluate(() => document.querySelectorAll('.fres').length) > 0, true);
    await page.evaluate(() => { S.cust[VD()] = newCW('with'); exPickOpen = true; exFocus = true; render(); });
    a.equal(await active(), 'exq');
    await page.keyboard.type('incline');
    a.equal(await page.evaluate(() => document.getElementById('exq').value), 'incline');
    await page.evaluate(() => { exMu = 'chest'; exFocus = false; render(); });          // a later render
    a.notEqual(await active(), 'foodq', 'food box grabbed focus on a later render');
  },

  async 'an unrelated tap after using food search does not pull the keyboard back up'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; foodOpen = true; foodFocus = true; render(); });
    a.equal(await page.evaluate(() => document.activeElement.id), 'foodq');
    await page.evaluate(() => document.activeElement.blur());
    await page.evaluate(() => { document.querySelector('[data-act=fold]').click(); });   // any render at all
    a.notEqual(await page.evaluate(() => document.activeElement.id), 'foodq', 'focus flag is sticky: the keyboard came back');
  },

  async 'food search can be closed from the picker'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; foodOpen = true; render(); });
    a.match(await text(page, '[data-act=foodopen]'), /CLOSE FOOD SEARCH/);
    await page.click('.foodpick [data-act=foodopen]');
    a.equal(await page.evaluate(() => !!document.querySelector('.foodpick')), false);
  },

  async 'exercise sheet keeps list and chip-row scroll across re-renders'(page, a){
    await page.evaluate(() => { S.cust[VD()] = newCW('with'); exPickOpen = true; render(); document.querySelector('.sheetbody').scrollTop = 900; });
    await page.evaluate(() => document.querySelectorAll('.sheetbody [data-act=w-fav]')[25].click());
    a.equal(await page.evaluate(() => document.querySelector('.sheetbody').scrollTop), 900, 'starring jumped the list');
    await page.evaluate(() => { document.querySelector('.exchips').scrollLeft = 400; [...document.querySelector('.exchips').querySelectorAll('[data-act=w-mu]')].find(x => x.textContent === 'Quads').click(); });
    a.equal(await page.evaluate(() => document.querySelector('.exchips').scrollLeft), 400, 'chip row reset');
    a.equal(await page.evaluate(() => document.querySelector('.sheetbody').scrollTop), 0, 'changing the filter should return the list to the top');
  },

  async 'half-typed custom food survives other taps, clears once added'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; foodOpen = true; render(); });
    await page.fill('#cf_n', 'Protein bar'); await page.fill('#cf_k', '210');
    await page.evaluate(() => document.querySelector('[data-act=gunit][data-v=oz]').click());
    a.deepEqual(await page.evaluate(() => [cf_n.value, cf_k.value]), ['Protein bar', '210']);
    await page.click('[data-act=addcustomfood]');
    a.deepEqual(await page.evaluate(() => [cf_n.value, cf_k.value]), ['', '']);
  },

  async 'half-typed body-log value survives a re-render; shows the saved value after saving'(page, a){
    await page.evaluate(() => { view = 'build'; buildSub = 'log'; render(); });
    await page.fill('#f_weight', '181.5');
    await page.evaluate(() => render());
    a.equal(await page.evaluate(() => f_weight.value), '181.5');
    await page.click('[data-act=savelog]');
    a.equal(await page.evaluate(() => f_weight.value), '181.5');
    a.equal(await page.evaluate(() => S.log.length), 1);
  },

  async 'importing a backup takes an undo snapshot first'(page, a){
    await page.evaluate(() => { S.log.push({ date: T, weight: 80 }); commit(); });
    const undos = () => page.evaluate(async () => (await snapKeys()).filter(k => k.startsWith('undo-')).length);
    const before = await undos();
    await page.evaluate(() => { const clean = JSON.parse(JSON.stringify(DEFAULTS)); clean.profile.height = 170; view = 'codex'; importOpen = true; render();
      importtxt.value = JSON.stringify(clean); document.querySelector('[data-act=importgo]').click(); });
    await page.waitForTimeout(400);
    a.equal(await undos(), before + 1);
    a.equal(await page.evaluate(() => S.log.length), 0);
    await page.evaluate(async () => { await snapRestore((await snapKeys()).find(k => k.startsWith('undo-'))); });
    a.equal(await page.evaluate(() => S.log.length), 1, 'undo did not bring the data back');
  },

  async 'a PR set while viewing another day is dated to that day'(page, a){
    await page.evaluate(() => { viewOff = -2; checkPR('squat', 100, 5, VD()); });
    a.equal(await page.evaluate(() => S.prs.squat.date === VD() && VD() !== T), true);
  },

  async 'a failed save warns instead of failing silently'(page, a){
    await page.evaluate(() => { Storage.prototype.setItem = function(){ throw new Error('quota'); }; commit(); });
    await page.waitForTimeout(200);
    a.match(await text(page, '.toast'), /Couldn't save/);
  },
} };
