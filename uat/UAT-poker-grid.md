# UAT Sheet: POKER GRID (live)

**Rule.** Clear the board with connected five-card poker hands. Board 5 wide x 7 tall, 35 cards, gravity down, no refill. Up to 7 hands. NO failure state: play ends when no legal five-card connected hand remains. Graded by tier (Excellent, Great, Good, Fair, Rough) and by cards remaining; a full clear is Perfect Clear. Input: drag a connected path of five, or tap to add and tap to remove.

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

## 1A. Core play

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 1A1 | Open /poker-grid/ | 35 cards in a 5x7 grid, all faces legible | Desktop |  |  |  |
| 1A2 | Drag a path across five orthogonally adjacent cards forming a pair or better | selection highlights along the drag; release accepts the hand | Desktop |  |  |  |
| 1A3 | Watch after a clear | the five cards vanish, columns collapse downward, no gaps under a card, no new cards enter | Desktop |  |  |  |
| 1A4 | Tap five cards one at a time to build a hand, then tap one to remove it | tap adds, tap removes, selection count visible | Desktop |  |  |  |
| 1A5 | Attempt a five-card selection that is only high card (no pair) | rejected with a readable reason; board unchanged | Desktop |  |  |  |
| 1A6 | Attempt a non-connected five-card set (a gap in the path) | rejected; board unchanged | Desktop |  |  |  |
| 1A7 | Attempt a selection of four or six cards | rejected; five required | Desktop |  |  |  |
| 1A8 | Play until no legal hand remains | play ends on its own, result screen appears, no error | Desktop |  |  |  |

## 1B. Result, tier, share

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 1B1 | Reach the result screen | tier name (Excellent/Great/Good/Fair/Rough), score, cards cleared, share button, countdown | Desktop |  |  |  |
| 1B2 | Clear the entire board (7 clean hands; use ?d= to hunt an easy day) | result reads Perfect Clear and the perfect-clear histogram bucket | Desktop |  |  |  |
| 1B3 | Tap the tier to reveal the exact figure | percentage against best-known appears only on tap, never during play | Desktop |  |  |  |
| 1B4 | Press Share on desktop | copied confirmation; paste gives title + rows + dailykit.providentia.games | Desktop |  |  |  |
| 1B5 | Press Share on the phone | native share sheet opens containing the block | iPhone HTTPS |  |  |  |
| 1B6 | Open the stats modal (auto after game, and from the header) | played, streak uses played not won here, max streak, histogram by cards remaining in fives with perfect clear distinct | Desktop |  |  |  |

## 1C. Persistence and lifecycle

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 1C1 | Make several hands, reload mid-game | board and progress restored exactly | Desktop |  |  |  |
| 1C2 | Make a hand, hard-close the tab, reopen | progress persisted (save on every mutation) | Desktop |  |  |  |
| 1C3 | Finish today, reopen the game | shows finished result and countdown (WAITING_FOR_NEXT), not a fresh board | Desktop |  |  |  |
| 1C4 | ?d= to a future day, then back to today | never crashes, no streak awarded for a skipped day | Desktop |  |  |  |

## 1D. First-time experience

> The fixed easy first-session board is not implemented for POKER GRID; a first-timer gets the auto-opened help panel instead. 1D1 tests the help panel, not a practice board. Known gap, not a UAT failure.

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 1D1 | Clear site data, open /poker-grid/ | help panel opens automatically; one screen; dismissible in one tap | Desktop |  |  |  |
| 1D2 | Reopen help from the header icon later | panel reopens | Desktop |  |  |  |
| 1D3 | Check stats after first-ever visit before finishing | games played reads 0 | Desktop |  |  |  |

## 1E. Mobile fit and accessibility

| # | Step | Expected | Target | Pass | Fail | Notes |
|---|---|---|---|:---:|:---:|---|
| 1E1 | View at 360px wide | all 35 faces legible, no sideways scroll | iPhone |  |  |  |
| 1E2 | Mid-drag on touch | the selection is visible under where the thumb sits | iPhone |  |  |  |
| 1E3 | View on the large viewport, both orientations | layout holds, nothing stranded or clipped | iPad |  |  |  |
| 1E4 | Full keyboard play (no pointer) | can select, accept, and clear a hand; visible focus throughout | Desktop |  |  |  |
| 1E5 | Suit and result meaning without color | suits and tiers distinguishable without relying on color alone | Desktop |  |  |  |
| 1E6 | Screen reader on a state change | acceptance or rejection is announced | Desktop |  |  |  |

## Result log

| Date | Tester | Sections run | Overall Pass/Fail | Defects filed |
|---|---|---|---|---|
|  |  |  |  |  |

## Recording a pass into the gate

A full green sheet on the primary targets is this game's `manual-mobile-check` gate evidence. Add it as a `manual` step in this game's `GAME_PLANS` row in `tools/certify.ts`, run `npm run certify`, and commit `data/poker-grid/certification.json`.
