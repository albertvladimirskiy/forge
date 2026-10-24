# FORGE — deploy + data guide

Nine files, no build step. `index.html` is the app; `foods-db.js` is the big food library, `exercises-db.js` the exercise library, `micros-db.js` the USDA micronutrient table and `quotes-db.js` the athlete quote library it loads.

## Deploy (GitHub Pages, ~4 min)

1. New public repo, e.g. `forge`.
2. Upload all nine files to the root.
3. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
4. Open `https://<username>.github.io/forge/` on your phone.

**iPhone:** open in Safari → Share → **Add to Home Screen**.
**Android:** Chrome → menu → **Install app**.

## Your progress vs. code updates — the exact rules

Your data lives in the browser's local storage, keyed to the **web address**, completely
separate from the code files. So:

| Action | Progress |
|---|---|
| Push new code to the same repo, reload the app | ✅ kept |
| Redesign the whole UI, same URL | ✅ kept |
| Already used the old "Protocol" version at the same URL | ✅ migrates in automatically |
| Rename the repo / change the URL | ❌ looks empty (old data still at old URL) |
| Clear Safari/Chrome site data | ❌ gone |
| Different device | separate file per device |

Fuel and Target use the **7-day average** of your weigh-ins (not a single reading) for calorie, macro, activity and strength-standard
math; the weight chart draws it as a dashed line. Today's food panel also tracks **water**, and
has COPY YESTERDAY'S FOOD, RECENT foods and saved MY FOODS.

### How the day's calories, macros and water are worked out

Each day's target is **maintenance + the goal adjustment** (BUILD +10%, CUT -15%). Maintenance for a date is
`BMR x daily life + what that day's training costs`. BMR is Mifflin-St Jeor. *Daily life* is Plan -> **Daily life (outside
training)**: mostly seated 1.3, on your feet a lot 1.45, physical job 1.6. Training is **not** inside that number; it is added day by day, so
a rest day, a lifting day and a double day each get their own target. Four sources, each costed at **net MET** (MET - 1, because
the resting part is already in the base) x bodyweight x minutes:

| Source | How it is costed |
|---|---|
| The planned session | Its scheduled minutes (shortened when tagged practice trims it) x a session-average MET by day type: strength 5, striking and grappling 7.5, engine 8, craft 4.5, recovery 3 (`PLAN_MET`). Skipped if a custom workout is set to *replace* it. |
| A fight logged with ADD FIGHTING | Minutes x MET from the discipline and your 1-10 effort rating (`FIGHT_MET`: live work runs 6 at effort 1 to 10 at effort 10; pads/bag 5-9; drilling 3.5-6; conditioning 6-10). No rating counts as 5. |
| A custom workout | **Lifting sets** (weights, bodyweight, carries): each set is its reps' work time (3 s a rep) plus that exercise's rest, at an average MET that follows the set's **RPE**: 3.5 at RPE 5 or less, rising to 6.0 at RPE 9 or more (Compendium light to vigorous resistance training). Sets without an RPE use the exercise's other rated sets, else 7. Big-muscle lifts (legs, back, full body) count x1.15, isolation (arms, calves, core, neck) x0.85, plyos +1.5 MET, warm-up sets are light (MET 3, 30 s rest). A superset partner rests 15 s, only the last of the group takes the full rest. More sets, harder sets, longer rest all cost more. **Cardio and holds**: logged time at a MET from the exercise name; runs and walks with a distance use about 1 / 0.6 kcal per kg per km (a distance with no time assumes 6 / 12 min per km), rides use speed (3 min per km if no time) (MET 4 under 16 km/h up to 15.8 over 32 km/h). Sets that belong to a planned block are skipped, they are already in the planned session. |
| A commitment tagged Physical in Plan | Its minutes x the sport's MET (`SPORTS`; combat entries are class averages). |

**No double counting:** minutes of fights you log displace the same minutes of a tagged BJJ / striking / wrestling class first, then of a
planned striking / grappling / engine session. Logging the class you were already going to do replaces it rather than adding to it.
Lifting plus a fight, or a lifting day plus a run, do add up.

**Macros.** Protein is 2.0 g/kg (2.2 on a CUT). Fat is 27% of calories but held between 0.8 and 1.2 g/kg. Carbs are the rest, so training
calories land in carbs, which is what hard sessions run on (about 4-5 g/kg on a typical day, 7+ on a double day, inside the 3-10 g/kg
sports-nutrition range). **Micros** that track energy (fiber, B1-B3, the saturated-fat limit) scale with the day's calories, so they move
with training too.

**Sweat, water and electrolytes.** Sweat is about 1.5 ml per kcal of training (roughly 0.5 L/h lifting, 1 L/h grappling, 1.4 L/h running),
times **Plan -> Sweat** (light 0.75, average 1, heavy sweater or hot room 1.4). **Water** is 40 ml/kg plus that sweat. In MICROS the
**sodium limit** and the **potassium, calcium and magnesium** targets rise by what the sweat carries, per litre: sodium 1,000 mg (published
whole-body mean about 44 mmol/L, individuals run 20-80), potassium 195 mg, calcium 40 mg, magnesium 10 mg (sources disagree 2-4x on
magnesium, treat it as the roughest). Iron, zinc and chloride are not modelled. Fuel also shows, for any session of an hour or more at
vigorous effort, a carbs-per-hour line (30-60 g, up to 90 over 2.5 h) and your hourly sweat rate.

**Energy availability.** With a body-fat reading logged, Fuel shows (target - training kcal) / lean mass and warns under about 30 kcal/kg, the
IOC's low-energy-availability range (RED-S). The threshold comes mostly from short studies in women, so it is a warning, not a limit: the
target is never changed by it.

These are population-average estimates (METs are averages, a wearable will disagree by 10-20% either way). Judge them against the
two-week weight trend and adjust *Daily life* or the goal.

Insurance: **Settings (gear) → Data + backup → Back up now** (saves a JSON file; the clipboard copy only happens if the share sheet isn't available),
**Import** to restore. Do it monthly.

One wrinkle after updates: the service worker caches hard. If new code doesn't appear,
fully close the app and reopen, or reopen twice.

### Safety limits, progression steps and recovery

- **What the plan shows is what it means.** "Last weight + one step" is shown exactly (deadlift 225 lb -> 235 lb); only a *guessed* weight
  (first session from the Log tab, a reset, a deload, a ramp week) is rounded to the bar (5 lb, 2.5 lb for small dumbbell lifts). Metric
  users get kilogram steps of 2.5 / 5 / 1.25 kg instead of the pound steps converted (`incFor`, `loadStepKg`).
- **1RM estimates** use Epley capped at 10 reps, so 135 lb x 30 can't outrank a heavy 225 x 5. More reps at the same weight still ranks higher.
- **Typos are refused, not recorded** (`LIM` in the script): Plan age 12-90 and height 120-230 cm; Log lifts above 0 and up to 700 kg, waist
  and shoulders 30-250 cm, resting HR 25-220, sleep up to 24 h; sets up to 1,500 kg and 1,000 reps; food amounts up to 5 kg; custom foods
  0-10,000 kcal and 0-1,000 g per macro. Values already saved from before are clamped when targets are worked out.
- **Import and recovery.** A backup is parsed without `__proto__` keys, unreadable entries are dropped, and every screen is drawn once
  before the import is committed; if any screen would break, nothing changes and you are told why. If the app can't draw its saved data
  when it opens, it shows a recovery screen (restore the newest snapshot that works, download the raw data, or start fresh) instead of a
  blank page.

## Customizing

All content is plain data at the top of the script in `index.html`: `WEEK_STD` and the program variants `D8`/`D9` (training days, blocks, `steps`, `prog` rules; the Forge Builder program is the Mon/Tue/Thu/Fri Lower A / Upper A / Lower B / Upper B split), `FOODS` (the calorie database — add your staples),
`BOOKS` (161 titles across nine tracks, each tagged with a phase), `SKILLS`, `CAPITAL`, `HABITS`, `NEWS`, `PHASES`, `ORDERS`, `SPORTS` (the gross MET value
per sport used to cost calendar commitments tagged Physical — add a sport your gym does that
isn't listed, or tune a number if it's over/under-crediting you).

`FOODS_VENUES`, right after `FOODS`/`FOODS_MORE`, is where real menu items live — a cafeteria,
a dining hall, a restaurant chain — so you can log "the whole sandwich" instead of guessing at
ingredients. Same `[name, kcal, protein, carbs, fat]` shape as `FOODS`; name it
`"Venue — Item (portion)"` so searching the venue groups its items together. A Panera starter
set is in there now — add your own cafeteria/restaurants the same way, one line per item.

### The extended food library (`foods-db.js`)

About 7,000 more foods on top of the hand-written lists above, in three arrays that `index.html`
merges into `FOODS` at load: `FOODS_CHAINS` (fast food, coffee, pizza, sit-down chains),
`FOODS_GROCERY` (packaged products, bars/shakes, cereal, drinks and alcohol, condiments, and
common home/restaurant dishes at normal servings) and `FOODS_USDA` (generic foods per 100 g, from
USDA FoodData Central SR Legacy, public domain — those rows have a 6th element, `100`, and the
picker's "amount" box scales them by grams or ounces). The chain and grocery numbers were written
from published nutrition info as remembered, not scraped, so treat them as roughly ±10% and
overwrite anything you have the label for. Search matches every word you type in any order.
To add your own, append `['Name',kcal,p,c,f]` to any array in that file (or to `FOODS_VENUES`).

### Food data, micronutrients and the food log
`foods-db.js` is the food list (about 7,600 foods: restaurant and chain items, packaged and grocery items, and USDA generics per 100 g).
Names are unique, ignoring case, spacing and punctuation; the same food is never listed twice under two serving styles. USDA
rows come from USDA SR Legacy; the generic and grocery rows were checked against USDA SR28 portion weights. Restaurant and
brand rows are from published menus and labels as remembered, so treat them as roughly ±10%.

`micros-db.js` holds USDA SR28 values per 100 g for 29 vitamins, minerals, fiber, sugars and fats (`MICRO_DEF` in `index.html` gives
the order, units and FDA Daily Values). It is loaded the first time a micro view opens. A food row points at its record with an NDB
number after the gram basis: `[name, kcal, p, c, f, 100, ndb]` for USDA rows and `[name, kcal, p, c, f, 0, ndb, grams]` for per-serving
rows; a negative NDB means "a close USDA equivalent" rather than the exact item. Logging a food stores that reference on the entry
(`mk`, `mg` grams, `ma` approximate), so totals never depend on a name lookup; older entries are matched by name. Restaurant,
branded and mixed dishes have no USDA record of their own, so each one borrows the per-gram profile of the closest USDA stand-in
(a Big Mac uses USDA's Big Mac, an unlisted burger uses a similar burger, a latte uses a milky coffee); those are always flagged
approximate and the micro view says how many of the day's foods were estimated. Supplements, protein bars/powders, energy drinks and
a few oddities have no sensible stand-in and show no data.

**Supplements** (Today → FOOD → SUPPLEMENTS → + ADD): pick a vitamin, mineral or fiber, an amount and a unit (mg, µg, g, or IU for
vitamins A, D and E), and it's stored on that day as `supps: [{ k: 'vitc', a: 500 }]` in the nutrient's own unit. They add into the MICROS
totals (each row says how much came from supplements). "Keep it" saves a one-tap preset in `S.mysupps`; COPY YESTERDAY'S SUPPLEMENTS repeats a
day. Totals are checked against US adult upper limits; the ones that apply to supplements only (magnesium, niacin, vitamin A, vitamin E,
folate) compare against the supplement amount alone, and a warning shows when a limit is passed.

**Swapping exercises** (Today → open a workout block → SWAP EXERCISE): replace any program lift with a library exercise (e.g. incline bench for pause bench on Upper A). Suggestions are variations of the current lift, and search covers the whole library. The swap keeps the original's sets, reps and step, but the new lift keeps its own weights and history, so it starts with no prescription until you log it. Swaps apply wherever that lift appears; "put it back" restores the original, whose history is kept.

On **Today → FOOD**, MACROS / MICROS switches the day's overview (the choice is saved). The micro percentages are of FDA Daily Values; the ones that track energy
(fiber, thiamin, riboflavin, niacin, the saturated-fat limit) scale with that day's calorie target, the same one the macro bars use,
and show their scaled target ("62% of 42 g"). The rest are fixed adult values, because they depend on age and sex rather than calories. FOODS EATEN closes and opens the list,
tapping a food opens its macros and micros, and EXPAND ALL / COLLAPSE ALL does every food at once.

### Custom workouts, fighting and the exercise library (`exercises-db.js`)

About 6,500 movements in `EXLIB`, grouped as `[muscle, equipment, kind, [names]]` (barbell/dumbbell/machine/cable/bodyweight
lifts, carries, plyos, cardio, sports, combat drills, mobility). The kind decides what a set records: weight x reps,
bodyweight reps (+ optional added weight), timed holds, cardio time + distance, or loaded carries. Append a name to a group to
add one, or use CREATE EXERCISE in the picker (stored in your backup, not the file).

On **Today**, every day has ADD WORKOUT (lift days say EDIT WORKOUT and set the planned session aside, which leaves the
program's progression untouched; KEEP BOTH shows the plan too) and ADD FIGHTING (discipline, minutes, rounds, effort, what
worked / got you caught). Nothing is prescribed in a custom workout: each exercise shows what you did the last time you logged it
anywhere (30 push-ups last week means 30 is the benchmark and the prefill), flags PRs, and the link works both ways (`EXLINK`): sets from the program's own lifts count
as history for the matching library exercise, and sets you log in your own workout for that exercise (Trap Bar Deadlift for the plan's
deadlift, Barbell Back Squat for the squat, and so on) count for the plan lift's next prescription, its record and your strength standards. Rest timer, plate math for barbell lifts, favorites, routines and a
history / lift-PR screen (the TRAIN tab, or the link under the workout area) are included. Custom data lives in `S.cust`,
`S.fights`, `S.routines`, `S.myex` and `S.cpref`, so Export / Import covers it.

Set logging details: the program's own lifts and custom exercises have the same tools — steppers, warm-up set and ramp, plate
math and bar choice, history, RPE, notes, edit in place, and the rest timer (default length and bell are one setting; each lift can
override its rest, shared between its program and custom versions; timed holds and cardio only rest if you give them their own rest).
Tap a set to **edit** it in place. **WARM-UP SET** tags a set
so it never counts toward PRs, benchmarks, volume or the rest timer, and **WARM-UP RAMP** fills in the bar and ~50/70/85% steps up
to the weight in the box. Optional **RPE** (6-10) goes on any lifting set; a program lift whose last session hit RPE 9.5+ gets a
plain-text "repeat it if that was a grind" nudge (the prescription itself is unchanged). The rest timer rings a bell when it ends
(iOS can't vibrate; BELL / SILENT is in the workout panel, and each exercise can override the default rest length). Bar weight and
the plates your gym has live under **Plan → Barbell + plates**, with a per-lift BAR button for EZ or trap bars; the plate line
picks the fewest plates that make the weight.

More on custom workouts: **SUPERSET WITH NEXT** links an exercise to the one below it (link again for a circuit); logging a set
moves to the partner and the rest timer waits for the last exercise of the group. Each exercise has a saved **note** (a cue
shown when it's open, and as a one-liner when collapsed). Under LAST TIME a **NEXT TIME** line suggests a weight from your last
working sets and RPE; it never changes anything by itself. **SHARE WORKOUT SUMMARY** (and SHARE on past workouts) sends a plain
text recap through the share sheet or the clipboard.

**Progression and a bad day.** Every program set remembers what the plan asked for that day. If you train lighter (say 135 when it
said 155) the app tells you to repeat that weight for the rest of the day, and once you hit every rep the next session goes *back* to
155 instead of climbing from 135. Missing reps at the lighter weight is not excused, and two lighter days in a row are accepted as
your new baseline (so you can't get stuck on a weight you can't lift). Deload-week sets are flagged and never become the baseline
the next weeks climb from; the ramp-week discount only trims a starting weight guessed from the Log tab. The custom workout panel
on Today minimizes to one line (tap its header); the choice is saved with that day's workout.
**Train → WORKOUTS** lists every session: your custom ones and the built-in planned ones (any day you logged a program lift or
ticked a block of Lower A, Upper A, striking, BJJ, engine...). Planned blocks without a progressing lift (box jumps, carries,
pallof, planks, dead hangs, med-ball throws, swings, dips) have a LOG button inside the block that opens the normal exercise card:
weight × reps, reps, hold time or carry distance, plus rest timer and history. Those sets are stored in that day's `S.cust`
entry (`cw.blk` lists which exercises belong to a block), so they feed history and benchmarks like any other exercise.

### Briefing, round timer, muscle map, 90-day challenge, fight camp, safety

- **Daily briefing** (top of Today, one collapsed line until you tap it): one line picked by what's happening (first week, PR, comeback after missed days,
  streak at risk in the evening, fight camp, lift / fight / build day), your written *why*, your own lines mixed into the
  rotation, and play buttons for your own speeches or playlists. Lines live in `BRIEF_LINES`; add your own in the app.
- **Round timer**: boxing / pro / Muay Thai / MMA / BJJ / wrestling / bag / Tabata presets or custom, synthesized bell and
  clapper, wake lock, drift-free timing. Ends by logging a fight session (or a set, when opened from an exercise card).
- **Muscle map** (Train → MUSCLES, or MUSCLE MAP on Today): weekly sets per muscle from custom workouts and program lifts,
  with half-set credit to helper muscles on compound lifts. Targets in `MM_REG`, helper rules in `MM_SEC`.
- **90-day challenge** (Body → 90 DAY): day counter + grid, weekly check-ins with front/side/back photos and
  measurements, side-by-side compare. Photos stay in IndexedDB on the device (not in the JSON backup): use SAVE PHOTOS.
- **Fight camp** (Train → FIGHTS): fight date, weigh-in and target weight drive a countdown, phase plan and a
  weight-cut tracker that flags unsafe paces. Sessions can record sparring partners.
- **Safety**: daily automatic snapshots (last 14, with undo) in IndexedDB, a weekly backup nudge that saves through the share
  sheet, restore from a backup file (an import takes an undo snapshot first), and a calendar (.ics) export of the week so your
  phone's calendar does the reminding. Deleting a set, food, exercise, workout, routine or entry offers **UNDO** for a few seconds
  (not 90-day photos, which are erased for good). A web app can't write to iCloud on its own, so backups stay manual; **Settings →
  Data + backup** also exports workouts, body log, food log and fight sessions as CSV for a spreadsheet.
- **First run**: a five-step setup on a fresh install; existing data skips it. Lower Today sections fold and remember it.

### Quotes from real athletes (`quotes-db.js`)

203 lines from 107 fighters, martial artists, lifters, runners and riders, team and solo athletes, coaches and mountaineers,
grouped by person in `QLIB`. Each row is `[text, tier, source note, tags]`. The tier says how solid it is: SOURCED (traced to a
dated origin: an ad, a speech, a book title, a film script), REPORTED (credible secondary source) or ATTRIBUTED (widely credited,
original not found, so the wording may differ). Roughly 60% are ATTRIBUTED, because most of the internet's quote lists never cite
anything; tick ONLY VERIFIED to hide those. The briefing editor lets you pick which kinds of athlete you want, browse and search all
of them with their sources, and pin one for today. Selection is a stable shuffle that keeps one athlete from appearing twice in a row
and walks it a day at a time, so nothing repeats until the whole pool for that kind of day has been shown. Tags decide which
days a line fits (lift day, fight day, comeback, deload and so on).

### Reading list

161 books in nine tracks: Markets & Capital, Economics, Geopolitics, Judgment, Character & Will, People, Body & Craft, plus two
new ones, **Combat** (fighters' memoirs, strategy, the psychology of conflict) and **Business & Builders**. Each track is sorted by
phase (1 = start here). The MIND score counts finished books against a fixed goal of 48 (`BOOK_GOAL`), so a bigger library never lowers it.
Add your own as one line in `BOOKS`: `{id,tr,p,t,a,w}`.

## Tests

`tests/` holds browser tests for the app (headless Chromium loads the app from a tiny local http server that `tests/lib.js` starts by itself; loading it from `file://` made Chromium occasionally give a reloaded page empty storage, which looked like lost data and made reload tests flaky).
They are not part of the deployed site.

```
cd tests
npm install && npx playwright install chromium   # once
npm test                                          # all of it, about a minute
node run.js rest                                  # only tests whose file, group or name contains "rest"
```

Each `*.test.js` file exports `{ name, tests: { 'what it checks': async (page, assert) => {...} } }`. Every test gets a fresh
page past onboarding, with the app's own globals (`S`, `render`, `VD()`, `T`, ...) reachable inside `page.evaluate`, and an
uncaught error inside the app fails the test. If Playwright or Chromium live somewhere unusual, set `PLAYWRIGHT_PATH` and
`CHROMIUM_PATH`. Fixing a bug here means adding the test that would have caught it.

`tests/fixtures/old-state.json` is a saved app produced by the original build (before the set-logging, food, plate and water
features); `migration.test.js` loads it with its dates moved to "now", visits every screen, and checks nothing was lost or changed.
To refresh it after a future data-shape change, regenerate it from the build you want to protect.

**Settings** (the gear, or SETTINGS + WEEK on Today) holds the program, your week, reminders, calendar export, barbell + plates, body profile, **text size** (normal / large / extra large), and backup, restore, CSV export and snapshots. Tap any of the five bars at the top to see what it is made of.

**Tabs:** TODAY (the day), TRAIN (workout log, muscles, lift records, fights and camp, routines), BODY (target, fuel, log, 90-day), MIND, LEDGER (weekly review, records, capability, capital, net worth, network, and a folded THE ARC / standing orders / file status).

**Tour.** The first time you open each tab (and Settings) a short card explains what it is for; GOT IT dismisses it, SKIP TOUR dismisses them all, and **Settings → Replay the tour** brings them back. The text lives in `TOUR` in `index.html`. Existing installs, imports and restored backups are treated as already toured.
