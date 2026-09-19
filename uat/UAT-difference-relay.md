# UAT Sheet: DIFFERENCE RELAY (built, planned)

**Rule.** Order six numbers so every neighbouring pair differs by the amount marked in the gap between them. Some gaps are hidden (shown as ?); you learn them by running the relay: a baton crosses each gap while the two neighbours differ by that amount and stops at the first station where they do not, telling you how far it reached. WIN/LOSS, up to 6 runs. Imperfect information. Tiers Excellent/Great/Good/Rough by run count against this board's par; seven distribution buckets, Solved in 1 through 6 then Failed. Input: the list cursor (tap plus keyboard: focus, select, swap, cancel) with an r key to run the relay. REACHABLE ONLY through the harness build (E3), since it is planned.

Tick each row: put an x in Pass or Fail and note anything off. A game passes UAT only when every row passes on at least its primary target.

## Shared setup (run once before any sheet)

| # | Action | Confirm |
|---|---|---|
| E1 | npm ci in the repo (your node_modules is a Windows install; reinstall on the test machine) | installs clean |
| E2 | npm run build then npm run preview -> http://localhost:4173/ | hub loads with three live cards |
| E3 | ROTATE LOCK only: npm run harness -> http://localhost:4173/ (harness build includes planned games and serves /rotate-lock/) | ROTATE LOCK reachable |
| E4 | Device (LAN, layout only): npm run preview -- --host, open the printed Network URL on phone/iPad | site loads on device |
| E5 | Device (HTTPS, for share + offline): Cloudflare Pages preview URL or a TLS tunnel in front of preview | site loads over https on device |
| E6 | Difficulty-feel: append ?d=YYYY-MM-DD to any game URL to jump the local day (dev/harness builds only) | board changes to that date's puzzle |

Targets: Desktop = Chrome on the computer; iPhone / iPad = iOS Safari. HTTPS flags a row that must run over the secure route (E5), not plain LAN. Glyph rendering is out of scope here; it lives in the separate manual-check run sheet.

## DR-A. Core play

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| DRA1 | Open /difference-relay/ from the harness build | a row of six numbers with five gaps between them; some gaps show a difference, some show ?; a Run control and a run counter (6 runs) | Desktop |  |  |  |
| DRA2 | Select a number, then select another | the two numbers swap positions; the order updates; selection clears | Desktop |  |  |  |
| DRA3 | Reorder the row and press Run (or the r key) | the baton crosses gaps left to right and stops at the first station whose pair does not match its gap; the reached station is reported | Desktop |  |  |  |
| DRA4 | Read a stopped relay against a hidden (?) gap | where the baton stops teaches the hidden constraint; the ? region is what you can deduce from the stop point | Desktop |  |  |  |
| DRA5 | Run the exact same order twice without changing it | rejected: you already ran that order, change it first; no run consumed | Desktop |  |  |  |
| DRA6 | Achieve an order where the baton crosses all five gaps | win; the relay reaches the final station | Desktop |  |  |  |
| DRA7 | Spend all six runs without a full crossing | game ends Failed (loss), result screen appears | Desktop |  |  |  |
| DRA8 | Try to run after the game is over | rejected: the relay is already finished for today | Desktop |  |  |  |

## DR-B. Result, tier, share, stats

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| DRB1 | Reach the result screen after a win | tier (Excellent/Great/Good/Rough) by run count against par, the run count, share button, countdown | Desktop |  |  |  |
| DRB2 | Solve in one run on the easy first board, or an easy day via ?d= | best tier; Solved in 1 bucket (distinguished bucket 0) | Desktop |  |  |  |
| DRB3 | Reach the result after a loss | shows Failed, share still works, countdown | Desktop |  |  |  |
| DRB4 | Tap the tier to reveal the exact figure | run count against par shown only on tap, never during play | Desktop |  |  |  |
| DRB5 | Share (desktop) | copied confirmation; block pastes as an attempt ladder (one row per run, up to 6), title carries tier and run count, URL present | Desktop |  |  |  |
| DRB6 | Share (phone) | native share sheet opens with the block | iPhone HTTPS |  |  |  |
| DRB7 | Confirm the shared block is spoiler-free | rows show only how far each run's baton reached, never a number, a difference, or a position | Desktop |  |  |  |
| DRB8 | Stats modal | played, won, win %, streak, max streak, 7-bucket histogram (Solved in 1..6, Failed), bucket 0 distinguished | Desktop |  |  |  |
| DRB9 | Confirm a loss did not award or extend streak | streak logic correct on loss | Desktop |  |  |  |

## DR-C. Persistence, lifecycle, first-time

> Unlike POKER GRID, DIFFERENCE RELAY supplies a fixed easy first-session board (range-wide, one hidden gap, par 1). A first-timer plays that before today's real puzzle.

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| DRC1 | Make a run or two, reload mid-game | current order and every prior run and its reached station restored exactly | Desktop |  |  |  |
| DRC2 | Reorder without running, reload | the in-progress order is restored, runs remaining unchanged | Desktop |  |  |  |
| DRC3 | Finish today, reopen the game | finished result and countdown (WAITING_FOR_NEXT), not a fresh board | Desktop |  |  |  |
| DRC4 | Clear site data, open /difference-relay/ | the fixed easy practice board with the how-to panel over it, and a line that it does not count | Desktop |  |  |  |
| DRC5 | Finish the practice board, continue | a panel saying it did not count (no grade, no streak), then today's real board loads | Desktop |  |  |  |
| DRC6 | Reopen help from the header icon later | panel reopens | Desktop |  |  |  |
| DRC7 | ?d= to a future day then back to today | never crashes, no streak awarded for a skipped day | Desktop |  |  |  |

## DR-D. Mobile fit and accessibility (the gating section)

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| DRD1 | 360px view | six numbers, five gaps, run counter, and Run button legible with no sideways scroll | iPhone |  |  |  |
| DRD2 | Touch targets | each number slot and the Run button at least 44x44 px (Run is 44 px tall per the design) | iPhone |  |  |  |
| DRD3 | Large viewport, both orientations | layout holds | iPad |  |  |  |
| DRD4 | Keyboard parity via the list cursor | Tab reaches the row, arrows move focus (Home/End jump), Enter selects and swaps, Escape cancels a selection, r runs the relay; visible focus throughout | Desktop |  |  |  |
| DRD5 | Screen reader on the list | focused number, its selected/pressed state, a swap, and the reached station after a run are announced | Desktop |  |  |  |
| DRD6 | Meaning without color | numbers, known vs hidden (?) gaps, the baton's stop point, and win/fail distinguishable without color alone | Desktop |  |  |  |
| DRD7 | Header renders the full name at 360px | DIFFERENCE RELAY shows whole, not truncated | iPhone |  |  |  |
| DRD8 | Its own accent renders | the game draws its own hue 68 accent, not the default | Desktop |  |  |  |

## DR-E. Suite integration

> Run once on the hub. Applies only after the game is live; while it is planned it appears only in the harness build.

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| DRE1 | Hub shows correct per-game status once live | not started / in progress / finished-with-result | Desktop |  |  |  |
| DRE2 | Its hub card accent | distinct hue 68 accent on the card | Desktop |  |  |  |
| DRE3 | Contributes one row to the daily card | one glyph for DIFFERENCE RELAY, same width as other games' rows | Desktop |  |  |  |
| DRE4 | Offline: load then go offline, reload | today's board still renders and plays from cache | HTTPS |  |  |  |

## Result log

| Date | Tester | Sections run | Overall Pass/Fail | Defects filed |
|---|---|---|---|---|
|  |  |  |  |  |

## Recording a pass into the gate

A full green sheet on the primary targets is this game's `manual-mobile-check` gate evidence. Add it as a `manual` step in this game's `GAME_PLANS` row in `tools/certify.ts`, run `npm run certify`, and commit `data/difference-relay/certification.json`.
