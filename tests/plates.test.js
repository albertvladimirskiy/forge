const { BENCH, SQUAT, workout, text } = require('./lib');
const plates = (page, w, id) => page.evaluate(([w, id]) => platesText(w, id), [w, id]);

module.exports = { name: 'Barbell + plates', tests: {
  async 'defaults match the standard 45 lb bar and the old plate line'(page, a){
    a.equal(await plates(page, 115, BENCH), '45 lb bar + 35 per side = 115 lb');
    a.equal(await plates(page, 100, BENCH), '45 lb bar + 25 + 2.5 per side = 100 lb');
    a.equal(await plates(page, 102.5, BENCH), '45 lb bar + 25 + 2.5 per side = 100 lb (1.25 per side short of 102.5)');
  },

  async 'bar and plate settings change the answer; at least one plate must stay; reset restores'(page, a){
    await page.evaluate(() => { view = 'plan'; render(); });
    a.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-act=gearbar]')].map(b => b.textContent + (b.classList.contains('on') ? '*' : ''))), ['45 lb*', '35 lb', '25 lb', '15 lb']);
    await page.click('[data-act=gearbar][data-v="35"]');
    a.equal(await plates(page, 115, BENCH), '35 lb bar + 35 + 5 per side = 115 lb');
    await page.click('[data-act=gearreset]');
    await page.click('[data-act=gearplate][data-v="35"]');                 // gym has no 35s
    a.equal(await plates(page, 115, BENCH), '45 lb bar + 25 + 10 per side = 115 lb');
    await page.evaluate(() => { S.cpref.plates = { imperial: [45] }; view = 'plan'; render(); });
    await page.click('[data-act=gearplate][data-v="45"]');
    a.deepEqual(await page.evaluate(() => S.cpref.plates.imperial), [45]);
    await page.click('[data-act=gearreset]');
    a.deepEqual(await page.evaluate(() => [S.cpref.bar, S.cpref.plates]), [{}, {}]);
  },

  async 'finds exact combinations a greedy pass misses'(page, a){
    await page.evaluate(() => { S.cpref.plates = { imperial: [45, 25] }; });
    a.equal(await plates(page, 195, BENCH), '45 lb bar + 25 + 25 + 25 per side = 195 lb');
    a.equal(await plates(page, 115, BENCH), '45 lb bar + 25 per side = 95 lb (10 per side short of 115)');
  },

  async 'a per-lift bar overrides the default for that lift only and cycles back'(page, a){
    await workout(page, [BENCH]);
    const btn = () => text(page, '[data-act=w-exbar]');
    const seq = [await btn()];
    for (let i = 0; i < 4; i++){ await page.click('[data-act=w-exbar]'); seq.push(await btn()); }
    a.deepEqual(seq, ['BAR: 45 lb', 'BAR: 35 lb (THIS LIFT)', 'BAR: 25 lb (THIS LIFT)', 'BAR: 15 lb (THIS LIFT)', 'BAR: 45 lb']);
    await page.click('[data-act=w-exbar]');                                 // 35 lb for the bench only
    await page.fill(`[data-dr="${BENCH}|w"]`, '115');
    a.equal(await page.evaluate(id => document.getElementById('plate_' + id).textContent, BENCH), '35 lb bar + 35 + 5 per side = 115 lb');
    a.equal(await plates(page, 115, SQUAT), '45 lb bar + 35 per side = 115 lb');
    a.deepEqual(await page.evaluate(id => warmupRamp(135, { eq: 'barbell' }, id)[0], BENCH), [35, 8], 'warm-up ramp should start from this lift\'s bar');
  },

  async 'metric uses its own defaults'(page, a){
    await page.evaluate(() => { S.profile.unit = 'metric'; });
    a.equal(await plates(page, 100, SQUAT), '20 kg bar + 25 + 15 per side = 100 kg');
    await page.evaluate(() => { S.cpref.bar = { metric: 15 }; });
    a.equal(await plates(page, 60, 'x'), '15 kg bar + 20 + 2.5 per side = 60 kg');
  },

  async 'older saved data without the new keys loads'(page, a){
    await page.evaluate(() => { delete S.cpref.bar; delete S.cpref.plates; delete S.cpref.barEx; normalizeCustom(); });
    a.deepEqual(await page.evaluate(() => [S.cpref.bar, S.cpref.plates, S.cpref.barEx]), [{}, {}, {}]);
  },
} };
