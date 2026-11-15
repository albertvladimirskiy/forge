# FORGE audit

Written from a full read of the code on branch `claude/admiring-lovelace-6ciyxv`. Each claim is marked
**verified** (I ran it or read the exact lines), **assumed**, or **untested**. The change log for this branch is at the bottom.

## 0. What the brief got wrong about the app (verified)

The brief describes a small lift / nutrition / quotes tracker. The code is a much larger and more mature app:

- One 570 KB `index.html` (7,500 lines: 700 CSS, 6,800 JS) plus four data files. No build step, no dependencies. True.
- It is a whole "self-construction program": a weekly training **program with auto-progression** (three variants, including a
  4-day lifting split called Forge Builder), custom workouts, fight logging and fight camp, a day scheduler, food + micronutrients +
  supplements + water, body log, a 90-day photo challenge, a reading list (181 books), skill tiers, a capital ladder, net worth, and a
  weekly review.
- **Much of the brief's Phase 1 already exists**: backup to a dated JSON file, restore from file or paste (validated, dry-rendered on
  every screen before commit), daily automatic snapshots (14 kept, in IndexedDB), undo for a restore, a recovery screen, CSV export.
- It already has a **test suite**: 197 browser tests (Playwright driving headless Chromium, plain `node:assert`, no test framework),
  including an old-data migration fixture. Baseline on this branch before I touched anything: **197 passed, 0 failed**.
- It already has a CSS token system, a text-size setting, `prefers-reduced-motion`, Epley e1RM (capped at 10 reps), PR detection, a
  7-day bodyweight average, a muscle map, RPE on sets, and photos in IndexedDB.

So the honest scope is: close the remaining safety holes, fix what is actually broken, then build the parts that do not exist
(insights engine, ranks and missions, the visual direction).

## 1. File map

| File | Size | What it is |
|---|---|---|
| `index.html` | 572 KB | The whole app: CSS (lines 15-712), program and content data, state, logic, views, events, boot |
| `foods-db.js` | 482 KB | `FOODS_CHAINS`, `FOODS_GROCERY`, `FOODS_USDA`: about 7,000 foods merged into `FOODS` at load |
| `micros-db.js` | 632 KB | `MICROS`: USDA micronutrients per 100 g. Lazy-loaded the first time a micro view opens |
| `exercises-db.js` | 155 KB | `EXLIB`: about 6,500 exercises as `[muscle, equipment, kind, [names]]` |
| `quotes-db.js` | 36 KB | `QLIB`: 203 athlete quotes with a sourcing tier and day-type tags |
| `sw.js` | 1.3 KB | Service worker |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | | PWA install metadata |
| `tests/` | | Browser tests, a local static server, an old-build fixture. Not deployed |

### Navigation (the layout to preserve)

Bottom nav: **TODAY · TRAINING LOG · BODY · MIND · LEDGER**. Header: brand, phase line, streak, calendar icon (My Week),
gear (Settings), five "vitals" bars (BODY, COMBAT, MIND, WILL, CAPITAL).

| View | Function | Holds |
|---|---|---|
| Today | `ViewToday` | week strip, briefing (quote), next-up card, schedule rail, timeline with the planned session and its set logs, custom workout, fighting, day off / injury, FOOD (macros/micros, water, supplements, search), habits, after-action, 14-day heat strip |
| Training log | `ViewWorkoutLog` | workouts, muscle map, lift records, fights + camp, routines |
| Body | `ViewBuild` | target (physique math), fuel (calories, macros, meal templates), log (weigh-ins, measurements, charts, strength standards), 90-day challenge (photos) |
| Mind | `ViewMind` | reading list by track |
| Ledger | `ViewLedger` | weekly review, records, capability tiers, capital ladder, net worth, network, the arc |
| My Week | `ViewWeek` | week-ahead load, fixed commitments, one-off events, calendar export |
| Settings | `ViewPlan` | program, reminders, wake/sleep, barbell + plates, profile, text size, data + backup |

### How data flows

1. `bootApp()` loads one JSON blob from `localStorage`, merges it over `DEFAULTS`, runs `normalizeCustom()` (repairs shapes) and the
   migrations, then `render()`.
2. Everything lives in one global object `S`. Every tap goes through one delegated `click` listener (`handleClick`, plus `wAct`,
   `bAct`, `tAct`, `chAct`, `campAct`, `sAct`, `offAct`, `injAct` for feature families), which mutates `S`, calls `commit()`, then `render()`.
3. `render()` rebuilds the whole `#app` tree as one HTML string and restores scroll, half-typed fields and focus.
4. `commit()` serialises all of `S` to `localStorage` (typing uses `commitSoon()`, a 400 ms debounce, flushed on `pagehide`).
5. Derived numbers (streak, e1RM, prescriptions, calorie targets, muscle tallies) are recomputed from `S` on each render; a per-task
   `memo()` caches the expensive ones. Only `S.prs` is stored derived data, and `syncPRs()` rebuilds it on every commit.

## 2. Storage: the de facto schema

### localStorage

| Key | Written by | Read by | Notes |
|---|---|---|---|
| `forge.v1` | `Store.save` (every `commit`) | `Store.load` at boot, recovery screen | The entire app state `S`, one JSON string |
| `protocol.v2` | nobody (legacy) | `Store.load` fallback, recovery screen | The pre-FORGE build's key. Read once, then saved forward as `forge.v1`. Never deleted |

`Store` also checks `window.storage` first (a leftover from where the app was first built). It does not exist in a browser, so it is
dead code on GitHub Pages. Left alone.

### IndexedDB database `forge-photos` (version 2)

| Store | Key | Value | Written by | Read by |
|---|---|---|---|---|
| `p` | `ph_<time>_<pose>` | JPEG `Blob`, downscaled to 1080 px | 90-day check-in photo picker | `hydratePhotos`, SAVE PHOTOS |
| `s` | `YYYY-MM-DD`, `undo-<ms>`, `pre-v<n>-<ms>` (new) | JSON string of the state | `snapDaily` (first open each day), restore/import (undo point), migration runner (new) | Settings snapshot list, recovery screen |

Photos are **not** in the JSON backup today. That is called out in the app and is the one real gap in export (planned for Phase 4).

### Cache Storage

`forge-v<N>` holds the nine deployed files.

### Shape of `S` (`forge.v1`)

All weights are stored in **kg**, distances in metres, durations in seconds, dates as local `YYYY-MM-DD` strings.

| Field | Shape | Written from |
|---|---|---|
| `schemaVersion` (new) | integer | migration runner |
| `profile` | `{unit:'imperial'|'metric', sex, age, height(cm), activity, sweat, goal:'gain'|'recomp'|'lean', wake, sleep, trainPref, commute, program:'standard'|'builder'|'fighter'}` | Settings, onboarding |
| `days[date]` | `{blocks:{blockId:true}, habits:{id:true}, mind, news, rv:{win,miss,next}, nudge:{entryId:minutes}, food:[{n,kcal,p,c,f,q,mk?,mg?,ma?}], water(ml), supps:[{k,a}]}` | Today |
| `gym[date][liftKey]` | `[{w(kg), r, rpe?, wu?, p?(planned kg), dl?(deload)}]` | program-lift set log |
| `cust[date]` | `{name, mode:'with'|'replace', items:[exerciseId], sets:{id:[{w,r,t,d,rpe?,wu?}]}, sup:{id:true}, blk?:[id], note, t0, t1, fin}` | custom workouts and block logs |
| `fights[date]` | `[{id, disc, min, rounds, rpe, worked, caught, partner?}]` | ADD FIGHTING |
| `log` | `[{date, weight?, bf?, waist?, shoulder?, rhr?, sleep?, squat?, bench?, dead?, ohp?, row?, pullup?}]` sorted by date | Body → Log |
| `prs[liftKey]` | `{w, r, e1rm, date}` | derived (`syncPRs`) |
| `nw` | `[{date, v}]` | Ledger |
| `books`, `bookDates`, `tiers`, `capital`, `reach[date]` | maps | Mind, Ledger |
| `fixed[dow]`, `extra[date]` | `[{s,e,l,t,sp}]` commitments | My Week |
| `swap[date]` | day id | Today → SWAP |
| `off[date]` | `'sick'|'travel'|'rest'` | DAY OFF |
| `injury` | `{area, sev, on}` or null | HURT? |
| `deload` | `{until, snooze}` | deload banner |
| `flags[liftKey]` | date | pain flag |
| `exsw`, `exreg` | lift swaps | SWAP EXERCISE |
| `routines`, `myex`, `myfoods`, `mysupps` | arrays | their pickers |
| `cpref` | `{rest, fav, recent, restEx, restSound, bar, plates, barEx, notes}` | workout settings |
| `motiv` | `{why, quotes, links, qmode, qoff, qsolid}` | briefing editor |
| `tpref` | round-timer prefs | timer |
| `ch90` | `{start, goal, checkins:[{week, date, weight, waist, photos:{front,side,back}}], past:[]}` | 90-day challenge |
| `camp`, `campHist` | fight camp | Training log → Fights |
| `notif` | `{on}` | Settings |
| `meta` | `{start, onboarded, lastBackup, backupSnooze, lastIcs, act2, rowSplit}` | boot, backup |
| `ui` | `{fold, seen, text, fv}` | fold state, tour, text size, macro/micro toggle |

Hardcoded personal values found in logic (not in `profile`): the physique target `ARCH` (FFMI 22.5, 10-12% body fat, 1.6
shoulder:waist), the strength-standard multipliers in `LIFTS`, the habit list `HABITS`, protein at 2.0/2.2 g/kg, and the +10% / -15%
goal adjustment. Defaults for age 22 and height 178 cm exist but onboarding overwrites them. These are candidates to move into
`profile` when other people use the app (see plan).

## 3. Service worker, manifest, updates

- **Strategy (verified)**: precache the nine files on install; on every GET, **network first with a 2.5 s race**: if the network
  answers in time it wins and refreshes the cache, otherwise the cached copy is served and the fetch finishes in the background.
  Offline falls back to cache, and to `index.html` for unknown URLs.
- **Updates (verified)**: `skipWaiting()` + `clients.claim()`, old caches deleted on activate. Because of network-first, new code
  normally shows on the next launch with signal, with no cache-name bump needed. There was **no update prompt**: if the 2.5 s timer
  won, you ran the old code with no sign a new one had been fetched. The README's "caches hard, reopen twice" note was out of date.
- **Manifest (verified)**: name, `start_url` and `scope` `./`, `display: standalone`, portrait, theme colour, 192 and 512 icons (the
  512 doubles as maskable). Chromium's installability requirements are met. iOS uses the `apple-touch-icon` (an inline 180 px PNG)
  and the `apple-mobile-web-app-*` tags. **Untested on a real iPhone or Android phone** (I only have headless Chromium).

## 4. Bugs and risks, ranked

### Data-loss risks (fixed in this branch, each with a test)

| # | What | Evidence | Fix |
|---|---|---|---|
| 1 | **Two open copies overwrite each other.** Each tab holds its own `S` and saves the whole thing. Log a weigh-in in tab A, tick anything in tab B, and A's weigh-in is gone. Same for the installed app plus a browser tab on Android. | Reproduced: A's entry lost after B saved | A tab that sees the save change underneath it (storage event, or on coming back to the foreground) stops saving and reloads |
| 2 | **Boot wrote to storage before it knew the data could be drawn.** `bootApp` saved the merged, normalised state first and rendered second. With a save that parses but breaks a screen, the recovery screen said "nothing has been deleted" after the original had already been overwritten, and DOWNLOAD MY RAW DATA gave the rewritten copy. | Reproduced with `{"profile":null,"days":null}`: stored value changed, then recovery screen | Nothing is written until the first render succeeds. The exact loaded string is kept and is what the daily snapshot and the pre-migration backup store |
| 3 | **A saved value that is valid JSON but not an object** (`5`, `[1,2]`, `"hi"`) was treated as "no data": the app started blank and overwrote it. | Reproduced | Treated as damaged: recovery screen, nothing overwritten |
| 4 | **No schema version.** Migrations were one-off flags scattered through `bootApp`; data saved by a newer build could be silently rewritten by an older cached build (the 2.5 s race can serve one). Old backups were only migrated on the next reload after import. | Read | `schemaVersion` + ordered migration runner; raw pre-migration snapshot; every screen is drawn before the migrated data is saved; newer-than-known data is refused, not overwritten; imports run the same migrations |
| 5 | **The service worker cached error responses.** Any response, including a 404 or 503 from GitHub Pages during a deploy or outage, replaced the good cached file and would then be served offline. A network error page also beat a good cached copy. | Read; test written | Only `ok` responses are cached, and a failed response falls back to the cached file |
| 6 | **Restore could only replace.** No preview of what is in a file, no merge. | Read | Preview (counts and date range, file vs this phone) and MERGE (adds what this phone is missing, never overwrites a day that has data) |

### Correctness bugs (fixed)

| # | What | Fix |
|---|---|---|
| 7 | **"Today" could stay yesterday indefinitely.** The date rolls over by reloading at midnight or when the app returns to the foreground, unless you are "busy". Busy included any half-typed set or tapped RPE chip that was never logged, so one stray draft blocked the reload forever. With the app left in memory overnight (normal for an installed iOS app), Today showed "viewing another day" and the weigh-in form defaulted to yesterday's date. | Busy now means "a round timer is running, or you touched the app in the last two minutes" |
| 8 | **Reading created data.** `foodTotals()` went through `day()`, which creates an empty record, so opening Ledger added empty days to the save (1 day became 7 in the probe). Harmless to totals but it grows the save and muddies merge. | `foodTotals` reads without creating |
| 9 | **No update prompt** (section 3). | The worker tells the page when a newer `index.html` arrived after an old one was served; the app shows one line. It never reloads on its own |

### Accessibility and mobile (fixed where cheap, rest in Phase 3)

| # | What | Status |
|---|---|---|
| 10 | Tap targets: 30 controls on Today were under 40 px: every exercise tool button (26 px tall), the RPE chips (35 × 32), the macro/micro toggle (26), the fold headers (13 px tall hit area), the header icons (29 × 33), the steppers (34 wide). The brief's first usage moment is one-handed logging. | Fixed: 40 px minimum on those, 44 px steppers |
| 11 | Focus ring was 1 px. | 2 px |
| 12 | Type as small as 7.5 px (`--fs-nano`), 8.5 and 9 px labels. `--faint` on the panel colour is about 4.3:1, under AA for text this small. | Phase 3 (type scale) |
| 13 | Persistent storage was never requested, so the browser may evict data under storage pressure. | `navigator.storage.persist()` requested at boot (best effort; iOS mostly ignores it for non-installed sites) |

### Checked and found sound (verified by reading and by the existing tests)

- **Dates**: every date is a local `YYYY-MM-DD` built with `setDate` / `new Date(y, m, d)`, never `toISOString` or string parsing, so
  there is no UTC off-by-one and DST days are safe. New self-check runs the date helpers and the streak across both 2026 US DST
  changes.
- **Units**: one factor (2.20462) everywhere, kg stored, display rounded to 0.5 lb / 0.25 kg; logged weights are shown exactly and
  only suggestions are snapped to loadable plates.
- **e1RM**: Epley `w × (1 + r/30)`, 1 rep = the weight itself, reps capped at 10. Used consistently for PRs, best sets, standards.
- **Nutrition math**: Mifflin-St Jeor BMR × daily-life factor + per-day training cost at net MET; protein 2.0 g/kg (2.2 cutting), fat
  27% of calories clamped to 0.8-1.2 g/kg, carbs the remainder. Malformed food rows cannot produce NaN.
- **Corrupt JSON**: an unparseable save shows the recovery screen and is not overwritten.
- **Quota**: a failed save raises a toast (at most once a minute). Two years of heavy use is about 800 KB, well under the limit.
- **Import**: `__proto__` keys dropped, shape checked, every screen drawn before commit, undo snapshot taken first.
- **Performance**: 5-25 ms per render with two years of data (existing guard test).
- **XSS**: user and imported strings go through `esc()` before reaching `innerHTML` at every site I read.

### Known and left alone (deliberate)

- A workout that crosses midnight is split across two dates.
- Notifications only fire while the app is open (a web app cannot wake the phone; the calendar export is the reliable route).
- A deploy can briefly pair a new `index.html` with an older cached data file. The data files only gain rows, so nothing breaks.
- `handleClick` still calls `day(VD())` up front, so tapping around a date creates its (empty) record. Only the read path was fixed.
- "THIS WEEK" in the weekly review is a rolling 7 days, not Monday to Sunday.
- The streak counts a day with one ticked block or two habits. Whether that is the right bar is a Phase 5 design question.

## 5. Opportunities

### Quick wins (not yet done, small)

- Include progress photos in the backup file (Phase 4 needs it anyway).
- A source comment names the film franchise the physique target came from; nothing user-visible, removed in this branch.
- Move `ARCH`, protein g/kg and goal adjustments into `profile` so a second user can change them without editing code.

### Deeper (Phases 3-5, see the plan in the hand-off message)

- No time-series view of e1RM per lift, no plateau detection, no weekly tonnage or acute:chronic load, no nutrition-versus-results
  view, no report card beyond four tiles, no readiness model.
- Bodyweight "trend" is a 7-day mean of weigh-ins, not an EWMA.
- Progress photos exist only inside the 90-day challenge (weekly check-ins, front/side/back). There is no standalone photo timeline.
- Motivation is one briefing line and a streak number. Nothing is tied to performance.

## 6. Change log for this branch

See the commits. Summary is kept current at the end of each phase.

### Phase 1 + 2 (done)

- `schemaVersion` and migration runner (`SCHEMA`, `MIGRATIONS`, `migrate()`); existing one-off migrations moved into step 0→1 unchanged.
- Raw pre-migration snapshot (`pre-v<n>-<ms>` in IndexedDB, last two kept); daily snapshot now stores the exact loaded string.
- Boot writes nothing until the first render succeeds; non-object saves and newer-schema saves go to the recovery screen untouched.
- Restore: preview of file versus phone, and MERGE alongside REPLACE.
- Two-copy protection (storage event + foreground check).
- Service worker: no caching of failed responses, fallback to cache on a failed response, update notice. Cache bumped to `forge-v32`.
- Date rollover no longer blocked by stale drafts.
- `foodTotals` no longer creates day records.
- Tap targets, focus ring, persistent-storage request.
- `tests/realdata.js`: run a real backup through boot, every screen, and export → wipe → import, with before/after counts.
- New tests: `tests/safety-net.test.js` (12) and an outage test in `tests/offline.test.js`. Suite: 210 passing (197 before this branch).

### Deliberately skipped

- No refactor of the single-file structure, no framework, no build step.
- `window.storage` dead code left in place (harmless, and removing it is a diff with no user benefit).
- Manifest `id` not added: changing identity fields on an already-installed app risks the phone treating it as a different app.

### Untested (needs a real device)

- iOS Safari install, safe areas and keyboard behaviour; Android install prompt.
- The share-sheet path of BACK UP NOW (headless Chromium has no share sheet; the download path is tested).
