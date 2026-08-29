# FORGE — deploy + data guide

Five files, no build step. `index.html` is the entire app.

## Deploy (GitHub Pages, ~4 min)

1. New public repo, e.g. `forge`.
2. Upload all five files to the root.
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

All content is plain data at the top of the script in `index.html`: `WEEK` (training days,
blocks, `steps`, `prog` rules), `FOODS` (the calorie database — add your staples),
`BOOKS`, `SKILLS`, `CAPITAL`, `HABITS`, `NEWS`, `PHASES`, `ORDERS`, `SPORTS` (the MET value
per sport used to cost calendar commitments tagged Physical — add a sport your gym does that
isn't listed, or tune a number if it's over/under-crediting you).

`FOODS_VENUES`, right after `FOODS`/`FOODS_MORE`, is where real menu items live — a cafeteria,
a dining hall, a restaurant chain — so you can log "the whole sandwich" instead of guessing at
ingredients. Same `[name, kcal, protein, carbs, fat]` shape as `FOODS`; name it
`"Venue — Item (portion)"` so searching the venue groups its items together. A Panera starter
set is in there now — add your own cafeteria/restaurants the same way, one line per item.
