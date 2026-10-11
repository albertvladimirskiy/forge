const { text } = require('./lib');

const water = page => page.evaluate(() => day(VD()).water || 0);
const row = page => page.evaluate(() => document.querySelector('[data-act=water]').closest('.fb').textContent.replace(/\s+/g, ' ').trim());
const open = page => page.evaluate(() => { S.ui.fold.food = true; render(); });

module.exports = { name: 'Water tracking', tests: {
  async 'US units: add 8 / 16 oz, minus, shown in oz against the Fuel target'(page, a){
    await page.evaluate(() => { S.log = [{ date: T, weight: 80 }]; });         // 80 kg -> 3.2 L target = 108 oz
    await open(page);
    a.match(await row(page), /WATER ?0 oz \/ 108 oz/);
    await page.click('[data-act=water][data-v="237"]');
    a.match(await row(page), /8 oz \/ 108 oz/);
    await page.evaluate(() => document.querySelectorAll('[data-act=water]')[2].click());     // + 16 oz
    a.match(await row(page), /24 oz/);
    await page.evaluate(() => document.querySelectorAll('[data-act=water]')[0].click());     // - 8 oz
    a.match(await row(page), /16 oz/);
    a.equal(await water(page), 473, 'stored in millilitres');
  },

  async 'metric adds 250 / 500 ml and shows litres'(page, a){
    await page.evaluate(() => { S.profile.unit = 'metric'; S.log = [{ date: T, weight: 80 }]; });
    await open(page);
    await page.click('[data-act=water][data-v="250"]'); await page.click('[data-act=water][data-v="500"]'); await page.click('[data-act=water][data-v="500"]');
    a.match(await row(page), /WATER ?1\.3 L \/ 3\.2 L/);
    a.equal(await water(page), 1250);
  },

  async 'minus never goes below zero, and the button is disabled at zero'(page, a){
    await open(page);
    a.equal(await page.evaluate(() => document.querySelector('[data-act=water][aria-label^=Remove]').disabled), true);
    await page.evaluate(() => { day(VD()).water = 100; render(); });
    await page.evaluate(() => document.querySelector('[data-act=water][aria-label^=Remove]').click());
    a.equal(await water(page), 0);
  },

  async 'logging works without a weigh-in (no target or bar shown); the bar turns green and caps at the target'(page, a){
    await open(page);
    await page.click('[data-act=water][data-v="237"]');
    a.equal(await water(page), 237);
    a.equal(await page.evaluate(() => !!document.getElementById('waterfill')), false);
    a.doesNotMatch(await row(page), /\//);
    await page.evaluate(() => { S.log = [{ date: T, weight: 50 }]; day(VD()).water = 4000; render(); });                      // 2 L target
    a.equal(await page.evaluate(() => document.getElementById('waterfill').style.width), '100%');
    a.match(await page.evaluate(() => document.getElementById('waterfill').getAttribute('style')), /moss/);
  },

  async 'each day keeps its own total; older saved days without a water value load'(page, a){
    await open(page);
    await page.click('[data-act=water][data-v="237"]');
    await page.evaluate(() => { viewOff = -1; render(); });
    a.equal(await water(page), 0);
    await page.evaluate(() => { delete S.days[VD()]; render(); });
    a.match(await row(page), /WATER ?0 oz/);
  },
} };
