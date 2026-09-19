# UAT Sheet: VECTOR (live)

**Rule.** Point every arrow so each numbered cell is the first one that exactly that many arrows reach. Board 6x6. WIN/LOSS. Up to 3 submissions. Input: tap a cell to set/cycle its arrow. Tiers Excellent to Rough; Not solved if all submissions spent unsolved.

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

## 2A. Core play

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 2A1 | Open /vector/ | 6x6 grid with numbered target cells and blank arrow cells | Desktop |  |  |  |
| 2A2 | Tap a blank cell | an arrow appears; tapping cycles direction | Desktop |  |  |  |
| 2A3 | Fill the board and submit | if correct, solved; if not, a submission is spent and feedback shows | Desktop |  |  |  |
| 2A4 | Submit with the board incomplete | rejected with a readable reason (finish placing first); no submission spent | Desktop |  |  |  |
| 2A5 | Spend all three submissions without solving | game ends Not solved (a loss), result screen appears | Desktop |  |  |  |
| 2A6 | Solve within three submissions | win; result screen shows the tier | Desktop |  |  |  |

## 2B. Result, share, stats

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 2B1 | Reach result after a win | tier name, share, countdown | Desktop |  |  |  |
| 2B2 | Reach result after a loss | shows Not solved, share still works, countdown | Desktop |  |  |  |
| 2B3 | Share (desktop) | copied confirmation; block pastes with title, up to 3 rows, URL | Desktop |  |  |  |
| 2B4 | Share (phone) | native share sheet with the block | iPhone HTTPS |  |  |  |
| 2B5 | Stats modal | played, won, win %, streak, max streak, 4-bucket histogram | Desktop |  |  |  |
| 2B6 | Confirm a loss did not increment or award streak | streak logic correct on loss | Desktop |  |  |  |

## 2C. Persistence, lifecycle, first-time

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 2C1 | Place arrows, spend one submission, reload | board, arrows, and remaining submissions restored | Desktop |  |  |  |
| 2C2 | Finish today, reopen | finished result and countdown, not a fresh board | Desktop |  |  |  |
| 2C3 | Clear site data, open VECTOR | help panel with the five-cell strip worked example, one screen, dismissible | Desktop |  |  |  |
| 2C4 | Reopen help from header | reopens | Desktop |  |  |  |

## 2D. Mobile fit and accessibility

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 2D1 | 360px view | 6x6 grid, clues and arrows legible, no sideways scroll | iPhone |  |  |  |
| 2D2 | Large viewport, both orientations | layout holds | iPad |  |  |  |
| 2D3 | Keyboard play | arrow keys move focus, a key sets/cycles the arrow, submit reachable, visible focus | Desktop |  |  |  |
| 2D4 | Meaning without color | placed arrows, clues, and solved/unsolved distinguishable without color alone | Desktop |  |  |  |
| 2D5 | Screen reader | clue cells, blanks, placed arrows, and submit result announced | Desktop |  |  |  |

## Result log

| Date | Tester | Sections run | Overall Pass/Fail | Defects filed |
|---|---|---|---|---|
|  |  |  |  |  |

## Recording a pass into the gate

A full green sheet on the primary targets is this game's `manual-mobile-check` gate evidence. Add it as a `manual` step in this game's `GAME_PLANS` row in `tools/certify.ts`, run `npm run certify`, and commit `data/vector/certification.json`.
