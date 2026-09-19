# UAT Sheet: CIPHER (live)

**Rule.** Break a four-symbol code in six guesses from exact and misplaced counts. WIN/LOSS. 6 guesses. Input: tap to enter symbols across four slots, Enter to submit, Backspace to erase. Tiers Excellent to Rough; Not solved at six failed guesses.

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

## 3A. Core play

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 3A1 | Open /cipher/ | four empty slots and a symbol input; up to six guess rows | Desktop |  |  |  |
| 3A2 | Enter four symbols and submit | a guess row records with exact and misplaced counts (never which slot) | Desktop |  |  |  |
| 3A3 | Submit fewer than four symbols | rejected with a readable reason; no guess consumed | Desktop |  |  |  |
| 3A4 | Backspace on a partial entry | last symbol erased | Desktop |  |  |  |
| 3A5 | Guess the exact code | win; result screen | Desktop |  |  |  |
| 3A6 | Use all six guesses without solving | ends Not solved (loss); result screen | Desktop |  |  |  |

## 3B. Result, share, stats

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 3B1 | Result after a win | tier, Solved in N, share, countdown | Desktop |  |  |  |
| 3B2 | Result after a loss | Not solved, share works, countdown | Desktop |  |  |  |
| 3B3 | Share (desktop) | title matches CIPHER #N <Tier>; rows are feedback pairs sorted so no cell maps to a slot; URL present | Desktop |  |  |  |
| 3B4 | Share (phone) | native share sheet with the block | iPhone HTTPS |  |  |  |
| 3B5 | Stats modal | played, won, win %, streak, max streak, 7-bucket histogram | Desktop |  |  |  |
| 3B6 | Confirm no slot position is readable from the shared block | rows reveal counts only, never position | Desktop |  |  |  |

## 3C. Persistence, lifecycle, first-time

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 3C1 | Make two guesses, reload | all prior guesses and their feedback restored | Desktop |  |  |  |
| 3C2 | Finish today, reopen | finished result and countdown | Desktop |  |  |  |
| 3C3 | Clear site data, open CIPHER | help panel worked example, one screen, dismissible | Desktop |  |  |  |
| 3C4 | Reopen help from header | reopens | Desktop |  |  |  |

## 3D. Mobile fit and accessibility

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 3D1 | 360px view | slots, symbol input, and guess history legible, no sideways scroll | iPhone |  |  |  |
| 3D2 | Large viewport, both orientations | layout holds | iPad |  |  |  |
| 3D3 | Keyboard play | enter symbols, Enter submits, Backspace erases, visible focus | Desktop |  |  |  |
| 3D4 | Meaning without color | exact vs misplaced feedback distinguishable without color alone | Desktop |  |  |  |
| 3D5 | Screen reader | each guess's feedback and win/loss announced | Desktop |  |  |  |

## Result log

| Date | Tester | Sections run | Overall Pass/Fail | Defects filed |
|---|---|---|---|---|
|  |  |  |  |  |

## Recording a pass into the gate

A full green sheet on the primary targets is this game's `manual-mobile-check` gate evidence. Add it as a `manual` step in this game's `GAME_PLANS` row in `tools/certify.ts`, run `npm run certify`, and commit `data/cipher/certification.json`.
