/* The reading list: every book has a known track, a phase of 1-3, a unique id, and the Books screen draws every track. */
module.exports = { name: 'Reading list', tests: {
  async 'every book has a unique id, a known track and a phase 1-3, and every track has books'(page, a){
    const bad = await page.evaluate(() => {
      const ids = new Set(), out = [];
      for (const b of BOOKS){
        if (ids.has(b.id)) out.push('dup ' + b.id); ids.add(b.id);
        if (!TRACKS[b.tr]) out.push('track ' + b.id);
        if (![1, 2, 3].includes(b.p)) out.push('phase ' + b.id);
        if (!b.t || !b.a || !b.w) out.push('text ' + b.id);
      }
      for (const k in TRACKS) if (!BOOKS.some(b => b.tr === k)) out.push('empty track ' + k);
      return out;
    });
    a.deepEqual(bad, []);
  },
  async 'the Philosophy track shows on the Mind screen and a book can be started'(page, a){
    await page.evaluate(() => { view = 'mind'; openTrack = 'phil'; render(); });
    const t = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
    a.match(t, /Philosophy/); a.match(t, /The Problems of Philosophy/); a.match(t, /Beyond Good and Evil/);
    await page.click('[data-act=book][data-v=ph1]');
    a.equal(await page.evaluate(() => S.books.ph1), 1);
  },
} };
