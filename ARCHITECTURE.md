# DAILYKIT ARCHITECTURE

Living manifest. Every file in the repo is listed here with its one sentence
responsibility and its dependencies. Update on every file added, removed, or
repurposed. This file plus the project instructions must be sufficient to
resume work in a fresh conversation with no chat history.

## Status

| Field | Value |
|---|---|
| Current phase | 8 complete, Phase 9 next |
| Games playable | POKER GRID interface complete, shell not started |
| Engine contract version | 1, drafted and proven against toy-tap |
| Manifest horizon | 365 days, puzzle 1 through 365, epoch 2026-01-01, all verified with a solver replay |

## Phase log

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Charter | done | Layout, toolchain, and all nine charter decisions settled below |
| 1 | The contract | done | GameModule v1, erasure via defineGame, toy-tap fixture passes |
| 2 | POKER GRID design doc | done | POKER-GRID.md. Share bar row dropped, tiers by hand deficit, three tier name sets proposed |
| 3 | Core primitives | done | Layers 0 and 1 in full with tests. sfc32 vectors committed. Tier names approved, COMPLETE replaces WON and LOST |
| 4 | Presentation kit | done | Layer 2 in full with tests. jsdom approved for tests/ui only. Header carries the hub link from this phase. High contrast is a CSS layer, not a theme choice |
| 5 | POKER GRID logic | done | Pure evaluator, rules, generation, solver surface, snapshots, and module contract pass tests |
| 6 | POKER GRID interface | done | Accessible five by seven card renderer, pointer gestures, keyboard cursor, card art, and reduced motion styling |
| 7 | Generation pipeline | done | Connected region enumeration, exact search with a measured ceiling falling back to a width 400 beam, empirical scoring table, weekday difficulty bands, degenerate board rejection, obfuscated manifest, and the CI jobs that produce and check it |
| 8 | Polish and launch readiness | done | Dependency layer check, CI wiring, and project runbook |
| 9 | Slate approval | not started | |
| 10 | Suite shell | not started | |
| 11 | Game two and abstraction test | not started | |
| 12 | Template extraction | not started | |
| 13 | Games three, four, five | not started | |
| 14 | Suite launch readiness | not started | |

## Layer rule

A layer may import only from layers strictly below it. The engine never imports
from a game. A game never imports from another game. Enforced in CI by a
dependency check script, not by convention.

```
Layer 5  shell, hub
Layer 4  games/*
Layer 3  contract
Layer 2  ui
Layer 1  engine
Layer 0  core
```

`shared/` sits beside Layer 0 and holds pure data constants with no imports at
all. `tools/` runs in Node only and may import Layers 0 through 4 but is never
bundled into a browser build.

## File manifest

Table columns are fixed as follows and every future entry uses them.

| Path | Layer | Responsibility | Imports |
|---|---|---|---|
| ARCHITECTURE.md | n/a | This manifest | none |
| BACKLOG.md | n/a | Everything deliberately not built | none |
| ASSETS.md | n/a | Every asset and its license | none |
| POKER-GRID.md | n/a | POKER GRID rules, scoring, tiers, and share layout | none |
| src/shared/share-vocabulary.ts | shared | Suite wide share tokens, their glyphs, and their shapes | none |
| src/shared/poker-hands.ts | shared | Poker hand categories, ordinals, and shared result tier mapping | shared/share-vocabulary |
| src/core/result.ts | 0 | Result type so rule failures are values rather than throws | none |
| src/core/types.ts | 0 | Structural engine, input, and help types independent of the contract | shared/share-vocabulary |
| src/contract/types.ts | 3 | Identity, manifest, help, view, and failure descriptors composed from core types | core/types |
| src/contract/game-module.ts | 3 | The GameModule interface and the single erasure boundary | core/result, core/types, contract/types |
| src/games/toy-tap/module.ts | 4 | Contract regression fixture, never shipped | core/result, core/types, contract/* |
| src/games/poker-grid/evaluator.ts | 4 | Five card hand classification and card decoding | shared/poker-hands |
| src/games/poker-grid/scoring.ts | 4 | Empirically calibrated hand point table, the clearing dominance constants, and tier calculation | shared/poker-hands, games/poker-grid/evaluator |
| src/games/poker-grid/rules.ts | 4 | Pure selection, gravity, commit, terminal, and connected move rules with lazy enumeration | core/result, core/types, shared/poker-hands, games/poker-grid/evaluator, games/poker-grid/scoring, games/poker-grid/generator |
| src/games/poker-grid/generator.ts | 4 | Seeded board construction, the weekday lever schedule, and puzzle shape validation | core/rng, core/seed, core/types, games/poker-grid/rules, games/poker-grid/evaluator |
| src/games/poker-grid/solver.ts | 4 | Exact memoized search under a node ceiling, falling back to a width carrying beam | games/poker-grid/evaluator, games/poker-grid/rules, games/poker-grid/scoring |
| src/games/poker-grid/module.ts | 4 | POKER GRID GameModule implementation, puzzle parsing, state snapshots, and share data | core/result, core/types, engine/tiers, shared/poker-hands, contract/*, games/poker-grid/evaluator, games/poker-grid/generator, games/poker-grid/rules, games/poker-grid/scoring |
| src/games/poker-grid/render.ts | 4 | POKER GRID board renderer with card faces, pointer gestures, keyboard activation, and state repaint | ui/dom, ui/gridCursor, contract/types, games/poker-grid/evaluator, games/poker-grid/rules, games/poker-grid/generator |
| src/games/poker-grid/style.css | 4 | POKER GRID board layout, card styling, suit shapes, responsive sizing, and motion layers | none |
| src/games/poker-grid/help.ts | 4 | POKER GRID structured help content and worked example | core/types |
| data/poker-grid/manifest.index.json | n/a | Horizon, codec name, solver settings, and monthly chunk pointers | none |
| data/poker-grid/manifest.<chunk>.json | n/a | Monthly obfuscated boards with stored best, difficulty, band inputs, levers, and attempt | none |
| src/core/rng.ts | 0 | Deterministic seedable PRNG plus integer range, shuffle, and weighted pick helpers | none |
| src/core/seed.ts | 0 | Derives a uint32 seed from game id, puzzle number, and optional salt, and expands it into a generator | core/rng, core/types |
| src/core/date.ts | 0 | Local day arithmetic, epoch math, next midnight target, and clock jump classification | core/types |
| src/engine/tiers.ts | 1 | Suite wide tier names and the unrated label | none |
| src/engine/telemetry.ts | 1 | Telemetry interface and its no operation default | none |
| src/engine/storage.ts | 1 | Versioned persistence, envelope migration, quota and disabled storage fallback | core/result, core/types, engine/tiers |
| src/engine/stats.ts | 1 | Streak, distribution, and suite aggregate computation as pure functions | core/types, engine/storage |
| src/engine/state-machine.ts | 1 | Session lifecycle, generic over the module's board state | core/types, engine/telemetry |
| src/engine/scheduler.ts | 1 | Puzzle resolution, archive listing, debug date override, and the countdown | core/date, core/types |
| src/engine/share.ts | 1 | Share string assembly and the delivery fallback chain | core/types, shared/share-vocabulary, engine/telemetry |
| vitest.config.ts | n/a | Test runner configuration | none |
| tools/rngvectors.ts | tools | Regenerates the committed determinism vector table | core/rng, core/seed |
| tools/generate.ts | tools | Screens, bands, and regenerates candidate boards, then writes monthly chunks and the index | core/date, core/seed, games/poker-grid/generator, games/poker-grid/greedy, games/poker-grid/manifest-codec, games/poker-grid/solver |
| tools/verify.ts | tools | Re-derives every claim a manifest entry makes, including its seed, band, greedy median, and score bounds | core/seed, games/poker-grid/generator, games/poker-grid/greedy, games/poker-grid/manifest-codec, games/poker-grid/rules, games/poker-grid/scoring, games/poker-grid/solver, tools/generate |
| tools/depcheck.ts | tools | Enforces the layer rule and prevents cross-game imports in CI | none |
| tools/calibrate.ts | tools | The Locked decision 5 availability study over whole boards, emitting the derived point table | core/seed, games/poker-grid/generator, games/poker-grid/rules, games/poker-grid/evaluator, games/poker-grid/scoring, shared/poker-hands |
| tests/core/rng.vectors.ts | n/a | Committed determinism vectors, data not a spec | none |
| tests/core/rng.test.ts | n/a | Generator vectors, ranges, uniformity, and helper properties | core/rng, core/seed, rng.vectors |
| tests/core/seed.test.ts | n/a | Seed stability, separation, and input validation | core/seed |
| tests/core/date.test.ts | n/a | Civil date arithmetic, rollover boundaries, and watermark relations | core/date |
| tests/engine/storage.test.ts | n/a | Backend detection, recovery paths, migration, and quota downgrade | core/result, engine/storage |
| tests/engine/stats.test.ts | n/a | Streak rule, aggregate isolation, capping, and cross promotion | engine/storage, engine/stats |
| tests/engine/state-machine.test.ts | n/a | Transition table integrity, legal paths, and illegal transition handling | engine/state-machine |
| tests/engine/scheduler.test.ts | n/a | Resolution modes, archive paging, debug override, and countdown drift | core/date, engine/scheduler |
| tests/engine/share.test.ts | n/a | Block assembly, padding, row cap, and the delivery fallback chain | core/types, shared/share-vocabulary, engine/share |
| src/ui/dom.ts | 2 | Element creation, idempotent setters, and keyed child reconciliation | none |
| src/ui/a11y.ts | 2 | Focus trapping, dual live regions, and reduced motion preference | ui/dom |
| src/ui/theme.ts | 2 | Theme choice resolution, persistence port, and per game accent application | none |
| src/ui/chrome.css | 2 | Suite chrome styling, theme custom properties, and the contrast layers | none |
| src/ui/modal.ts | 2 | The single stacking dialog implementation with focus and scroll handling | ui/dom, ui/a11y |
| src/ui/toast.ts | 2 | Transient visible confirmations, announced through an injected live region | ui/dom, ui/a11y |
| src/ui/countdown.ts | 2 | Clock recomputing countdown to the next puzzle boundary | ui/dom |
| src/ui/header.ts | 2 | Shared header with hub link, help, stats, archive, and theme controls | ui/dom, ui/theme |
| src/ui/statsPanel.ts | 2 | Statistics figures and distribution histogram over an injected view model | ui/dom |
| src/ui/helpPanel.ts | 2 | How to play body over the shared HelpContent shape | ui/dom, core/types |
| src/ui/gridCursor.ts | 2 | Keyboard cursor over a lattice using the shared grid dimensions and aria-activedescendant | ui/dom, core/types |
| tools/share-harness/index.html | tools | Harness page shell and its own styling | ui/chrome.css |
| tools/share-harness/main.ts | tools | Renders every sample block with a width and line count report | ui/dom, ui/theme, harness/cases, harness/bind |
| tools/share-harness/cases.ts | tools | Sample share blocks spanning the outcome space | core/types |
| tools/share-harness/bind.ts | tools | The harness's single import point into engine/share.ts | engine/share |
| tests/ui/dom.test.ts | n/a | Creation, setter idempotence, and keyed reconcile identity | ui/dom |
| tests/ui/a11y.test.ts | n/a | Tab wrapping, focus restoration, live region routing, motion preference | ui/a11y |
| tests/ui/theme.test.ts | n/a | System following, explicit override, cycle order, persistence, contrast probe | ui/theme |
| tests/ui/modal.test.ts | n/a | Labelling, dismissal paths, stacking, scroll lock, idempotent close | ui/modal |
| tests/ui/toast.test.ts | n/a | Expiry, announcement routing, visible cap, teardown | ui/toast |
| tests/ui/countdown.test.ts | n/a | Clock recomputation, elapsed firing, visibility refresh, moving target | ui/countdown |
| tests/ui/header.test.ts | n/a | Hub link, conditional archive button, control wiring, theme relabelling | ui/header, ui/theme |
| tests/ui/statsPanel.test.ts | n/a | Win rate suppression, suite streak null state, bucket marking, node reuse | ui/statsPanel |
| tests/ui/helpPanel.test.ts | n/a | Text example, drawn example with a hidden text equivalent, teardown | ui/helpPanel |
| tests/ui/gridCursor.test.ts | n/a | Movement, edge behaviour, empty cell skipping, activation, relocation | ui/gridCursor |
| tests/tools/poker-grid-pipeline.test.ts | n/a | Entry determinism, band conformance, rejection reasons, and tamper detection | tools/generate, tools/verify, tools/calibrate |
| tests/tools/share-harness.test.ts | n/a | Grapheme width measurement and case coverage | share-harness/main, share-harness/cases |
| tests/games/poker-grid/evaluator.test.ts | n/a | Poker category, ordinal, wheel, and wrapped straight coverage | games/poker-grid/evaluator |
| tests/games/poker-grid/rules.test.ts | n/a | Gravity, selection rejection, commit, move uniqueness, and terminal coverage | games/poker-grid/evaluator, games/poker-grid/rules |
| tests/games/poker-grid/module.test.ts | n/a | Deterministic generation, snapshot recovery, mismatch rejection, and unrated share coverage | games/poker-grid/generator, games/poker-grid/module, games/poker-grid/rules |
| tests/games/poker-grid/scoring.test.ts | n/a | Hand count dominance, quality floor, and deficit tier properties | games/poker-grid/scoring |
| tests/games/poker-grid/solver.test.ts | n/a | Exact search coverage on a compact legal board | games/poker-grid/solver, games/poker-grid/rules |
| tests/games/poker-grid/render.test.ts | n/a | Accessible board creation, keyboard activation, repaint, empty cells, and teardown | games/poker-grid/render, games/poker-grid/generator, games/poker-grid/rules |
| src/games/poker-grid/greedy.ts | 4 | Legal move listing and the naive reference player difficulty is measured against | core/rng, games/poker-grid/evaluator, games/poker-grid/rules, games/poker-grid/scoring |
| src/games/poker-grid/manifest-codec.ts | 4 | Reversible board obfuscation keyed to the puzzle number, shared by the tools and the module | games/poker-grid/rules |
| data/poker-grid/calibration.json | n/a | The checked in availability study behind the scoring table | none |
| .github/workflows/ci.yml | n/a | Typecheck, tests, and manifest verification on every change | none |
| .github/workflows/generate.yml | n/a | The job that regenerates and verifies the horizon | none |
| .gitignore | n/a | Keeps dependencies, build output, and runner scratch out of the repo | none |
| tests/games/poker-grid/generator.test.ts | n/a | Determinism, deck legality, weekday levers, and the guarantees each lever makes | games/poker-grid/generator, games/poker-grid/evaluator, core/seed |
| tests/games/poker-grid/manifest-codec.test.ts | n/a | Round trip across a year, stream keying, and malformed input rejection | games/poker-grid/manifest-codec, games/poker-grid/generator |

## Planned repository layout

```
dailykit/
  ARCHITECTURE.md
  BACKLOG.md
  ASSETS.md
  README.md
  package.json
  tsconfig.json
  tsconfig.tools.json
  vite.config.ts
  vitest.config.ts
  .github/workflows/ci.yml
  .github/workflows/generate.yml

  src/
    core/            Layer 0. rng.ts seed.ts date.ts result.ts types.ts
    engine/          Layer 1. storage.ts stats.ts share.ts state-machine.ts
                     scheduler.ts telemetry.ts tiers.ts
    ui/              Layer 2. dom.ts modal.ts toast.ts countdown.ts
                     statsPanel.ts helpPanel.ts header.ts theme.ts a11y.ts gridCursor.ts
                     chrome.css
    contract/        Layer 3. game-module.ts types.ts
    shell/           Layer 5. main.ts boot.ts index.html
    hub/             Layer 5. hub.ts hub.css index.html
    games/
	  toy-tap/
        module.ts      Contract regression fixture, excluded from production builds
      poker-grid/
        module.ts      GameModule implementation, the only export the shell sees
        rules.ts       Pure action application and settling
        evaluator.ts   Five card hand classification
        scoring.ts     Named point constants, calibrated in Phase 7
        generator.ts   Seeded board construction
        solver.ts      Search over connected selections, used offline and for tiers
        render.ts      Play area DOM only, no chrome
        style.css      Accent color and board typography
        help.ts        Worked micro example for onboarding
    shared/
      poker-hands.ts   Source of truth for hand ranks and tier names, shared with
                       the PokerFall project by copy, exported to JSON in build
      share-vocabulary.ts  Suite wide share tokens and glyphs, closed to games

  data/
    poker-grid/
      manifest.index.json      Horizon and chunk pointers
      manifest.<chunk>.json    Boards plus stored best score per puzzle number

    tools/
    generate.ts     Produce and verify a run of boards, emit manifest chunks
    verify.ts       Replay a manifest through the solver, assert bands
    calibrate.ts    Phase 7 empirical scoring study over ten thousand boards
    depcheck.ts     Enforce the layer rule in CI
    rngvectors.ts   Regenerate the committed determinism vector table
    share-harness/  Static page rendering sample share strings for eyeballing

  tests/
    core/ engine/ games/ migrations/ snapshots/
```

## Build model

One Vite build per game, selected by the `GAME` environment variable, emitting
to `dist/<game>/`. The hub is its own build emitting to `dist/`. Building one
game never builds another, satisfying constraint 2.9.

`GAME=harness` selects the share string harness of requirement 3.5.7 as a fourth
entry, alongside the game entries and the hub. It is excluded from production by
the same explicit allow list in `vite.config.ts` that excludes `toy-tap`, per
contract decision 12. The allow list itself is authored with `vite.config.ts` in
Phase 6, which is the first phase that needs a browser build.

The engine, core, contract, and ui layers compile to a single shared chunk whose
filename carries an explicit engine version rather than a content hash, so
independently deployed game builds all reference the same cached URL. Bumping
the engine version is a deliberate act that redeploys every game together.
Recorded here because it is the mechanism that reconciles requirement 7.3.2
with requirement 7.3.9.

Deploy target is Cloudflare Pages at the origin `dailykit.providentia.games`.
The site is served from the root, so the service worker scope is `/`, asset
URLs are absolute, and no base path constant exists anywhere in the codebase.
The subdomain also isolates the `localStorage` origin from anything else ever
hosted on providentia.games, which matters because 7.3.3 makes storage a suite
level concern. The last line of every share string is the bare host string
`dailykit.providentia.games`.

## Contract decisions

Settled in Phase 1. Inputs to every later phase.

1. **Three type parameters.** `GameModule<TState, TAction, TPuzzle>`. Fewer
   forces `unknown` onto the game side of the seam.
2. **Erasure at one point.** `defineGame()` in `contract/game-module.ts` performs
   the codebase's only contract cast, producing `AnyGameModule` over branded
   opaque types. Shell and engine source contain no casts and name no game type.
3. **Engine types live in Layer 0.** `core/types.ts` holds `Outcome`,
   `ShareBlock`, `Rejection`, `SerializedState`, and `DistributionSpec`, because
   the layer rule puts Layer 1 below the contract and the engine must not import
   `GameModule`. Layer 3 composes those into the contract.
4. **Semantic share tokens.** Games emit tokens, never codepoints.
   `shared/share-vocabulary.ts` owns the mapping and is closed to games. Row width
   is padded by the engine to the widest row within one block, not to a suite
   constant. Flavor is carried by accent color and board typography only.
5. **Outcome is a tagged union**, `bucketOf` is a pure function supplied by the
   module, and `hasWinLoss` gates the win rate row.
6. **`mount` returns a `GameView` handle.** A module is a singleton, so per
   session render state lives in the handle, not in module scope.
7. **Rejections are values** carrying a machine `code` and a human `announce`
   string, and the engine pushes `announce` to the live region.
8. **Per game payload version.** `stateVersion` and `migrateState` live on the
   module; the storage envelope version is the engine's. Satisfies 7.3.3.
9. **Snapshot serialization**, not an action log, so a rules fix is not a
   migration event for every stored save.
10. **Shell fetches, game parses.** Modules declare a `ManifestDescriptor`;
    `parsePuzzle` and `generatePuzzle` are synchronous. All network, caching, and
    offline fallback stays in the shell.
11. **Input is a tagged descriptor.** A `grid` variant activates
    `ui/gridCursor.ts` for keyboard play over a lattice; `custom` receives raw
    keys. The presentation kit therefore serves grid games without assuming one.
12. **`toy-tap` is permanent**, CI enforced, and excluded from production builds
    by an explicit `GAME` allow list in `vite.config.ts`.

## Engine decisions

Settled in Phase 3. Inputs to every later phase, in the same standing as the
contract decisions above.

1. **sfc32 for the PRNG**, seeded by FNV-1a over `gameId:puzzleNumber:salt` and
   expanded to four state words through splitmix32, then warmed by twelve
   discarded draws. Chosen over mulberry32 for stream count, not output quality:
   a 32 bit state gives 2^32 total streams, which is an uncomfortable ceiling
   once five games consume salted retries for a decade. Every operation is
   restricted to `Math.imul`, `+` with `| 0`, `<<`, `>>>`, and `^`, all of which
   ECMAScript defines exactly on 32 bit integers, which is what makes the stream
   identical in Node and every target browser.
2. **`Seed` stays one uint32**, matching `core/types.ts` and `generatePuzzle`.
   The expansion to four words lives inside `rngFromSeed`.
3. **Rejection sampling in `intBelow`**, never modulo. The bias is negligible
   for play and not negligible for Phase 7, which sets the whole scoring table
   from measured availability and where a systematic bias accumulates instead of
   averaging out.
4. **Weighted pick takes integer weights only**, so no float comparison enters a
   reproducible path. Phase 7 levers are expressed as integer ratios.
5. **Civil date arithmetic, never millisecond subtraction.** Local days are 23
   or 25 hours long twice a year, so a constant divisor moves the puzzle
   boundary for anyone awake just after midnight. `date.ts` reads calendar
   fields and does integer arithmetic on them.
6. **`date.ts` reads no clock and touches no globals.** The caller supplies
   `now`, which is what lets the requirement 3.1.4 debug override live in
   `scheduler.ts` behind a flag the shell passes, and be eliminated from
   production builds there.
7. **Determinism is proven by a committed vector table** in
   `tests/core/rng.vectors.ts`, regenerated only by `tools/rngvectors.ts`.
   Cross engine verification is a Section 10.7 manual checklist item, not a test
   dependency: jsdom shares V8 with Node and proves nothing about engine
   divergence, and it would be a fourth build time dependency against constraint
   2.3. Environment independence is instead enforced by a `lib` of ES2022 plus
   DOM with no Node types in the shipped tsconfig.
8. **Two version integers in the storage envelope**, `ev` for the engine and
   `gv` for the module. The engine migrates the envelope and never opens `data`;
   the module migrates `data` and never sees the envelope. This is the mechanism
   of requirement 7.3.3.
9. **Every storage read failure converges** on a fresh record with
   `recovered: true`. Five separate failure paths would be five chances to throw
   during boot, which is unrecoverable because no UI exists yet.
10. **Only the live in progress payload is migrated.** History and archive
    entries hold engine owned results, so a module whose `migrateState` gives up
    loses one unfinished board and never a streak.
11. **A version from the future is rejected, not guessed at.** A player who used
    a newer deploy and then hit a cached older one loses the day rather than
    having a shape reinterpreted wrongly.
12. **Quota exceeded downgrades the store to memory permanently for the
    session**, so every later write takes one path and the banner shown to the
    player stays true. `detectBackend` probes with a real write, because iOS
    private browsing exposes a `localStorage` whose `setItem` throws.
13. **`completeLive` is idempotent on puzzle number**, so a double dispatch
    cannot double count a game or advance a streak twice. A bucket index outside
    the histogram is dropped rather than growing it.
14. **Two capped lists at 400 each**, `history` for live completions and
    `archive` for replays, with lifetime aggregates held as counters outside
    both. Resolution 6 holds and requirement 3.6.1's separation is structural.
15. **`COMPLETE` replaces `WON` and `LOST`.** See resolution 11 below.
16. **`ARCHIVED_VIEW` has no `FINISHED` transition.** A finished replay renders
    its end screen inside the archive view, because entering `COMPLETE` would
    put a replay one dismissal away from the live countdown.
17. **`ROLLOVER` is legal from every state** and always lands in `LOADING`, so a
    tab open past local midnight can never be refused the new day. `PAUSED` is
    reachable from `PLAYING` only.
18. **Strictness is a constructor option**, not a read of a build global, so
    Layer 1 holds no bundler specific code. An illegal transition throws in
    development and, in production, stays put and returns false rather than
    jumping somewhere else.
19. **`resolve` reports `before-epoch`** rather than clamping to puzzle one, so a
    badly skewed clock is told the game has not launched.
20. **The countdown recomputes from the clock on every tick.** A backgrounded
    mobile tab has timers throttled or suspended, so a decrementing counter
    reads wrong by however long the player was in another app.
21. **A share block over `SHARE_MAX_ROWS` is truncated with a telemetry fault**,
    not thrown. It is a module defect, and the moment the player taps share is
    the worst possible time for an exception.
22. **A dismissed native share sheet returns `cancelled`** and never falls
    through to the clipboard. The player made a decision.

## Presentation decisions

Settled in Phase 4.

1. **No HTML string setter anywhere in Layer 2.** Every text write goes through
   `textContent`, which removes injection as a category from the presentation
   kit and from every game renderer built on it.
2. **`jsdom` is a Vitest environment, not a fourth build dependency.** Approved
   as a stated deviation from constraint 2.3. It is selected per test file by a
   docblock so Layers 0 and 1 keep running in Node, and it has nothing to do
   with the determinism reasoning of engine decision 7, which still refuses a
   second JavaScript engine in the automated suite.
3. **Layer 2 never imports Layer 3.** `helpPanel.ts` and `gridCursor.ts` declare
   structural mirrors of `HelpContent` and the grid input fields rather than
   importing the contract. Same mechanism as contract decision 3.
4. **`statsPanel.ts` takes a view model, not engine output.** The panel renders
   live stats, archive stats, and suite aggregates, which are three different
   producers in Layer 1, and a view model is also what lets a test build a panel
   with no storage backend.
5. **Contrast is a CSS layer, not a theme value.** Theme choice is `system`,
   `light`, `dark`. `prefers-contrast: more` and `forced-colors: active` are
   layered over whichever is active, and the more contrast layer raises
   `--dk-line-width` as well as shifting colors.
6. **`theme.ts` persists through an injected port.** Importing
   `engine/storage.ts` is legal under the layer rule but would put a storage key
   name inside the presentation kit and make theme tests depend on the storage
   backend probe.
7. **Accent is applied to a host element, never to `documentElement`.** The
   Phase 10 hub renders five accents at once.
8. **The header carries the hub link from Phase 4**, as a plain anchor to a
   shell supplied URL. Nothing in Layer 2 changes when the hub is built.
9. **Modals are a stack.** The end screen opening the stats panel over itself is
   the ordinary case. Dismissal requires pointerdown and pointerup both on the
   scrim, so a drag that starts on the board and releases outside the dialog
   does not close it.
10. **Toasts are `aria-hidden` and announce through the live region.** A toast
    that is itself a live region double speaks whenever it mirrors a rejection
    the engine already announced.
11. **The grid cursor uses `aria-activedescendant`, not a roving tabindex.**
    With 35 cells a roving tabindex produces 35 focus changes for a screen
    reader to narrate, where activedescendant narrates one cell.
12. **The cursor skips unnavigable cells rather than stopping at them**, so a
    column emptied by gravity is not a wall the player has to route around, and
    `refresh` relocates by nearest ring search when the cursor's own cell is
    cleared.

## Generation decisions

Settled in Phase 7, in the same standing as the contract, engine, and
presentation decisions above.

1. **Selections are grown, not filtered.** A full board holds 961 connected
   five cell sets. Enumerating every five cell combination of occupied cells
   and testing each for connectivity examines 324,632, a 338 times overshoot,
   inside both the terminal check and every solver node. `visitSelections`
   grows regions outward from a root cell and withholds a cell already tried on
   a branch from every frontier below and after it, so each set arrives exactly
   once. This is the change that made the phase possible at all: the previous
   pipeline could not verify 365 boards in two and a half minutes.
2. **`classifyHand` allocates nothing.** It counts ranks into a reused scratch
   array rather than building a map, a values array, and a sort per call. It
   runs 961 times per board state and tens of millions of times across a
   generation run.
3. **Exact first, beam second, per board.** `solve` attempts an exhaustive
   memoized search over reachable boards, not over move orders, since two move
   orders leaving the same board have the same future. A full 35 card board
   exceeds any workable ceiling, so the ceiling is set at 25,000 states, where
   the attempt costs about half a second and still completes on small boards
   and late game positions. Everything else falls back to a beam of width 400.
   A beam result carries its width in the data and an exact result carries no
   width, so no reader has to guess which claim it is holding.
4. **The scoring table is measured.** 10,000 boards and 9,610,000 selections.
   84.7 percent of legal selections on a fresh board are a bare pair and three
   in a hundred thousand are a straight flush. Raw inverse availability spans
   four orders of magnitude, so the ratios are compressed by an exponent chosen
   to land the rarest category on the largest value the clearing dominance rule
   admits, then rounded for feel. The study is checked in at
   `data/poker-grid/calibration.json` and the exponent, the measured shares,
   and the rounding drift are all asserted in `scoring.test.ts`.
5. **Availability is measured on unlevered deals.** Levers move supply by
   design: `sparse-pairs` caps a rank at three cards and removes four of a kind
   entirely, `guaranteed-straight-flush` plants one. Calibrating on scheduled
   boards prices four of a kind above a straight flush, inverting the shared
   hand ordering, which no player would accept on any day. The table is a
   property of the game and is measured on the base deal; levers shift what a
   day offers against a fixed table. The greedy hand count distribution is
   measured the other way, on the scheduled boards, because that is a fact
   about real days: greedy reaches seven hands on 6 percent of them, six on 67
   percent, five on 25 percent, which is the ladder tiers 2 through 4 read.
6. **Clearing dominance is a property, not a hope.** Locked decision 5's second
   sub rule is enforced as: the worst score with n hands beats the best score
   with n-1. The binding case is seven bare pairs at 5,670 against six straight
   flushes at 5,640, which is what caps a straight flush at 140 points.
7. **Difficulty is the mean greedy shortfall, not the median.** Nine runs of a
   naive player that always takes the highest scoring hand and never looks
   ahead, as a fraction of best known score. The mean matters: greedy either
   strands a hand or it does not, so its median is bimodal and sits at 0.148 to
   0.160 across the whole middle of the distribution. Bands built on it
   produced five consecutive days with a median difficulty of 0.149, a flat
   week wearing a curve's clothing. The mean reads how often greedy strands
   rather than whether it usually does, and spreads smoothly from 0.10 to 0.25.
8. **Bands run Monday gentle to Saturday hard**, Sunday between Thursday and
   Friday, each admitting roughly a fifth of candidates. Boards below their
   band have no decisions in them and boards above it are punishing, and both
   are regenerated under a salt. The stored inputs are integers, so
   verification reproduces a difficulty exactly rather than within a tolerance
   that could hide a drift. The horizon as generated: Monday 0.113, Tuesday
   0.130, Wednesday 0.148, Thursday 0.170, Sunday 0.180, Friday 0.206,
   Saturday 0.249, as median difficulty across 52 of each. That is the curve,
   and it is the thing to re-check after any change to the rules, the scoring
   table, or the levers.
9. **Candidates are screened cheaply.** A candidate is banded against a width
   100 beam and only the survivor pays for the width 400 search and has its
   score stored. Most of a generation run is boards being thrown away.
10. **Retries are recorded.** Attempt 0 is the board an offline client
   reproduces past the horizon; a higher attempt is a board only the manifest
   knows. `verify.ts` regenerates from the recorded attempt, so a manifest
   entry proves it came from the seed it claims.
11. **The manifest is obfuscated, not encrypted.** A per puzzle keystream over
    a 64 symbol alphabet, one character per cell. It is forty lines and a
    determined player can lift it. Stated plainly in the code, and never
    described as security in the UI.
12. **Verification re-derives rather than re-reads.** Every stored field is
    recomputed from the board: the seed, the weekday, the levers, the opening
    count, the greedy median, the band, and the score bounds. Corrupting any
    single field fails the check, which is asserted field by field in
    `poker-grid-pipeline.test.ts`.
13. **Generation and verification are separate processes in CI.** A bug that
    writes a bad board and a bug that fails to notice one should not be able to
    be the same bug.
14. **A month is written the moment it closes.** A full horizon takes over an
    hour, and the first version of this tool held every chunk in memory until
    the end, so the first day that could not be filled threw away 169 good
    boards. Chunks land as each month completes and a run resumes with
    `POKER_GRID_FROM`. The attempt ceiling is 96 for the same reason: Friday
    and Saturday reject the easy cluster deliberately, roughly one board in
    eight clears their floor, and a ceiling of 24 failed a run outright on a
    day that was unlucky rather than wrong.


## Settled charter decisions

These were resolved in Phase 0 and approved. They are inputs to every later
phase and are not to be reopened without a stated reason.

1. **Share block height.** Nine lines maximum: title, up to seven hand rows,
   URL. The streak count rides on the title line. Amended in Phase 2: the
   summary bar row of requirement 6.5.3 is dropped because cards cleared is
   exactly five times the hand row count under locked decisions 1 and 3, so the
   bar carries no information, and keeping it made requirement 6.5.5 impossible
   to satisfy on a perfect clear. See POKER-GRID.md Section 14.1.
2. **First session.** The difficulty override seam stays in the contract. POKER
   GRID implements it as a fixed easy tutorial board that is not today's puzzle,
   played before the first real puzzle, never shareable and never counted in
   stats or streaks. The daily board is identical for every player worldwide.
3. **Manifest window.** Chunked by month. The client fetches the current chunk
   plus seven days ahead, never the full horizon.
4. **Selection shape.** A selection is any connected set of exactly five cells
   under four way adjacency. Branching from any already selected cell is legal,
   so plus, T, L, and block shapes are reachable. Dragging back over the
   immediately previous cell deselects it. The solver's move generator and every
   generator statistic assume this move set.
5. **Epoch.** POKER GRID's epoch is the calendar date 2026-01-01, which is
   puzzle number 1. Puzzle number is the count of whole local days since that
   date plus one. The epoch is a date and not a UTC instant, because rollover is
   at local midnight per 3.1.2. 2026-01-01 is a Thursday, so the weekly
   difficulty curve carries a named weekday offset constant of four.
14. **Origin and hosting.** Cloudflare Pages at `dailykit.providentia.games`,
   root scope. See Build model above.
15. **Share title.** Game name only. No suite mark. Family recognition is carried
   entirely by the shared glyph vocabulary of 7.3.6.
16. **Tier names.** The five tier names are a suite wide engine constant, plain
   spoken rather than poker flavored. Approved in Phase 3: **Excellent, Great,
   Good, Fair, Rough**, held in `engine/tiers.ts`. Because tier 0 is Excellent
   and not Perfect, no name collision arises and the zero remaining histogram
   bucket keeps the label **Perfect Clear**. Past the manifest horizon the label
   is the lowercase word `unrated`, which sits where a tier name sits.
17. **Slate.** POKER GRID is one of the five. Phase 9 recommends four more from
   eight or more candidates and presents the assembled slate.

## Resolutions of internal conflicts in the source document

Recorded so a fresh conversation does not rediscover them.

1. Section 3.4 mandates win percentage; locked decision 4 removes the loss
   state. Terminal outcome is a tagged union and the stats panel renders a win
   rate row only when the module sets `hasWinLoss: true`. POKER GRID sets false.
2. Section 8.4 anti spoiler versus a baked 365 day manifest. Resolved by the
   monthly chunking in decision 3 plus light per entry obfuscation, with a code
   comment stating plainly that a determined player can always extract it.
3. Locked decision 6 needs a stored optimum that a phone cannot compute. Past
   the manifest horizon a board is playable but labeled unrated in both the end
   screen and the share block, and CI keeps the horizon from ever running out.
4. Per game epochs versus the suite streak. The suite record carries its own
   epoch and day number so a later launching game inherits no fake history.
5. Requirement 8.1 forbids meaning in color alone while the share vocabulary is
   colored squares. Tier glyphs differ in shape as well as hue, and the board
   never uses suit color as the sole suit signal.
6. Archive history is unbounded and localStorage is not. Archive results are
   capped at the 400 most recent entries with oldest evicted, and lifetime
   aggregates are stored separately so eviction never changes displayed totals.
7. Clock jumps. The store keeps the highest puzzle number ever seen as a
   watermark. Amended in Phase 3: the archive boundary is **strictly below** the
   watermark. A resolved number equal to the watermark is the ordinary same day
   return and resumes live play with its in progress board intact; the earlier
   wording of at or below made an unfinished board unresumable, contradicting
   requirement 3.3.3. A resolved number above the watermark advances it and
   discards any older in progress board. Streaks are untouched by all of this:
   `stats.ts` advances a streak only when a live puzzle is completed and its
   number is exactly one above the last completed one, so a forward jump of any
   size breaks the streak by arithmetic and no clock reading can award a skipped
   day.
8. PokerFall coupling. `src/shared/poker-hands.ts` is the source of truth for
   hand ranks and tier definitions, exports a JSON artifact at build time, and
   PokerFall consumes that JSON by manual copy. A CI check fails on drift
   between the constant and the checked in JSON. Scoring point values are not
   shared. No other coupling exists.
9. Section 6.5 is internally unsatisfiable, seven hand rows plus a bar plus a
   title plus a URL is ten lines against a nine line cap. Resolved by dropping
   the bar. POKER-GRID.md Section 14.1.
10. Locked decision 2 requires tap to remove while charter decision 4 requires a
    connected selection. Resolved by truncation from the tapped cell onward.
    POKER-GRID.md Section 14.2.
11. Requirement 3.2 names a LOST state that locked decision 4 removes. Resolved
    in Phase 3: `WON` and `LOST` do not exist as lifecycle states. The terminal
    state is `COMPLETE` and it carries the module's `FinishedOutcome`, whose
    `won` field is true, false, or null. Encoding the same fact as both a state
    name and an outcome field gives two representations with nothing keeping
    them agreed, and requirement 7.1.3 guarantees the suite contains continuum
    scored games for which `LOST` would be permanently unreachable. This is a
    stated deviation from the state list in Section 3.2, approved in Phase 3.
