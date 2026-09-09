# DAILYKIT ARCHITECTURE

Living manifest. Every file in the repo is listed here with its one sentence
responsibility and its dependencies. Update on every file added, removed, or
repurposed. This file plus the project instructions must be sufficient to
resume work in a fresh conversation with no chat history.

## Status

| Field | Value |
|---|---|
| Current phase | Phase 11 done. Phase 12, template extraction, is next. Phase 8's manual checklist is still unrun |
| Games playable | POKER GRID and CIPHER, end to end in a browser, inside the suite shell |
| Engine contract version | 2, corrected by the Phase 11 defect report. Chunks are keyed entries, granularity is gone, tiers belong to the module |
| Manifest horizon | POKER GRID 365 days from epoch 2026-01-01, verified with a solver replay. CIPHER 365 days from epoch 2026-01-05, the first Monday, verified against the fixed opening |

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
| 8 | Polish and launch readiness | in progress | First pass delivered the dependency layer check, CI wiring, and the runbook only. The remainder is being worked through PHASE-8-PLAN.md. Done since: favicon, web manifest, about page, service worker, offline caching proved with the network disabled, the changelog, POKER GRID's first session board, the byte budget check in CI, and time to interactive measured. Open: running MANUAL-CHECKS.md once and recording the result |
| 9 | Slate approval | done | SLATE.md, second revision. Thirty four pooled candidates, five recommended, approved 2026-09-08. POKER GRID, VECTOR, CIPHER, TALLY DROP, RECALL |
| 10 | Suite shell | done | Hub, shell, per game entries, one pass release build with a shared engine chunk, suite storage and streak, daily card, cross promotion. One contract change and one renderer defect, both below |
| 11 | Game two and abstraction test | done | CIPHER ships at 24.0 KB gzipped. Defect report written, eight defects, and the engine corrected for all of them. Both games rebuilt against the corrected contract and the full suite is green: 43 files, 463 tests, 57 seconds |
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
| COPILOT.md | n/a | The human's guide to driving Copilot through a manual checks run | none |
| AGENTS.md | n/a | The open standard pointer to the Copilot instructions, for other agents | none |
| .github/copilot-instructions.md | n/a | Always on agent instructions: constraints, layers, invariants, the gate, the defect protocol, the diagnosis table | none |
| .github/instructions/*.instructions.md | n/a | Path scoped agent rules, one file per area, applied by glob | none |
| .github/prompts/*.prompt.md | n/a | Reusable agent commands: onboard, manual-check, verify, review-change, changelog-entry | none |
| .vscode/settings.json | n/a | Turns the instruction and prompt files on for this workspace | none |
| POKER-GRID.md | n/a | POKER GRID rules, scoring, tiers, and share layout | none |
| SLATE.md | n/a | The Phase 9 candidate list and the recommended five | none |
| CIPHER.md | n/a | CIPHER rules, feedback algorithm, verification, tiers, and share layout | none |
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
| data/poker-grid/manifest.<chunk>.json | n/a | Monthly entries keyed by puzzle number, obfuscated, with stored best, difficulty, band inputs, levers, and attempt | none |
| src/core/rng.ts | 0 | Deterministic seedable PRNG plus integer range, shuffle, and weighted pick helpers | none |
| src/core/seed.ts | 0 | Derives a uint32 seed from game id, puzzle number, and optional salt, and expands it into a generator | core/rng, core/types |
| src/core/date.ts | 0 | Local day arithmetic, epoch math, next midnight target, and clock jump classification | core/types |
| src/engine/tiers.ts | 1 | Suite wide tier names and the unrated label | none |
| src/engine/manifest-codec.ts | 1 | The suite wide manifest keystream, parameterised by radix and keyed by puzzle number | none |
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
| tools/share-harness/index.html | tools | Harness page shell and its own styling, served at /harness/ by `npm run harness` | ui/chrome.css |
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
| src/games/poker-grid/manifest-codec.ts | 4 | Board sized wrapper over the engine codec: 35 cells drawn from 52 cards | engine/manifest-codec, games/poker-grid/rules |
| data/poker-grid/calibration.json | n/a | The checked in availability study behind the scoring table | none |
| .github/workflows/ci.yml | n/a | Typecheck, tests, and manifest verification on every change | none |
| .github/workflows/generate.yml | n/a | The job that regenerates and verifies the horizon | none |
| .gitignore | n/a | Keeps dependencies, build output, and runner scratch out of the repo | none |
| vite.config.ts | n/a | The GAME allow list, the entry set, the pinned engine chunk, static root file emission, and manifest data deployment | none |
| src/engine/dailycard.ts | 1 | The suite's combined one row per finished game share block | core/types, engine/tiers, shared/share-vocabulary |
| src/shell/registry.ts | 5 | The five suite games as data, readable without loading a game | none |
| src/shell/share-context.ts | 5 | What a share block is told about the session, so a replay carries no streak | none |
| src/shell/suite.ts | 5 | Suite storage, per game today status, theme port, and daily card assembly | core/date, core/result, core/types, engine/dailycard, engine/scheduler, engine/stats, engine/storage, ui/theme, shell/registry |
| src/shell/boot.ts | 5 | Manifest index and chunk fetching, prefetch, and the past horizon fallback | contract/game-module, core/result, core/seed, core/types |
| src/shell/main.ts | 5 | Session lifecycle, chrome, end screen, share, archive, and cross promotion | contract/*, core/*, engine/*, ui/*, shell/boot, shell/registry, shell/suite |
| src/shell/shell.css | 5 | Game page layout, end screen, and archive list styling | none |
| src/shell/env.d.ts | 5 | Ambient CSS module and import.meta.env declarations for browser builds | none |
| src/shell/entries/poker-grid.ts | 5 | The POKER GRID bundler entry, the one file that names it | games/poker-grid/module, shell/main |
| src/shell/register-sw.ts | 5 | Service worker registration, production builds only, deferred to the load event | none |
| src/sw/sw.ts | n/a | The service worker. Cache first app shell, stale while revalidate manifest chunks, network only for everything else | none |
| tools/sw-manifest.ts | tools | The precache list and the cache name, as pure functions shared by the build and its test | none |
| tools/budget.ts | tools | Constraint 2.7's byte budget, asserted against a built dist/ in CI | none |
| src/shell/changelog.ts | 5 | The entry list, the app version, and what a returning player is shown | none |
| src/games/poker-grid/tutorial.ts | 4 | The fixed first session board and how it was chosen | games/poker-grid/generator |
| MANUAL-CHECKS.md | n/a | The Section 10.7 list, with a results table to fill in per run | none |
| tests/shell/changelog.test.ts | n/a | Version windowing, game scoping, and the two cases that must show nothing | shell/changelog |
| tests/shell/share-context.test.ts | n/a | A replay and a tutorial carry no streak, a live session carries its own | shell/share-context |
| tests/games/poker-grid/tutorial.test.ts | n/a | Board legality, that it is graded by nothing, and that it is easier than a scheduled day | games/poker-grid/tutorial |
| tsconfig.sw.json | n/a | The worker's own program, because the WebWorker lib cannot share a program with DOM | none |
| tests/tools/sw-manifest.test.ts | n/a | Precache coverage, worker exclusion, and cache name movement | tools/sw-manifest |
| src/shell/entries/poker-grid.html | 5 | The POKER GRID page | none |
| src/shell/entries/toy-tap.ts | 5 | The toy-tap entry, excluded from production by the allow list | games/toy-tap/module, shell/main |
| src/shell/entries/toy-tap.html | 5 | The toy-tap page | none |
| src/hub/hub.ts | 5 | The hub, its cards, the suite streak, and the daily card control | core/date, engine/*, ui/*, shell/registry, shell/suite |
| src/hub/boot.ts | 5 | The hub's bundler entry | hub/hub |
| src/hub/index.html | 5 | The hub page, deployed at the site root | none |
| src/hub/hub.css | 5 | Hub layout and card styling | none |
| src/about/index.html | 5 | The about page. Requirement 8.5's privacy claim written down, plus how a day works | none |
| src/about/about.css | 5 | About page styling. Imports the chrome tokens directly so the page ships no JavaScript at all | ui/chrome.css |
| static/icon.svg | n/a | Suite icon, deployed at the site root | none |
| static/icon-192.png | n/a | Suite icon raster for the install prompt | none |
| static/icon-512.png | n/a | Suite icon raster for the install prompt and maskable slot | none |
| static/site.webmanifest | n/a | Web app manifest, deployed at the site root | none |
| tests/engine/dailycard.test.ts | n/a | Row shape, the ungraded case, the row cap, and the text equivalent | engine/dailycard, engine/share, engine/tiers |
| tests/shell/registry.test.ts | n/a | Registry uniqueness, agreement with built modules, and cross promotion | shell/registry, engine/stats, games/poker-grid/module |
| tests/shell/boot.test.ts | n/a | Chunk lookup by puzzle number, the format and missing day messages, the horizon fallback, and chunk caching | shell/boot |
| tests/shell/suite.test.ts | n/a | Today status per game, read only guarantees, daily card input, theme port | shell/suite, shell/registry, engine/* |
| tests/hub/hub.test.ts | n/a | Card listing, links, the daily card, tier badges, and accessible names | hub/hub, shell/* |
| tests/games/poker-grid/generator.test.ts | n/a | Determinism, deck legality, weekday levers, and the guarantees each lever makes | games/poker-grid/generator, games/poker-grid/evaluator, core/seed |
| tests/games/poker-grid/manifest-codec.test.ts | n/a | Round trip across a year, stream keying, and malformed input rejection | games/poker-grid/manifest-codec, games/poker-grid/generator |
| src/games/cipher/rules.ts | 4 | CIPHER feedback scoring, guess composition, rejections, terminal detection, tier and bucket mapping | core/result, core/types |
| src/games/cipher/solver.ts | 4 | Knuth style minimax over the 1,296 code space, with a precomputed feedback table | games/cipher/rules |
| tools/cipher-study.ts | tools | Measures line length and consistent set size across the whole code space, the input to CIPHER's weekday bands | games/cipher/rules, games/cipher/solver |
| data/cipher/study.json | n/a | The checked in study behind CIPHER's fairness floor and difficulty bands | none |
| tests/games/cipher/rules.test.ts | n/a | Feedback worked examples, every rejection path, the guess limit, and a random legal sequence property | games/cipher/rules |
| tests/games/cipher/solver.test.ts | n/a | Index round trip, table agreement, opening partition, tie break determinism, and line correctness | games/cipher/rules, games/cipher/solver |
| src/games/cipher/generator.ts | 4 | Seeded code construction, the weekday difficulty bands, and the shape lever a day records | core/rng, core/seed, core/types, games/cipher/rules |
| src/games/cipher/manifest-codec.ts | 4 | Code sized wrapper over the engine codec: four symbols drawn from six shapes | engine/manifest-codec, games/cipher/rules |
| data/cipher/manifest.index.json | n/a | Horizon, codec, fixed opening, and the single chunk pointer | none |
| data/cipher/manifest.horizon.json | n/a | The 365 day CIPHER horizon as entries keyed by puzzle number, obfuscated, with difficulty, line length, lever, and attempt | none |
| tools/cipher-generate.ts | tools | Draws, bands, and screens codes, then writes the year chunk and the index | core/seed, games/cipher/generator, games/cipher/manifest-codec, games/cipher/rules, games/cipher/solver |
| tools/cipher-verify.ts | tools | Re-derives every claim a CIPHER entry makes, including its seed, attempt, lever, band, and solver line | core/seed, games/cipher/generator, games/cipher/manifest-codec, games/cipher/rules, games/cipher/solver, tools/cipher-generate |
| tests/games/cipher/generator.test.ts | n/a | Weekday mapping, band ordering, seeded determinism, lever totality, and unrated fallback | games/cipher/generator, games/cipher/solver |
| tests/games/cipher/manifest-codec.test.ts | n/a | Round trip across a year, stream keying, and malformed input rejection | games/cipher/generator, games/cipher/manifest-codec |
| tests/tools/cipher-pipeline.test.ts | n/a | Entry determinism, band conformance, rejection accounting, tamper detection, and the committed manifest | tools/cipher-generate, tools/cipher-verify, games/cipher/* |
| src/games/cipher/module.ts | 4 | CIPHER GameModule implementation, puzzle parsing, snapshot state, outcome, and share data | core/result, core/types, engine/tiers, contract/*, games/cipher/generator, games/cipher/help, games/cipher/manifest-codec, games/cipher/render, games/cipher/rules |
| src/games/cipher/render.ts | 4 | CIPHER play area: shape palette, four slots, guess history, and its own keyboard model | ui/dom, contract/types, games/cipher/generator, games/cipher/rules |
| src/games/cipher/style.css | 4 | CIPHER slot, palette, and history styling with 44 pixel touch targets | none |
| src/games/cipher/help.ts | 4 | CIPHER structured help content and worked example | core/types |
| src/shell/entries/cipher.ts | 5 | The CIPHER bundler entry, the one file that names it | games/cipher/module, shell/main |
| src/shell/entries/cipher.html | 5 | The CIPHER page | none |
| tests/games/cipher/module.test.ts | n/a | Identity, manifest resolution, parse rejection, snapshot round trip, outcome grading, and share rows | games/cipher/module, games/cipher/rules |
| tests/games/cipher/render.test.ts | n/a | Palette and slot accessibility, tap and keyboard play, announcement, reveal on loss, and teardown | games/cipher/render, games/cipher/rules |

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

**A release is one build.** `npm run build` runs Vite once with every entry on
the production allow list in `vite.config.ts`, and emits:

```
dist/
  index.html                     the hub
  poker-grid/index.html          one directory per game
  assets/engine-v<N>.js          the shared chunk, pinned by version
  assets/engine-v<N>.css
  assets/<entry>-<hash>.js       one chunk per page
  assets/suite-<hash>.js         registry and suite services, shared
  data/poker-grid/*.json         manifest chunks, fetched at runtime
```

The engine chunk carries an explicit version rather than a content hash, so a
game only change does not invalidate it and every game references the same
cached URL. Requirement 7.3.2.

**Why the release build is one pass, revised in Phase 10.** The earlier plan
was one build per game. That cannot produce a shared chunk: Rollup includes
only the engine each entry actually reaches, so a hub only build emitted a
fourteen kilobyte engine and a POKER GRID build a twenty six kilobyte one at
the same pinned URL, and whichever ran last won. This is not a naming problem
and no filename scheme fixes it. A build with all entries computes the shared
chunk across them, which is the only construction that makes the pinned URL
true. Two properties keep the original constraints intact:

- Constraint 2.9, building one game without building another, is
  `GAME=<id> vite build`. It emits to `dist-dev/` rather than `dist/`, because
  a single target's engine chunk is a subset and must never overwrite a release
  tree's. It is a development and smoke check path, not a deploy path.
- Requirement 7.3.9, shipping a one game fix without risking the others, holds
  because the release build is deterministic. Two consecutive builds of an
  unchanged tree produce byte identical assets, asserted by rebuilding and
  comparing hashes. A one game fix therefore rewrites that game's chunk and
  leaves the other four unchanged.

Bumping `ENGINE_VERSION` in `vite.config.ts` is the deliberate act that
invalidates the shared chunk and redeploys every game together.

**The worker and its precache list.** A release build also emits `dist/sw.js`
and `dist/sw-manifest.json`. The worker is only added to the entry set for a
full release build, so `GAME=<id> vite build` and the dev server never produce
one and a developer can never be served out of a cache. `swManifestPlugin`
runs after the HTML entries have been renamed, reads the finished bundle, and
does two things with it: writes the precache list, and stamps the cache name
into the worker in place of `__DK_CACHE_NAME__`. Both live in
`tools/sw-manifest.ts` as pure functions so they are testable without a build.

Files under `static/` deploy to the site root byte for byte, emitted into the
bundle rather than copied afterwards so the precache list sees them.
`data/<game>/` still deploys separately and is filtered to `manifest.*` only,
since `calibration.json` is a checked in study that nothing fetches.

**Entries.** Every game has exactly one file that names it,
`src/shell/entries/<id>.ts`, which imports the module and calls `mountShell`.
That file plus its sibling HTML is the whole of a game's build surface, it is
what makes each game its own chunk, and it is why `src/shell/main.ts` names no
game. The allow list in `vite.config.ts` decides which of those entries a
production build contains, which is contract decision 12 unchanged.

Measured against constraint 2.7. Bytes are asserted in CI by
`npm run budget`, which sums the gzipped size of each page's own HTML plus
every script and stylesheet it references and fails over 150 KB. Manifest
chunks are excluded because they are fetched after the page is interactive.

| Page | Cold load, gzipped | Interactive, 4x CPU throttle, 1.6 Mbps and 150 ms | Same on 400 kbps and 600 ms |
|---|---|---|---|
| Hub | 16.5 KB | 1.07 s | 1.98 s |
| POKER GRID | 24.9 KB | 0.98 s | 2.27 s |
| About | 3.4 KB | n/a, no script | n/a |

Measured with headless Chromium at a 360 pixel viewport, `Emulation.setCPUThrottlingRate`
at 4, timing from navigation to the first playable element existing in the DOM.
The throttled machine is a cloud container rather than a real mid tier Android,
so read these as a regression baseline rather than as a field number.

The second row is the one that matters. On a good connection both pages are
inside the two second budget with room. On a genuinely bad one, POKER GRID
crosses it, because a first ever visit has to fetch the manifest chunk before
a board can exist. Two things make that the narrow case it looks like: a board
cannot be drawn before its cards arrive, so a disabled skeleton would be a
picture of a game rather than a game, and every later visit is served from the
service worker cache instead. The tutorial board on a first visit needs no
manifest at all and warms the chunk while it is played.

Deploy target is Cloudflare Pages at the origin `dailykit.providentia.games`.
The site is served from the root, so the service worker scope is `/`, asset
URLs are absolute, and no base path constant exists anywhere in the codebase.
The subdomain also isolates the `localStorage` origin from anything else ever
hosted on providentia.games, which matters because 7.3.3 makes storage a suite
level concern. The last line of every share string, including the daily card's,
is the bare host string `dailykit.providentia.games`, held once in
`src/shell/registry.ts`.

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
13. **A manifest chunk is `entries`, keyed by puzzle number, and the contract
    says so.** Phase 11 correction, defect 7. The engine reads one entry by key
    and never inspects it; how many chunks a horizon has is the index's
    business. `granularity` was removed in the same pass, defect 1, because
    nothing read it and a one chunk game could only fill it in falsely.
14. **The engine owns puzzle identity.** Phase 11 correction, defect 6.
    `stats.resumableState` is the single place a stored board is matched to the
    day being opened, so a module whose state cannot tell one puzzle from
    another is safe by construction. `StateFailure`'s `puzzle-mismatch` stays
    available for games that can detect it cheaply.
15. **`custom` input means the game owns its keyboard.** Phase 11 correction,
    defect 3. Stated on the type rather than discovered. A shared list cursor
    waits for a second example, because an abstraction drawn from one is the
    more expensive mistake.
16. **A module's tier is the module's.** Phase 11 correction, defect 4. The
    shell no longer blanks it past the manifest horizon; a module with nothing
    to grade against returns null itself.
17. **A module states where its index is, and nothing more.** The first
    onboarding review found `ManifestDescriptor.urlForChunk` implemented by all
    three modules, asserted by three tests, and called by nothing: `boot.ts`
    takes chunk URLs from the index pointers, which is what makes the index
    authoritative. A contract field nothing calls is worse than a missing one,
    because the next game's author implements it carefully and then wonders why
    it never fires. Removed, with `indexUrl` carrying the chunk format
    documentation it used to hold.

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

1. **Share block height.** Ten lines maximum: title, up to `SHARE_MAX_ROWS`
   rows, URL. The streak count rides on the title line. Amended in Phase 2: the
   summary bar row of requirement 6.5.3 is dropped because cards cleared is
   exactly five times the hand row count under locked decisions 1 and 3, so the
   bar carries no information, and keeping it made requirement 6.5.5 impossible
   to satisfy on a perfect clear. See POKER-GRID.md Section 14.1.

   Amended again after the first onboarding review, which found the code and
   this decision disagreeing. `SHARE_MAX_ROWS` is 8 and has been since the suite
   gained a second game, which makes the block ten lines rather than the nine
   this decision used to name. Eight rows is inside requirement 3.5.6's "never
   taller than about eight rows", and it is what CIPHER's six guesses and POKER
   GRID's seven hands both fit inside with one row of headroom. The constant is
   the authority and this line now matches it. What is capped is rows, and the
   two extra lines are the title and the URL.
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
17. **Slate.** POKER GRID is one of the five. Phase 9's second revision
   recommended VECTOR, CIPHER, TALLY DROP, and RECALL alongside it, in
   `SLATE.md`. **Approved 2026-09-08.** `src/shell/registry.ts` carries the
   four as `planned` entries until each is built, in session length order, and
   was corrected in Phase 11 from the first revision's list of RULE OF FOUR,
   LADDER, and ECHO, which it still held. Game two is CIPHER. Phase 13 order is
   VECTOR, TALLY DROP, RECALL. Changing the slate before a game is built is an
   edit to that one file.

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

## Suite decisions

Settled in Phase 10, in the same standing as the contract, engine,
presentation, and generation decisions above.

1. **The registry is data with no imports.** `src/shell/registry.ts` restates
   each game's identity so the hub can render five cards and read five storage
   keys without loading a single game's code. The hub is the landing page, so a
   hub that imports a game pays that game's download on the page the player
   lands on, and requirement 7.3.2 is false at the worst possible moment. The
   copy is kept true by a test that compares every built module's identity
   against its entry, which is a line added per game.
2. **`FinishedOutcome` carries a tier.** This is a contract change, made here
   because requirement 7.3.5 cannot be built without it: the daily card needs
   one graded result per game at the suite level, and before this the tier
   existed only inside a share title string that a module had already
   formatted. `TierOrdinal` is declared structurally in `core/types.ts` rather
   than imported from `engine/tiers.ts`, because the layer rule puts tiers
   above core, and a compile time check in `tiers.ts` fails if the two ever
   drift. Same mechanism as contract decision 3.
3. **The daily card is a five cell meter per game.** One row per finished
   game, the game's tier token repeated once per band at or below the one
   earned, padded with the neutral token. Five games plus a title and a URL is
   seven lines, inside the cap. An ungraded game is one neutral cell and never
   a tier glyph, because past the horizon there is no grade and rendering one
   as Rough would be a lie the player cannot check.
4. **The hub never writes.** Opening it resolves five puzzle numbers and reads
   five records, and touches none of them. A hub that advanced a watermark
   would discard an in progress board just because the player looked at the
   list. The hub therefore opens every game store with a migration that
   refuses, which drops a stale in progress payload it was never going to
   deserialize and keeps the record it actually reads.
5. **Theme lives in the suite record.** Requirement 7.3.3 puts settings at the
   suite level, so a theme chosen inside one game is already chosen in the
   next. The suite record's `ThemeChoice` admits `contrast` and the kit's does
   not, per presentation decision 5, so an unrecognised stored value reads as
   no choice rather than as a fourth state.
6. **The shell trusts the resolved day, never a timer.** A tab backgrounded
   across local midnight has had its timers throttled or suspended, so
   `visibilitychange` re-resolves the puzzle number and reloads when it moved.
   The countdown is a display, not the authority.
7. **A manifest that cannot be read is a message, never a generated board.**
   Past the horizon, generation is correct and the result is labelled unrated.
   Inside the horizon, generating would hand the player a private board on a
   day the manifest has an opinion about, which breaks the one property a
   daily game cannot lose. `boot.ts` reports unavailable instead, and the
   service worker is what will make that case rare.
9. **A replay is told its streak is zero.** Requirement 3.6.1 and resolution 6
   keep archive results out of every live aggregate, and the share title is the
   only place that separation reaches another person. Passing the live streak
   into a replay's block advertised a number the puzzle in the title had
   nothing to do with. `shareStreakFor` in `src/shell/share-context.ts` holds
   the rule, so it is one testable line rather than a habit each of five games
   has to keep.

8. **`OPEN_ARCHIVE` is refused from `PLAYING`, visibly.** The transition table
   allows the archive only from `COMPLETE` and `WAITING_FOR_NEXT`. The shell
   checks `can` first and shows a line rather than letting the machine report
   an illegal transition, because the player's unfinished live board is the
   thing being protected and they should be told why.

## Offline decisions

Settled in the Phase 8 remainder, in the same standing as the contract, engine,
presentation, generation, and suite decisions above.

1. **The cache name carries a build id**, not just the engine version and a
   worker revision. `dailykit-e<engine>-r<revision>-<build id>`, where the build
   id is a hash of the emitted asset names. The app shell is served cache first
   and `index.html` has no content hash, so a name that moves only when a human
   bumps a constant would pin a returning player to the first HTML they ever
   loaded. The release build is deterministic, so a redeploy of an unchanged
   tree keeps the id and keeps the player's cache. This is a deviation from the
   two part name in PHASE-8-PLAN.md section 3.1, approved before implementation.
2. **The worker is a classic script.** It imports nothing, so a module worker
   would buy nothing, and classic registration works on the oldest Safari inside
   constraint 2.8's support floor. It lives in its own TypeScript program,
   `tsconfig.sw.json`, because the WebWorker lib and the DOM lib cannot share
   one.
3. **The precache list is generated, never written.** Hand written lists go
   stale in silence. `tools/sw-manifest.ts` derives it from the emitted bundle
   and a test asserts that no page, script, or stylesheet can fall out of it.
4. **Install precaches asset by asset rather than with `addAll`.** `addAll`
   rejects the whole install if any single entry fails, and a worker that never
   installs is worse than one that installs with a gap the fetch handler fills
   from the network.
5. **No `skipWaiting` and no automatic reload.** A player mid board must not
   have the page swapped underneath them. The new worker waits and the next
   navigation takes it.
6. **Manifest chunks are stale while revalidate.** A chunk is immutable once
   written, but a regenerated horizon has to reach a returning player without a
   hard refresh.
7. **The lookahead prefetch runs when the browser is idle**, not inside
   `openDay`. It is what makes tomorrow playable offline, and it is also the
   largest download on the page, so it must not compete with first paint or
   with the chunk the player is waiting on. Constraint 2.7's "first input must
   never wait on network" is the clause this protects.
8. **The worker never caches itself.** The browser fetches `sw.js` by URL to
   decide whether to install a new one, and a worker served from its own cache
   is a worker that can never be replaced.
9. **The changelog is per game in storage and scoped per entry.** A player who
   only opens POKER GRID is never told what changed in a game they have not
   played, so an entry names the games it touches. A stored version of zero is
   a first ever visit and gets the help panel instead, and the stored version
   is written forward whether or not anything was shown, so a player who
   skipped several releases sees one modal rather than one per visit.
10. **`TUTORIAL_DONE` lands in `LOADING`, not `PLAYING`.** The tutorial board is
    not any day's puzzle, so finishing it leaves the shell with today still to
    resolve and fetch. Landing in `PLAYING` would name a state with no board
    mounted. This is a change to the Phase 3 transition table, made here
    because the first session board is the first thing ever to use it.
11. **The tutorial is its own session mode.** Every write to storage asks
    whether the session is live, so a third mode is what makes "never counted"
    structural rather than a rule five games each have to remember. It is
    marked seen when it opens rather than when it is finished, so abandoning it
    hands the player today's board on their next visit.
12. **Offline was demonstrated, not argued.** Headless Chromium, service worker
    installed, server stopped and the context set offline: the hub renders its
    five cards from cache and POKER GRID renders all 35 cells with the manifest
    index and the current chunk served from the cache. Redone after any change
    to the worker or to the build's asset naming.

## CIPHER generation decisions

Settled in Phase 11, in the same standing as the decisions above. They govern
game two only where they name it.

1. **Difficulty is the size of the class the fixed opening leaves.** One
   integer, reproducible exactly, no tolerance. `OPENING_GUESS` is `[0, 0, 1, 2]`
   and changing it invalidates every stored difficulty, which is stated beside
   the constant.
2. **A band is a set of classes, not a numeric window.** The opening partitions
   1,296 codes into fourteen classes and two of them hold 40 percent of the
   space, so a band sized as a share of the distribution is not available.
   Monday admits 44 or fewer, then 81, 84, 105, Sunday 182, Friday 222 or 230,
   Saturday 276. Every band holds more than the 52 days a year spends, and the
   larger classes carry longer solver lines, so the ordering grades difficulty.
3. **The shape lever is recorded, not scheduled.** Measurement killed the
   scheduled version: all distinct has no codes at all in Tuesday's class, and
   four of the seven weekday pairings hold fewer than the 52 a year needs. A day
   records the shape it drew, which is what requirement 6.3.6 asks of POKER GRID
   and is all an audit needs.
4. **The fairness floor is four guesses**, measured to admit 1,221 of 1,296
   codes, so screening is cheap. 75 codes fall out in three or fewer and are
   rejected under a salt.
5. **No code repeats inside a horizon.** Two days with the same answer is
   visible to any player who opens the archive, and the thinnest band still
   holds 73 codes against 52 days.
6. **The solver never reaches the browser.** Its table is 1.7 megabytes, so
   `generator.ts` is written to be importable by the module and `solver.ts` is
   not. That is why difficulty and line length live in the manifest and a code
   generated past the horizon is unrated.
7. **A candidate is banded before it is solved.** `solveLine` is the only
   expensive call in the pipeline, so it runs on the roughly one draw in ten
   the band accepts. A full horizon generates in two seconds and verifies in
   five.
8. **The horizon is one chunk.** 365 codes are 36 kilobytes, which does not
   want twelve files. It is named for the span it covers rather than a calendar
   year, because a 5 January epoch runs a horizon four days into the following
   one.
   `granularity` still says `"month"` because the contract admits nothing else,
   which is defect 1 of the Phase 11 report.
9. **CIPHER's epoch is 2026-01-05, the first Monday of the epoch year.** Puzzle
   1 therefore lands in the gentlest band rather than mid week, which is the
   launch day property a new game wants and which POKER GRID's 1 January epoch
   cannot give it. Four days apart rather than five months, so the two games
   stay on the same calendar year and their puzzle numbers differ by four. Per game epochs are what the contract has always carried, and
   recorded conflict resolution 4 already keeps the suite streak honest across
   games that start on different days: the suite record holds its own epoch and
   day number, so a later launching game inherits no fake history.

## Running the test suite

`npm test` is 43 files, 463 tests, and **57 seconds** end to end, of which 6.6
seconds is environment setup. That number is from a normal filesystem and it is
what CI measures.

It is written down because of a trap that cost a working day in Phase 11. When
this repository is worked on through a mounted network or bridge filesystem, the
run appears to hang. The cause is not the tests. `require("jsdom")` alone was
measured at **61 seconds** on the mount against **0.5 seconds** on local disk,
because Node's module resolution makes thousands of small reads and the mount
costs about 17 milliseconds each. Every `jsdom` test file pays it again, so a
suite that takes under a minute anywhere else takes twenty and looks broken.

The fix is the filesystem, not the configuration. Copy the tree to local disk
and run there. Do not reach for `isolate: false` or a single fork to make the
numbers look better: environment setup is 6.6 seconds across the whole suite on
a real disk, so there is nothing to win, and isolation between test files is
worth more than six seconds.


## Phase 11 defect report, the abstraction test

**This section is a historical record.** It says what was true while game two
was being built, which is the whole of its value: a defect that leaves no trace
gets reintroduced. It is never edited to match today. The corrections it
proposes are live in the decisions sections above, and the current contract is
whatever `src/contract/` says. A reader checking present behaviour is in the
wrong section.

Requirement 7.4. CIPHER was built under the zero engine changes rule and every
change wanted was logged instead of made. Six defects were predicted in
`PHASE-11-PLAN.md` before a line was written. Four were confirmed, one was
struck, one was downgraded, and two that nobody predicted were found. The
predictions that missed matter more than the ones that hit, because they are
where the design review could not see.

**The sentence requirement 7.4 asks for: could a new game have been authored in
one file plus assets?** No. CIPHER is nine files plus a manifest, and three of
those exist only because the engine does not carry something every game needs.
The cheapest change that would have closed the gap is defect 7's, a documented
chunk format the engine reads by puzzle number, because it removes a format
every game must guess at and it is what unblocks a scaffolding script in Phase
12.

### Confirmed

**Defect 1. `ManifestDescriptor.granularity` admits only `"month"`.**
A year of CIPHER is 36 kilobytes and wants one file. CIPHER declares `"month"`
and returns the same URL from `urlForChunk` for every day, so the field states a
chunking the data does not have. Nothing reads it, which is the tell: it is a
decoration that can only ever be wrong. **Correction: remove it.** The index's
chunk pointers are the truth about chunking and they always were.

**Defect 2. Manifest obfuscation is a game's problem, and it is the same problem
every time.** Requirement 8.4 applies to every game and the keystream lived in
`games/poker-grid/manifest-codec.ts`. CIPHER copied it, which is how forty lines
become five copies that drift. **Correction: the keystream moves to
`engine/manifest-codec.ts`, keyed by puzzle number and position and parameterised
by radix.** Both games keep byte identical manifests, because both were already
running the same algorithm, so no data is regenerated.

**Defect 3. `custom` input promises keyboard support Layer 2 cannot supply.**
`ui/gridCursor.ts` serves a lattice. CIPHER needs a write cursor over four slots
and a palette of six, which is two lists, so `render.ts` carries about forty
lines of its own key handling. **Correction: documentation, not code.** The
contract now states plainly that `custom` means the game owns its keyboard
model, so a game author learns it from the type rather than from a surprise. A
shared list cursor is logged for game three, because one instance is not a
pattern and an abstraction drawn from a single example is the more expensive
mistake.

**Defect 4. The shell blanks a tier the module already computed.**
`main.ts` stored `tier: session.rated ? outcome.tier : null`, which assumes a
tier can only come from the manifest. CIPHER's tier is the guess count, correct
past the horizon and everywhere else. **Correction: the shell stops second
guessing.** A module that has nothing to grade against returns null itself,
which POKER GRID already does when `best` is null, so the engine gains nothing
by overriding and loses a true grade whenever a game does not need a manifest.

### Struck

**Defect 5. `hasWinLoss: true` had never run outside a unit test.** It ran, and
nothing was wrong. The win rate row renders, `completeLive` counts a win, and the
stats panel suppression logic behaves. A regression test was added so the first
true value is not also the last thing that exercised it. No engine change.

### Downgraded

**Defect 6. `deserialize` cannot detect a puzzle mismatch.** True of CIPHER and
unfixable inside it: every four symbol guess is legal against every code, so a
stale save deserializes cleanly. But the engine already gates it. `main.ts`
restores stored state only when `record.live.puzzleNumber` equals the day being
opened, and the archive path never restores at all. So the check POKER GRID
performs is defence in depth that its data shape happens to afford, not a
contract obligation CIPHER fails. **Correction: say who owns it.** The engine
owns puzzle identity, `StateFailure`'s `puzzle-mismatch` code stays available for
games that can cheaply detect it, and the shell guard gains a test so a later
refactor cannot quietly remove the thing every game is relying on.

### Not predicted

**Defect 7. The shell knows a chunk's internal shape, and calls it `boards`.**
`boot.ts` requires every game's manifest chunk to be an object with a `boards`
array whose entries carry a `number` field. That is game one's vocabulary and
game one's structure, enforced two layers away from any game and documented
nowhere: `ManifestDescriptor` says nothing about what a chunk contains. It also
fails dishonestly. A chunk with any other shape produces "No puzzle is published
for day N", which is a true statement about a manifest with a gap and a false one
about a manifest with the wrong envelope, so the engine reports missing content
when the real fault is format. CIPHER shipped a `boards` key for a game with no
board. **Correction: a documented neutral format.** A chunk holds `entries`
keyed by puzzle number, the engine reads it by key rather than scanning, and
`ManifestDescriptor` states the format so a game author reads it in the contract.
POKER GRID's twelve chunks are transformed rather than regenerated, because
`tools/verify.ts` re-derives every field from the seed and proves the transform
lossless.

**Defect 8. Two hub tests counted live games by hand.** Shipping CIPHER broke
`tests/hub/hub.test.ts` on the literals 5, 4, and 1, which have nothing to do
with the hub's behaviour. Small, but it is the shape of a defect that gets worse
with each game: a test that hardcodes what the registry already states makes
every launch a test edit. **Correction: the counts derive from `LIVE_GAMES` and
`SUITE_GAMES`.**

### What the phase says about the seam

The contract itself held. Three type parameters, erasure at one point, snapshot
serialization, semantic share tokens, and the tagged `Outcome` all absorbed a
game that shares nothing with POKER GRID: no board, no lattice, a real failure
state, a tier owing nothing to a manifest, and a puzzle of four bytes. Nothing in
`GameModule` had to grow a variant, and no game needed a special case anywhere in
the engine.

What did not hold is everything the contract left unsaid. Defects 1, 2 and 7 are
all the same failure in different places: the engine has opinions about manifests
that it never wrote down, so game two had to discover them by reading engine
source or by watching a puzzle fail to load. That is the work Phase 12's
`NEW_GAME.md` exists to end.


## Defects found and corrected in Phase 10

Requirement 7.4 asks for this report from game two onward. Phase 10 produced
one anyway, because it is the first time any of this code ran in a browser.

1. **`render.ts` assumed `dispatch` was asynchronous.** It decided whether a
   card completed a hand by reading its own `currentState` *after* dispatching
   the add. The shell applies synchronously and calls `update` from inside
   `dispatch`, so that read already showed five: the fourth card committed a
   four card hand and was rejected with a visible toast, and the fifth card
   committed nothing. POKER GRID was unplayable in a browser and every headless
   test passed, because no test had ever supplied a synchronous dispatch. Fixed
   by deciding from the length read before dispatching, which depends only on
   actions being applied in the order they were sent. Regression test added.
2. **Nothing in the contract exposed a graded result.** See suite decision 2.
3. **Phase 8 closed without a service worker.** Requirement 2.6 and 7.3.1 both
   need one and there is none. Logged in `BACKLOG.md` under Phase 8 remainder
   rather than built here, because it is not this phase's work.
