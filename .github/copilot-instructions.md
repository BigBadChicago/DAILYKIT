# DAILYKIT, instructions for GitHub Copilot

You are working as the maintaining engineer on DAILYKIT. These instructions are
always in context. Read them fully before your first edit in a session, and
treat them as binding.

Prose you write for this project, including code comments, commit messages, and
documentation, must not use dashes as punctuation. Hyphens inside a compound
word are fine. Rewrite the sentence instead.

## 1. What DAILYKIT is

DAILYKIT is a suite of five daily puzzle games on one static site, in the genre
of Wordle and Connections. One puzzle a day, identical for every player
worldwide, a spoiler free share block, and a streak. Two games are built today,
POKER GRID and CIPHER. The engine and the games are separated by a contract so
that a new game is one directory plus one entry file and zero engine changes.

The product is the suite, not any one game. The share block is the entire
distribution mechanism. Daily content cost is zero: every puzzle is generated
from a seed and verified by machine.

## 2. The documents that outrank this file

Read these before acting. They are in the repository root.

| Document | What it is | When you must read it |
|---|---|---|
| `ARCHITECTURE.md` | The living manifest. Every file, its responsibility, its imports, plus every numbered design decision ever settled | Always, first, before any edit |
| `BACKLOG.md` | Everything deliberately not built, each with a rationale | Before proposing anything that is not a defect fix |
| `MANUAL-CHECKS.md` | The manual test list and its results table | When working any manual check failure |
| `POKER-GRID.md` | POKER GRID rules, scoring, tiers, share layout | When touching `src/games/poker-grid/**` |
| `CIPHER.md` | CIPHER rules, feedback model, share layout | When touching `src/games/cipher/**` |
| `SLATE.md` | The approved five game slate | When a question involves which games exist |
| `ASSETS.md` | Every shipped asset and its license | When adding or changing any asset |
| `README.md` | Setup and the command list | For environment questions |

**`ARCHITECTURE.md` is authoritative.** If it and this file disagree, follow
`ARCHITECTURE.md` and say plainly in your reply that the two disagree, naming
the section. Do not silently pick one.

`ARCHITECTURE.md` carries numbered decision registries: contract decisions,
engine decisions, presentation decisions, generation decisions, suite
decisions, offline decisions, CIPHER generation decisions, settled charter
decisions, and resolutions of internal conflicts. Each numbered item is a
settled decision with its reasoning attached.

**A change that contradicts a numbered decision is not yours to make.** Stop,
state which decision your fix would break, state the evidence that the decision
is unworkable as written, propose the smallest amendment, and wait. Do not
implement first and mention it after.

## 3. Hard constraints, never violated

These come from the project charter. A fix that breaks one of them is not a fix.

1. **TypeScript, strict.** No `any` outside clearly marked boundary code.
   `noUncheckedIndexedAccess` is on, so index reads are `T | undefined` and must
   be narrowed rather than asserted.
2. **No framework.** No React, Vue, Svelte, or anything similar. Direct DOM
   through `src/ui/dom.ts`.
3. **No runtime dependencies at all.** Build time dependencies are limited to
   TypeScript, Vite, Vitest, tsx, and jsdom, which is a test environment. Adding
   a package to `package.json` is a constraint change and needs approval, not a
   commit.
4. **Fully static output.** HTML, CSS, JS, and JSON. No backend, no database, no
   environment variables at runtime.
5. **No accounts and no server state.** All player state is in `localStorage`.
6. **Offline capable.** A returning player with no connection plays today's
   puzzle from the service worker cache.
7. **Performance budget.** Cold load under 150 KB gzipped per page, asserted by
   `npm run budget`. Time to interactive under two seconds on a mid tier phone
   with 4x CPU throttling.
8. **Browser support.** Last two versions of Chrome, Safari, Firefox, and Edge,
   plus iOS Safari two majors back. No transpilation to ES5. No API that the
   oldest of those lacks unless it is feature detected with a working fallback.
9. **Privacy.** No third party scripts, no cookies, no fingerprinting, no
   analytics. `src/engine/telemetry.ts` is a no operation seam and stays one.
10. **Accessibility.** Full keyboard play, visible focus, live region
    announcements, never meaning in color alone, `prefers-reduced-motion`
    respected, WCAG 2.1 AA contrast, touch targets at least 44 by 44 CSS pixels,
    designed at a 360 pixel viewport first.

## 4. The layer rule

A layer imports only from layers strictly below it. The engine never imports
from a game. A game never imports from another game.

```
Layer 5  src/shell, src/hub          the app shell, the hub, per game entries
Layer 4  src/games/*                 one directory per game
Layer 3  src/contract                the GameModule seam
Layer 2  src/ui                      the presentation kit
Layer 1  src/engine                  storage, stats, share, lifecycle, scheduler
Layer 0  src/core                    rng, seed, date, result, types
```

`src/shared` sits beside Layer 0 and imports nothing. `tools/` runs in Node
only, may import Layers 0 through 4, and is never bundled into a browser build.
`src/sw` is the service worker and has its own TypeScript program, because the
WebWorker lib cannot share a program with DOM.

Enforced by `npm run depcheck`, which fails CI. If a fix seems to need an
upward import, the fix is in the wrong layer. The two standard escapes, both
already used in the codebase, are: declare a structural mirror of the type in
the lower layer, or inject the dependency as a parameter or port.

## 5. POKER GRID locked decisions, never reopened

These seven were settled before the project began. Implement around them. Do not
propose alternatives. If implementation shows one is genuinely unworkable, stop
and report the specific conflict with evidence.

1. The board is 5 columns by 7 rows, 35 cards, portrait.
2. A hand is five orthogonally connected cards selected by dragging a path. Tap
   to add and tap to remove must also work.
3. Gravity is downward with no refill. The player has perfect information from
   the first tap.
4. There is no failure state. Play ends when no legal five card connected group
   remains. The streak counts played, not won.
5. The scoring table is empirical, calibrated from measured availability, not
   from dealt poker odds. High card is not a legal hand. Score is hand quality
   plus cards cleared, with cards cleared dominant.
6. The optimum is computed offline and shown afterwards as one of five named
   tiers. A beam result is labelled best known, never optimal.
7. A standard 52 card deck with no duplicates on a board.

### Invariants to assert and never break

1. Maximum seven hands per board, minimum zero.
2. Board count starts at 35 and decreases by exactly 5 per accepted hand.
3. No card appears twice on one board.
4. Every accepted selection is exactly five cells, connected under four way
   adjacency.
5. After settling, no cell has an empty cell beneath it in the same column.
6. Terminal is reached if and only if no connected five card group forming a
   pair or better exists.

Engine side invariants that matter just as much:

7. A streak advances only when a live puzzle completes at exactly one above the
   last completed number. No clock reading can award a skipped day.
8. Archive results never touch streaks, the main distribution, or lifetime
   counters.
9. The storage envelope version is the engine's and the payload version is the
   module's. The engine never opens `data`, the module never sees the envelope.
10. Every storage read failure converges on a fresh record with `recovered`
    true. Boot never throws.
11. A share block never reveals a card, a suit, a position, or any part of a
    solution, and never exceeds its row cap.

## 6. Commands, and the verification gate

```text
npm ci                      once, or after a dependency change
npm run typecheck           the browser program
npm run typecheck:tools     the Node tools program
npm run typecheck:sw        the service worker program
npm run depcheck            the layer rule
npm test                    Vitest, whole suite
npm run poker-grid:verify   replays the committed manifest through the solver
npm run cipher:verify       the same for CIPHER
npm run build               the one pass release build, writes dist/
npm run budget              per page gzipped cold load against 150 KB, needs dist/
npm run dev                 dev server, no service worker
npm run preview             serves dist/, service worker active
npm run build:harness       includes the share string harness at /harness/
```

**The gate.** Before you report any fix as done, all of these must pass, in this
order: `typecheck`, `typecheck:tools`, `typecheck:sw`, `depcheck`, `test`, the
verify script for any game whose rules, scoring, generator, or codec you
touched, then `build`, then `budget`. Paste the real output. Never report a fix
as done on reasoning alone.

`npm test` is about 43 files, 463 tests, and 57 seconds on local disk. If it
appears to hang for many minutes, read the section "Running the test suite" in
`ARCHITECTURE.md` first: on a mounted network or bridge filesystem `require
("jsdom")` alone costs around 61 seconds per test file. The fix is to run from
local disk. Do not change the Vitest configuration to make the number look
better.

## 7. Working a MANUAL CHECKS failure

`MANUAL-CHECKS.md` is run by a human on real devices and real chat clients. When
a check fails you are given the section number, the platform or client, and what
was seen. Follow this protocol every time.

**Step 1, restate the failure as an expectation.** Quote the pass condition from
`MANUAL-CHECKS.md` verbatim, then state what happened instead. If the report is
ambiguous about which pass condition failed, ask before touching code.

**Step 2, reproduce it in the repository, not in your head.** Choose the cheapest
faithful reproduction:

- Share block shapes and widths: `npm run build:harness` and read `/harness/`,
  or write a Vitest case against `src/engine/share.ts` and the module's
  `shareBlock`.
- Layout and viewport: build, preview, and inspect at 360 pixels.
- Storage, streaks, migrations, clock jumps: a Vitest case against
  `src/engine/storage.ts` or `src/engine/stats.ts`. Never a manual browser poke.
- Offline and caching: build, preview, then check the service worker behaviour
  with the network disabled.
- Rules, scoring, generation: a Vitest case against the game's own modules.

If you cannot reproduce it, say so plainly and list exactly what extra
information from the device would let you. Do not guess a fix at a symptom you
have not seen.

**Step 3, locate the layer before writing anything.** Use the table in section 8.
A defect fixed in the wrong layer is a defect duplicated in five games later.
Ask: is this the engine's job for every game, the presentation kit's job for
every screen, or this one game's job? Fix it in the lowest layer where the
statement "every game needs this" is still true, and no lower.

**Step 4, write the failing test first.** A manual check failure that a test
could have caught means the suite has a hole, and the hole is part of the
defect. Add the test, watch it fail for the right reason, then fix. If the
failure genuinely cannot be automated, for example a glyph that renders as tofu
on one platform, say so explicitly and record the reason in your report.

**Step 5, fix the cause, not the symptom.** No defensive `try` around a bug, no
special case for the reported input, no widening a type to make an error go
away. If two fixes are possible, prefer the one that removes the possibility of
the defect over the one that handles it.

**Step 6, run the whole gate from section 6.** Not just the test you added.

**Step 7, update the documentation in the same change.** See section 9.

**Step 8, report.** Your report contains, in this order: the pass condition that
failed, the cause in one or two sentences, the fix and the layer it landed in,
the test that now covers it, the gate output, the documents you updated, and
anything you deliberately did not do with the reason. If you changed a numbered
decision or added a backlog entry, say so at the top, not the bottom.

## 8. Symptom to layer, a diagnosis table

| Symptom | Look first | Then |
|---|---|---|
| Share block rows misaligned or a glyph wrong | `src/shared/share-vocabulary.ts` | `src/engine/share.ts` padding, then the module's `shareBlock` |
| Share block too tall, or truncated in a client | the module's `shareBlock` row cap | `src/engine/share.ts`, then `POKER-GRID.md` or `CIPHER.md` share sections |
| Daily card row wrong or misaligned | `src/engine/dailycard.ts` | `src/shell/suite.ts`, then the hub |
| Copy or share sheet misbehaves | `src/engine/share.ts` delivery chain | the caller in `src/shell/main.ts` |
| Wrong puzzle number, rollover late or early | `src/core/date.ts` | `src/engine/scheduler.ts` |
| Streak wrong after a gap, a jump, or a replay | `src/engine/stats.ts` | `src/engine/storage.ts`, then the watermark rules in `ARCHITECTURE.md` |
| Progress lost, or a banner about saving | `src/engine/storage.ts` | the module's `serialize` and `deserialize` |
| Stats or histogram wrong | `src/engine/stats.ts` and the module's `bucketOf` | `src/ui/statsPanel.ts` |
| Board renders wrong, input ignored, drag broken | that game's `render.ts` | `src/ui/gridCursor.ts`, then the module's `apply` |
| Keyboard cannot reach or operate something | `src/ui/a11y.ts` and `src/ui/gridCursor.ts` | the renderer's ARIA wiring |
| Modal, toast, focus, or scroll lock misbehaves | `src/ui/modal.ts`, `src/ui/toast.ts`, `src/ui/a11y.ts` | the caller |
| Theme, contrast, or accent wrong | `src/ui/theme.ts` and `src/ui/chrome.css` | the per game CSS |
| Layout broken at 360 pixels | the owning CSS file | `src/ui/chrome.css` tokens |
| Offline fails, or a stale asset is served | `src/sw/sw.ts` | `tools/sw-manifest.ts` and the build in `vite.config.ts` |
| Today's puzzle unavailable or unreadable | `src/shell/boot.ts` | the module's `parsePuzzle`, then the manifest data |
| Hub card status wrong | `src/shell/suite.ts` | `src/shell/registry.ts`, then `src/hub/hub.ts` |
| A game is missing, mislabelled, or misrouted | `src/shell/registry.ts` | `vite.config.ts` allow list and the entry file |
| Changelog shows at the wrong time | `src/shell/changelog.ts` | the caller in `src/shell/main.ts` |
| Practice board issues on a first visit | `src/games/<game>/tutorial.ts` | `startTutorial` in `src/shell/main.ts` |
| Puzzle too hard, too easy, or degenerate | that game's `generator.ts` and the bands | `tools/<game>-generate.ts`, then regenerate and verify |
| A stored best or tier looks wrong | that game's `solver.ts` and `scoring.ts` | the manifest entry, verified by the verify script |
| Bundle too large, or a chunk in the wrong place | `vite.config.ts` chunking | the import that pulled it in |

## 9. Documentation duties, part of every change

A change is not finished until the documents match it. This is not overhead, it
is how the next session resumes without chat history.

1. **`ARCHITECTURE.md` file manifest.** A new file gets a row: path, layer, one
   sentence responsibility, imports. A file whose role changed gets its row
   corrected. A deleted file loses its row.
2. **`ARCHITECTURE.md` decisions.** A fix that settles something a future reader
   could reasonably undo gets a numbered entry in the matching decisions
   section, written as the decision plus why the alternative was rejected. Keep
   the existing numbering. Append.
3. **`BACKLOG.md`.** Anything you deliberately did not build, including a better
   fix you rejected as out of scope, gets one line and a rationale. This is also
   how a feature request is declined.
4. **`MANUAL-CHECKS.md`.** If a check's pass condition was wrong or incomplete,
   fix the check. If your fix adds a new thing a human should look at, add the
   row. Do not fill in the results table yourself: it records human runs.
5. **`src/shell/changelog.ts`.** Any change a player would notice gets an entry
   at the next integer version, with the games it touches, or `SUITE_WIDE`.
6. **`ASSETS.md`.** Any new shipped asset, with origin and license.
7. **`POKER-GRID.md` or `CIPHER.md`.** Any change to that game's rules, scoring,
   tiers, or share layout.

## 10. Code style

- Comments explain why, never what. Terse. A comment that restates the line is
  noise. A comment that records a rejected alternative is worth its space.
- Failures in game logic are values, not exceptions. Use the `Result` type in
  `src/core/result.ts`. A rejection carries a machine `code` and a human
  `announce` sentence, and the engine is what puts that sentence in the live
  region.
- Pure rules. `apply`, `inspect`, `bucketOf`, `shareBlock`, and every generator
  and solver function are pure: no DOM, no clock, no randomness beyond the
  seeded RNG.
- Never set HTML from a string. No `innerHTML`, no `insertAdjacentHTML`, no
  template into markup. Build nodes with `src/ui/dom.ts` and write text through
  `textContent`. This removes injection as a category.
- Never read the clock inside Layer 0 or Layer 1. The caller supplies `now`.
- Never use `Math.random`. Determinism is the product. Use `src/core/rng.ts`
  seeded from `src/core/seed.ts`.
- Only the operations in `rng.ts` are permitted for random arithmetic, because
  they are the ones ECMAScript defines exactly on 32 bit integers, which is what
  makes a stream identical in Node and in every browser.
- Prefer boring and durable. One person will maintain this at ten hours a week
  in two years.

## 11. Never do these

1. Add a runtime dependency, or any dependency, without approval.
2. Import upward across a layer, or from one game into another.
3. Edit a file under `data/` by hand. Manifests are generated and verified. Fix
   the generator, regenerate the range, and run the verify script.
4. Change `ENGINE_VERSION` or `SW_REVISION` in `vite.config.ts` casually. Each
   invalidates caches for every player. Change either only when the reason is
   stated and approved.
5. Weaken, skip, or delete a test to make a suite green. A failing test is
   information. If a test is genuinely wrong, say why in your report before
   changing it.
6. Reopen a locked decision, or quietly work around a numbered decision.
7. Widen a type, add `any`, or add a non null assertion to silence a compiler
   error that is telling you the truth.
8. Add analytics, a cookie, a third party script, a font from a CDN, or any
   network call that is not to this site's own origin.
9. Regenerate the whole manifest horizon to fix one day. Generation takes over an
   hour and rewrites data that is already verified.
10. Claim a fix is verified without pasting the command output.
11. Use dashes as punctuation in anything you write.
12. Build something that is not in the charter. It goes in `BACKLOG.md` instead.

## 12. When to stop and ask

Stop, explain, and wait when any of these is true. Do not proceed on your best
guess.

- The fix requires contradicting a numbered decision or a locked decision.
- The fix requires a new dependency, a build tool change, or a change to a hard
  constraint.
- The failure cannot be reproduced from the information given.
- Two reasonable fixes exist at different layers and the choice changes the
  contract that future games are written against.
- The fix would change stored data shapes for players who already have saves,
  and no migration path is obvious.
- The report describes something the code does deliberately, and the deliberate
  behaviour is recorded in `ARCHITECTURE.md`. Say which decision, and ask whether
  the decision should change.

## 13. Definition of done for any fix

- [ ] The pass condition that failed now passes, demonstrated rather than argued.
- [ ] A test covers it, or the report says why automation is impossible.
- [ ] The fix is in the lowest layer where it belongs, and no lower.
- [ ] `typecheck`, `typecheck:tools`, `typecheck:sw`, `depcheck`, `test` pass.
- [ ] The relevant `*:verify` script passes if game data or rules were touched.
- [ ] `build` then `budget` pass.
- [ ] `ARCHITECTURE.md` matches the tree, and any decision is recorded.
- [ ] `BACKLOG.md` carries anything deferred.
- [ ] A changelog entry exists if a player would notice.
- [ ] The report follows the shape in section 7 step 8.
