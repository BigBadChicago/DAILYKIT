# UAT Sheet: ROTATE LOCK (built, planned)

**Rule.** Order and rotate the route pieces so the path takes every marked turn and ends at the lock. WIN/LOSS (open the lock or jam). Graded by move count against par, five buckets: At par, 1 to 4 over, 5 to 10 over, 11 or more over, Jammed. Input: custom, via the list cursor (tap plus keyboard: focus, select, swap, rotate, cancel). REACHABLE ONLY through the harness build (E3). Its manual mobile check is the one gate step keeping it from going live, so this is the highest-stakes sheet.

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

## 4A. Core play

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 4A1 | Open /rotate-lock/ from the harness build | route pieces and tray render; the lock and marked turns visible | Desktop |  |  |  |
| 4A2 | Reorder two pieces | the order changes; the path preview updates | Desktop |  |  |  |
| 4A3 | Rotate a piece | it turns a quarter; move count increments | Desktop |  |  |  |
| 4A4 | Build a path that hits every marked turn and reaches the lock | lock opens; win | Desktop |  |  |  |
| 4A5 | Reach a state with no route that opens the lock | ends Jammed (loss) | Desktop |  |  |  |
| 4A6 | Solve exactly at par | result reads At par | Desktop |  |  |  |
| 4A7 | Solve well over par | result reads the correct over-par bucket | Desktop |  |  |  |

## 4B. Result, share, stats

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 4B1 | Result after a win | bucket label + move count (At par, N moves), share, countdown | Desktop |  |  |  |
| 4B2 | Result after a jam | ..., jammed, share works | Desktop |  |  |  |
| 4B3 | Share (desktop) | block pastes with title, move-token rows, URL | Desktop |  |  |  |
| 4B4 | Share (phone) | native share sheet with the block | iPhone HTTPS |  |  |  |
| 4B5 | Stats modal | played, won, win %, streak, max streak, 5-bucket histogram | Desktop |  |  |  |

## 4C. Persistence, lifecycle, first-time

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 4C1 | Make moves, reload | piece order, rotations, and move count restored | Desktop |  |  |  |
| 4C2 | Finish, reopen | finished result and countdown | Desktop |  |  |  |
| 4C3 | Clear site data, open ROTATE LOCK | help panel worked example, one screen, dismissible | Desktop |  |  |  |

## 4D. Mobile fit and accessibility (the gating section)

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 4D1 | 360px view | route pieces and tray legible at mobile density, no sideways scroll | iPhone |  |  |  |
| 4D2 | Touch targets | every piece and control at least 44x44 px | iPhone |  |  |  |
| 4D3 | Large viewport, both orientations | layout holds | iPad |  |  |  |
| 4D4 | Keyboard parity via the list cursor | Tab to the list, arrows move focus, select, swap, rotate, Escape cancels; visible focus | Desktop |  |  |  |
| 4D5 | Screen reader on the list | focused piece, its pressed/selected state, and swaps announced | Desktop |  |  |  |
| 4D6 | Meaning without color | route, turns, lock, and win/jam distinguishable without color alone | Desktop |  |  |  |
| 4D7 | Header renders the full name at 360px | ROTATE LOCK is whole, not ROTATE ... (corrected defect; confirm it held) | iPhone |  |  |  |
| 4D8 | Its own accent color renders | ROTATE LOCK draws its magenta accent, not the default blue (corrected defect) | Desktop |  |  |  |

## 4E. Suite integration (run once across all four, on the hub)

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 4E1 | Hub shows correct per-game status | not started / in progress / finished-with-result for each live game | Desktop |  |  |  |
| 4E2 | Each game's own accent renders on its hub card | four distinct card accents, not all blue | Desktop |  |  |  |
| 4E3 | Suite streak (any one game finished per day) shown prominently | present and correct | Desktop |  |  |  |
| 4E4 | Daily card share, one game finished and others not | every row same width, one glyph per game | Desktop |  |  |  |
| 4E5 | Cross promotion after finishing a game | one line, least-recently-played game, dismissible, only after completion | Desktop |  |  |  |
| 4E6 | Offline: load hub + a game, go offline, reload | hub cards and today's board still render from cache | HTTPS |  |  |  |
| 4E7 | Offline first-ever visitor | plain today's puzzle unavailable message, never a board | HTTPS |  |  |  |

## Result log

| Date | Tester | Sections run | Overall Pass/Fail | Defects filed |
|---|---|---|---|---|
|  |  |  |  |  |

## Recording a pass into the gate

A full green sheet on the primary targets is this game's `manual-mobile-check` gate evidence. Add it as a `manual` step in this game's `GAME_PLANS` row in `tools/certify.ts`, run `npm run certify`, and commit `data/rotate-lock/certification.json`.

For ROTATE LOCK that pass is also the trigger to flip its registry row to `live` and bump `ENGINE_VERSION` to 3.
