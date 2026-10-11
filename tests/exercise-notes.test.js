const { BENCH, workout, text } = require('./lib');

module.exports = { name: 'Exercise notes', tests: {
  async 'a note is saved as you type, shown on the collapsed card, and kept across re-renders'(page, a){
    await workout(page, [BENCH, 'plank'], BENCH);
    await page.fill(`[data-exnote="${BENCH}"]`, 'Seat at 4, left shoulder: go light');
    a.equal(await page.evaluate(id => S.cpref.notes[id], BENCH), 'Seat at 4, left shoulder: go light');
    await page.evaluate(() => render());
    a.equal(await page.evaluate(id => document.querySelector(`[data-exnote="${id}"]`).value, BENCH), 'Seat at 4, left shoulder: go light');
    await page.evaluate(() => { cwOpen = 'plank'; render(); });                              // collapse the bench card
    a.match(await text(page, '.xnote'), /Seat at 4, left shoulder: go light/);
    a.equal(await page.evaluate(() => document.querySelectorAll('[data-exnote]').length), 1, 'only the open card shows the editor');
  },

  async 'clearing a note removes it; length is capped'(page, a){
    await workout(page, [BENCH]);
    await page.fill(`[data-exnote="${BENCH}"]`, 'x'.repeat(250));
    a.equal(await page.evaluate(id => S.cpref.notes[id].length, BENCH), 200);
    await page.fill(`[data-exnote="${BENCH}"]`, '   ');
    a.equal(await page.evaluate(id => id in S.cpref.notes, BENCH), false);
  },

  async 'notes are escaped, not run as HTML'(page, a){
    await workout(page, [BENCH, 'plank'], 'plank');
    await page.evaluate(id => { S.cpref.notes[id] = '<img src=x onerror="window.__pwned=1"><b>bold</b>'; render(); }, BENCH);
    a.equal(await page.evaluate(() => window.__pwned), undefined);
    a.equal(await page.evaluate(() => !!document.querySelector('.xnote b')), false);
    a.match(await text(page, '.xnote'), /<img src=x/);
  },

  async 'program lifts have notes too, and older saved data without notes loads'(page, a){
    const ex = await page.evaluate(() => { S.meta.start = dkey(-60);
      const def = WEEK.find(d => d.type === 'strength' && d.blocks.some(bk => BLOCKEX[bk.id])); S.swap[VD()] = def.id;
      const bk = def.blocks.find(bk => BLOCKEX[bk.id]); openBlock = 'train'; openBlock2 = bk.id; render(); return BLOCKEX[bk.id][0]; });
    await page.fill(`[data-exnote="${ex}"]`, 'belt on');
    a.equal(await page.evaluate(ex => S.cpref.notes[ex], ex), 'belt on');
    await page.evaluate(() => { delete S.cpref.notes; normalizeCustom(); });
    a.deepEqual(await page.evaluate(() => S.cpref.notes), {});
  },
} };
