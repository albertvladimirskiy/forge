const { BENCH, SQUAT, workout, logSet, sets, text } = require('./lib');

const ROW = 'barbell-row';
const groups = page => page.evaluate(() => ssGroups(S.cust[VD()]).map(g => g.join('+')));
const link = (page, id) => page.click(`[data-act=w-ss][data-v="${id}"]`);
const unlink = (page, id) => page.click(`[data-act=w-ssun][data-v="${id}"]`);
const open = (page, id) => page.evaluate(id => { cwOpen = id; render(); }, id);

module.exports = { name: 'Supersets', tests: {
  async 'link two exercises, see the tag, unlink'(page, a){
    await workout(page, [BENCH, ROW, SQUAT], BENCH);
    a.match(await text(page, '[data-act=w-ss]'), /SUPERSET WITH NEXT/);
    await link(page, BENCH);
    a.deepEqual(await groups(page), [`${BENCH}+${ROW}`, SQUAT]);
    a.match(await text(page, '[data-act=w-ssun]'), /UNLINK SUPERSET/);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-ss]')), false, 'already linked: only UNLINK is offered');
    a.equal(await page.evaluate(() => document.querySelectorAll('.sstag').length), 2);
    a.match(await text(page, '.sstag'), /SUPERSET 1 · 1\/2/);
    await unlink(page, BENCH);
    a.deepEqual(await groups(page), [BENCH, ROW, SQUAT]);
    await open(page, SQUAT);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-ss]')), false, 'the last exercise has nothing to link to');
  },

  async 'logging alternates A -> B, and rest only starts after the last of the group'(page, a){
    await page.evaluate(() => { S.cpref.rest = 90; });
    await workout(page, [BENCH, ROW, SQUAT], BENCH);
    await link(page, BENCH);
    await logSet(page, BENCH, { w: 135, r: 8 });
    a.equal(await page.evaluate(() => rest), null, 'rest started between the two exercises of a superset');
    a.equal(await page.evaluate(() => cwOpen), ROW, 'did not move on to the partner');
    a.match(await text(page, '.toast'), /next: Barbell Row/);
    await logSet(page, ROW, { w: 95, r: 8 });
    a.equal(await page.evaluate(() => rest && rest.total), 90);
    a.equal(await page.evaluate(() => cwOpen), BENCH, 'did not return to the first exercise for round two');
    await open(page, SQUAT);
    await page.evaluate(() => { rest = null; });
    await logSet(page, SQUAT, { w: 185, r: 5 });
    a.equal(await page.evaluate(() => rest && rest.total), 90, 'a normal exercise still rests after every set');
  },

  async 'warm-ups and edits inside a superset do not advance or rest'(page, a){
    await page.evaluate(() => { S.cpref.rest = 90; });
    await workout(page, [BENCH, ROW], BENCH);
    await link(page, BENCH);
    await page.fill(`[data-dr="${BENCH}|w"]`, '95'); await page.fill(`[data-dr="${BENCH}|r"]`, '5');
    await page.click(`[data-act=w-wu][data-v="${BENCH}"]`); await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.equal(await page.evaluate(() => cwOpen), BENCH);
    await page.evaluate(() => document.querySelectorAll('.xbody .setedit')[0].click());
    await page.fill(`[data-dr="${BENCH}|w"]`, '100'); await page.click(`[data-act=w-log][data-v="${BENCH}"]`);
    a.equal(await page.evaluate(() => cwOpen), BENCH);
    a.equal(await page.evaluate(() => rest), null);
  },

  async 'a chain of three is a circuit; unlinking the middle separates everything around it'(page, a){
    await workout(page, [BENCH, ROW, SQUAT], BENCH);
    await link(page, BENCH); await open(page, ROW);
    a.match(await text(page, '[data-act=w-ss]'), /ADD NEXT TO CIRCUIT/);
    await link(page, ROW);
    a.deepEqual(await groups(page), [`${BENCH}+${ROW}+${SQUAT}`]);
    a.match(await text(page, '.sstag'), /CIRCUIT 1 · 1\/3/);
    a.equal(await page.evaluate(() => !!document.querySelector('[data-act=w-ss]')), false);
    await unlink(page, ROW);                                 // unlink on the middle card
    a.deepEqual(await groups(page), [BENCH, ROW, SQUAT]);
  },

  async 'reordering or removing an exercise unlinks around it'(page, a){
    await workout(page, [BENCH, ROW, SQUAT], BENCH);
    await link(page, BENCH);
    await page.click(`[data-act=w-mv][data-v="${BENCH}"][data-v2="1"]`);            // bench moves below the row
    a.deepEqual(await page.evaluate(() => S.cust[VD()].items), [ROW, BENCH, SQUAT]);
    a.deepEqual(await groups(page), [ROW, BENCH, SQUAT], 'the link now pointed at a different exercise');
    await link(page, BENCH);                                                       // link bench + squat
    await page.evaluate(id => { S.cust[VD()].sets[id] = [{ w: 80, r: 5 }]; render(); }, SQUAT);
    await page.evaluate(id => { cwOpen = id; render(); }, SQUAT);
    await page.click(`[data-act=w-rmex][data-v="${SQUAT}"]`); await page.click(`[data-act=w-rmex][data-v="${SQUAT}"]`);   // arm, then confirm
    a.deepEqual(await page.evaluate(() => S.cust[VD()].items), [ROW, BENCH]);
    a.deepEqual(await page.evaluate(() => S.cust[VD()].sup), {}, 'a link to a removed exercise survived');
  },

  async 'repeat last workout and saved routines keep the pairing; a changed order does not'(page, a){
    await page.evaluate(([b, r, q]) => { S.cust[dkey(-1)] = { ...newCW('with'), items: [b, r, q], sup: { [b]: true }, sets: { [b]: [{ w: 60, r: 5 }] } }; S.cust[VD()] = newCW('with'); render(); }, [BENCH, ROW, SQUAT]);
    await page.click('[data-act=w-start][data-v=last]');
    a.deepEqual(await groups(page), [`${BENCH}+${ROW}`, SQUAT]);
    await page.click('[data-act=w-routine]');
    a.deepEqual(await page.evaluate(() => S.routines[0].sup), { [BENCH]: true });
    await page.evaluate(() => { S.cust[VD()] = newCW('with'); render(); });
    await page.click(`[data-act=w-start][data-v^="rt:"]`);
    a.deepEqual(await groups(page), [`${BENCH}+${ROW}`, SQUAT]);
    a.deepEqual(await page.evaluate(([b, r]) => { const c = newCW('with'); c.items = [r, b]; ssCopy(c, { [b]: true }, [b, r]); return c.sup; }, [BENCH, ROW]), {}, 'reversed pair must not stay linked');
  },

  async 'older saved workouts without links load'(page, a){
    await page.evaluate(id => { S.cust[VD()] = { name: '', mode: 'with', items: [id], sets: {}, note: '', t0: null, t1: null, fin: false }; normalizeCustom(); render(); }, BENCH);
    a.deepEqual(await page.evaluate(() => S.cust[VD()].sup), {});
  },
} };
