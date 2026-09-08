# PHASE 8 PLAN, THE REMAINDER

Phase 8 was recorded as done in the phase log and delivered only the dependency
layer check, the CI wiring, and the project runbook. Phase 10 found the gap when
it put the suite in a browser for the first time. This document is the execution
plan so that conversation starts writing code in its first response.

Read this plus `ARCHITECTURE.md` and `BACKLOG.md`. Nothing else.

## 1. Status of every Phase 8 deliverable

Phase 8 is defined as: service worker, offline behavior, performance pass
against the budget, share string verification across every target platform,
onboarding, archive, stats, changelog, and an about page.

| Deliverable | State | Note |
|---|---|---|
| Service worker | **Done** | src/sw/sw.ts, generated precache list, cache name carrying a build id. |
| Offline behavior | **Done** | Demonstrated in headless Chromium with the server stopped: the hub renders from cache and POKER GRID plays a real day from the cached chunk. |
| Performance pass | **Done** | Bytes now asserted in CI by npm run budget. Time to interactive measured under 4x CPU throttling and recorded in ARCHITECTURE.md. |
| Share verification per platform | **Written down, not run** | MANUAL-CHECKS.md lists every platform, client, and pass condition, with a results table. It has not been run. |
| Onboarding | **Done** | POKER GRID supplies a fixed practice board, the TUTORIAL state is reachable, and nothing about that session is recorded. |
| Archive | **Done** | Built in Phase 10. Paging is not wired, logged in BACKLOG. |
| Stats | **Done** | Panel, histogram, suite streak row. |
| Changelog | **Done** | src/shell/changelog.ts, one modal on the first load after an update, per game in storage and scoped per entry. |
| About page | **Done** | /about/, zero JavaScript, linked from the hub footer. |
| Favicon and web manifest | **Done** | static/icon.svg plus 192 and 512 rasters, site.webmanifest, icon links on every page, ASSETS.md rows. |

## 2. Order of work, and why

**1. Favicon, web manifest, about page.** Half an hour, no design decisions, and
they are the only items that must exist before a service worker can list what to
cache. Doing them first means the cache manifest is written once.

**2. The service worker.** The phase's centre of gravity. Section 3 below.

**3. Offline behavior end to end.** Make `boot.ts`'s unavailable path rare
rather than normal, and prove it with the network disabled.

**4. The changelog.** Small, and it depends on nothing.

**5. `firstSessionPuzzle` for POKER GRID.** Charter decision 2. A fixed easy
board, not today's puzzle, played before the first real one, never shareable and
never counted. This is the first use of the `TUTORIAL` state and of the
contract's difficulty override seam, so it is also a contract exercise, which is
why it belongs before Phase 11 rather than after.

**6. Performance pass under throttling.**

**7. The Section 10.7 manual checklist**, written down and then run.

## 3. The service worker, decided in advance

These are the decisions that would otherwise eat the first half of that
conversation. Settle them here, argue only if implementation contradicts them.

**Precondition already in place.** The build gives every asset a stable URL and
splits them into two lifetimes: `assets/engine-v<N>.js` and its CSS change only
when `ENGINE_VERSION` is bumped, and everything else carries a content hash. The
cache strategy can therefore be a short static list rather than a hash chase.

1. **Cache name carries two versions**, the engine version and a service worker
   revision, for example `dailykit-e1-r3`. Bumping either produces a new cache
   and the activate handler deletes every cache that is not the current name.
   One line changes to invalidate everything, deliberately.
2. **The precache list is generated at build time**, not hand written. A Vite
   plugin writes `dist/sw-manifest.json` from the emitted bundle, and the worker
   fetches it on install. Hand written lists go stale silently.
3. **Three strategies, by kind.**
   - App shell, meaning HTML, JS and CSS: **cache first**, because the build
     already guarantees a changed asset has a changed URL. This is what makes
     requirement 7.3.1's one second hub render true.
   - Manifest chunks under `/data/`: **stale while revalidate**. A chunk is
     immutable once written, but a regenerated horizon must reach a returning
     player without a hard refresh.
   - Everything else: network only.
4. **Scope is `/`** and the worker registers from every page, so a player who
   lands on `/poker-grid/` first still gets the hub cached.
5. **The lookahead prefetch is the offline story.** `PuzzleSource.prefetch`
   already warms the chunk containing today plus seven days. With the worker
   installed those responses land in the cache, which is what lets tomorrow work
   with no connection. Nothing new is needed beyond making sure prefetch runs
   after first paint rather than during boot.
6. **Update behavior.** No skip waiting and no automatic reload, because a
   player mid board must not have the page swapped underneath them. The new
   worker waits, and the next navigation gets it. If a visible prompt is wanted
   later it goes in BACKLOG, not here.
7. **A development escape hatch.** The worker is registered only in production
   builds, so `npm run dev` never serves a stale bundle.

## 4. The changelog, decided in advance

`storage.ts` already persists `lastSeenVersion` per game and nothing reads it.

- A single `CHANGELOG_ENTRIES` constant in the shell, an ordered list of
  `{ version, date, lines }`.
- On boot, if `record.lastSeenVersion` is below the newest version and is not
  zero, open one modal listing the entries between them, then write the newest
  version back. Zero means a first ever visit and gets the help panel instead,
  never a changelog for a product the player has not used.
- It is suite level in feel but per game in storage, which is correct: a player
  who only plays one game should not be told what changed in another.

## 5. Performance pass, decided in advance

Constraint 2.7 has two numbers and only one has been measured.

- **Bytes.** Already inside budget with room. Add a CI assertion so a future
  change cannot quietly cross 150 KB gzipped: the build script sums the gzipped
  size of the assets each page references and fails over the limit.
- **Time to interactive**, mid tier Android, 4x CPU throttle, under two seconds.
  Measure with a headless Chrome trace. If it fails, the first suspects in
  order are: the 35 card board building 35 SVG faces synchronously during mount,
  the manifest chunk fetch blocking first input, and font loading.
- **"First input must never wait on network"** is the clause most likely to be
  violated today, because `openDay` awaits the chunk fetch before mounting the
  board. If the trace confirms it, the fix is to mount a disabled board
  immediately and enable it when the puzzle resolves.

## 6. The Section 10.7 checklist, to be written as a file

`MANUAL-CHECKS.md`, a repeatable list, not prose. It must cover:

- **Emoji rendering** for all seven vocabulary glyphs on iOS, Android, Windows,
  and macOS, and inside Discord, WhatsApp, iMessage, Slack, X, and Bluesky.
  Requirement 3.5.3. Check specifically that no glyph is rendered as text and
  that no variation selector is inserted.
- **Row alignment.** Requirement 3.5.4. The block must stay square with the
  widest and narrowest glyphs in the same block, checked in a proportional font
  chat client, which is where alignment actually breaks.
- **Two block shapes now, not one.** A game block and the daily card. The daily
  card mixes tier glyphs with the two bar tokens in one row, which is the case
  most likely to misalign.
- **Share sheet behavior** per platform: Web Share where available, clipboard
  fallback, the manual copy box, and the dismissed sheet returning cancelled
  rather than silently copying.
- **Smallest viewport**, 360 pixels, for the hub, the board, every modal, and
  the end screen, including with the largest platform text size.

## 7. Definition of done

- A player who loads the site once, disconnects, and returns tomorrow can play
  today's puzzle. Demonstrated with the network disabled, not argued.
- `MISSING.md` is empty and deleted.
- Cold load bytes asserted in CI, and time to interactive measured and recorded
  in `ARCHITECTURE.md`.
- `MANUAL-CHECKS.md` exists and has been run once with results recorded.
- POKER GRID has a first session board and the `TUTORIAL` state is reachable.

## Status, updated after the remainder was worked

Everything in section 7's definition of done is met except the last line of
section 6: MANUAL-CHECKS.md exists and has not been run. That is a human pass
across real devices and real chat clients, and it is the only thing standing
between this phase and closed.
