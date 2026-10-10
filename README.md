# FORGE — deploy + data guide

Seven files, no build step. `index.html` is the app; `foods-db.js` is the big food library and `exercises-db.js` the exercise library it loads.

## Deploy (GitHub Pages, ~4 min)

1. New public repo, e.g. `forge`.
2. Upload all seven files to the root.
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

Insurance: **Codex → Export backup** (copies JSON to clipboard + downloads a file),
**Import** to restore. Do it monthly.

One wrinkle after updates: the service worker caches hard. If new code doesn't appear,
fully close the app and reopen, or reopen twice.

## Customizing

All content is plain data at the top of the script in `index.html`: `WEEK_STD` and the program variants `D8`/`D9` (training days, blocks, `steps`, `prog` rules; the Forge Builder program is the Mon/Tue/Thu/Fri Lower A / Upper A / Lower B / Upper B split), `FOODS` (the calorie database — add your staples),
`BOOKS`, `SKILLS`, `CAPITAL`, `HABITS`, `NEWS`, `PHASES`, `ORDERS`, `SPORTS` (the MET value
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

### Custom workouts, fighting and the exercise library (`exercises-db.js`)

About 6,500 movements in `EXLIB`, grouped as `[muscle, equipment, kind, [names]]` (barbell/dumbbell/machine/cable/bodyweight
lifts, carries, plyos, cardio, sports, combat drills, mobility). The kind decides what a set records: weight x reps,
bodyweight reps (+ optional added weight), timed holds, cardio time + distance, or loaded carries. Append a name to a group to
add one, or use CREATE EXERCISE in the picker (stored in your backup, not the file).

On **Today**, every day has ADD WORKOUT (lift days say EDIT WORKOUT and set the planned session aside, which leaves the
program's progression untouched; KEEP BOTH shows the plan too) and ADD FIGHTING (discipline, minutes, rounds, effort, what
worked / got you caught). Nothing is prescribed in a custom workout: each exercise shows what you did the last time you logged it
anywhere (30 push-ups last week means 30 is the benchmark and the prefill), flags PRs, and sets from the program's own lifts count
as history for the matching library exercise (`EXLINK`). Rest timer, plate math for barbell lifts, favorites, routines and a
history / lift-PR screen (ALL WORKOUTS link under the workout area, or Codex) are included. Custom data lives in `S.cust`,
`S.fights`, `S.routines`, `S.myex` and `S.cpref`, so Export / Import covers it.
