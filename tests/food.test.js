module.exports = { name: 'Food logging', tests: {
  async 'copy yesterday, recent foods, my foods'(page, a){
    await page.evaluate(() => {
      S.ui.fold.food = true;
      S.days[dkey(-1)] = { blocks: {}, habits: {}, rv: {}, nudge: {}, food: [{ n: 'Oatmeal', kcal: 300, p: 10, c: 54, f: 6, q: 1 }, { n: 'Eggs, 3', kcal: 210, p: 18, c: 1, f: 15, q: 1 }] };
      S.days[dkey(-3)] = { blocks: {}, habits: {}, rv: {}, nudge: {}, food: [{ n: 'Rice bowl', kcal: 500, p: 20, c: 80, f: 8, q: 1 }] };
      render(); });
    const names = () => page.evaluate(() => day(VD()).food.map(f => f.n + ' x' + f.q));
    const days0 = await page.evaluate(() => Object.keys(S.days).length);
    a.match(await page.evaluate(() => document.querySelector('[data-act=copyyday]').textContent), /YESTERDAY'S FOOD · 2 ITEMS/);
    a.equal(await page.evaluate(() => Object.keys(S.days).length), days0, 'looking at the button must not create day records');
    await page.click('[data-act=copyyday]');
    a.deepEqual(await names(), ['Oatmeal x1', 'Eggs, 3 x1']);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=copyyday]')), false);

    await page.evaluate(() => { day(VD()).food = []; render(); });
    await page.click('[data-act=foodopen]');
    a.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-act=addrecent][data-v2="1"]')].map(x => x.textContent.replace(/\s+/g, ' ').trim())),
      ['Eggs, 3 210 kcal · 18p', 'Oatmeal 300 kcal · 10p', 'Rice bowl 500 kcal · 20p']);
    await page.click('[data-act=addrecent][data-v="2"][data-v2="1"]');
    a.deepEqual(await names(), ['Rice bowl x1']);

    await page.fill('#cf_n', 'Protein bar'); await page.fill('#cf_k', '210'); await page.fill('#cf_p', '20'); await page.fill('#cf_c', '22'); await page.fill('#cf_f', '7');
    await page.click('[data-act=addcustomfood]');
    a.deepEqual(await page.evaluate(() => S.myfoods), [{ n: 'Protein bar', kcal: 210, p: 20, c: 22, f: 7 }]);
    await page.fill('#foodq', 'protein');
    a.match(await page.evaluate(() => document.querySelector('#foodres .fres').textContent), /Protein bar/);
    await page.evaluate(() => { day(VD()).food = []; });
    await page.click('[data-act=addmyfood][data-v="0"]');
    a.deepEqual(await page.evaluate(() => { const f = day(VD()).food[0]; return [f.kcal, f.p, f.c, f.f]; }), [210, 20, 22, 7]);
  },

  async 'unchecking Keep skips saving; the same name updates instead of duplicating; remove works'(page, a){
    await page.evaluate(() => { S.ui.fold.food = true; foodOpen = true; render(); });
    await page.fill('#cf_n', 'One-off'); await page.fill('#cf_k', '100'); await page.uncheck('#cf_save'); await page.click('[data-act=addcustomfood]');
    a.deepEqual(await page.evaluate(() => S.myfoods.length), 0);
    await page.fill('#cf_n', 'Bar'); await page.fill('#cf_k', '200'); await page.click('[data-act=addcustomfood]');
    await page.fill('#cf_n', 'bar'); await page.fill('#cf_k', '230'); await page.click('[data-act=addcustomfood]');
    a.deepEqual(await page.evaluate(() => S.myfoods.map(f => f.n + ':' + f.kcal)), ['bar:230']);
    await page.click('[data-act=delmyfood][data-v="0"]');
    a.equal(await page.evaluate(() => S.myfoods.length), 0);
  },

  async 'older saved data without myfoods loads'(page, a){
    await page.evaluate(() => { delete S.myfoods; normalizeCustom(); });
    a.deepEqual(await page.evaluate(() => S.myfoods), []);
  },
} };
