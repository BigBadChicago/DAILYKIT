# NEW GAME

This guide is the authoring path for a new game. It is written for one person with this repository and no chat history. A game in this codebase is a directory under `src/games/<id>/`, one entry file under `src/shell/entries/`, one row in the suite registry, one row in the build allow list, one row in the certification plans, and no engine change.

Rewritten in v3 migration phase 6, when the v2 contract was deleted. `GameModuleV3` in `src/contract/v3/game-module.ts` is the only game contract. ARCHITECTURE2.md sections 3, 44, 45 and 54 are the binding text behind this guide.

## 1. The one paragraph model

A game is a module whose default export is `defineGameV3(...)` over a `GameModuleV3`. The shell mounts that export through a single entry file, and the suite registry names the game for the hub. A finished game is graded once, by `inspect`, whose finished outcome carries the score, tier, bucket and difficulty the shell reads. The share string comes from one pure mapper, `shareArtifact`, over the game's own local run log, `telemetry`, and the engine renders and validates it. The build allow list never decides by hand whether a game ships: a game reaches a release only through its own committed `data/<id>/certification.json`, produced by `npm run certify`.

## 2. The order of work

**One conversation, design through delivery.** Standing rule since 2026-09-20,
set by the owner: a game's conversation runs every step below that happens in
the container, from the design document to the delivery patch, in one
uninterrupted pass. It is pre approved: no stops, no checkpoints and no questions.
Where a document leaves a choice open, decide, record the decision and its reason,
and keep moving. Only a genuine unresolvable contradiction in the source documents
or a hard technical impossibility halts the run. It ends when the patch is ready;
the owner's only action is the `tools/ship.ps1` command. Step 8, going live, is a
separate later patch after the owner's manual checks, never part of this run.

1. **Design document.** Write the game's design document before any code. Exit condition: it answers every item of ARCHITECTURE2.md section 44, listed in section 4 below, and the rules are testable in Node without a browser and need no invented behavior.
2. **Scaffold.** For a slate game that already has a `planned` registry row, run `npm run new-game -- --id <id>`: the row is adopted and the registry is left alone, template decision 10. For a new id, run `npm run new-game -- --id <kebab-case-id> --name "<DISPLAY NAME>" --hue <0-359>`. A live id is refused either way. Exit condition: the scaffold's own tests pass under `npm test` and nothing else was edited. Section 12 lists what it writes. Correct the adopted row's provisional values in the same change that builds the game, because the module test holds the two together.
3. **Rules.** Replace the scaffold's rules with the real ones, with complete tests, before any renderer is touched. Exit condition: every rejection path, terminal condition, determinism property and one legal state property pass in Node.
4. **Generation.** Build the generator, its generate and verify tools as two separate programs, and the verified manifest. Add `<id>:generate` and `<id>:verify` to `package.json`, and add `npm run <id>:verify` to `.github/workflows/ci.yml` before the certify step. Exit condition: at least 365 days are generated, a separate process verifies every day, and `data/<id>/manifest.index.json` declares the horizon.
5. **Module.** Fill in the module and its state shape. Exit condition: parsing, fallback generation, snapshot round trip, outcome grading with bucket and difficulty, the run log, the artifact and the share leak checks pass module tests.
6. **Renderer.** Build the renderer and style. Exit condition: keyboard and declared pointer input work, announcements and visible focus work, and the layout passes at 360 pixels with reduced motion.
7. **Certification plan.** Replace the five steps the scaffold left empty in the game's `GAME_PLANS` row, section 6. Exit condition: with the registry row still `planned`, every probe the plan names exists and passes locally.
8. **Go live.** Set the registry row to `live`, run `npm run certify`, and commit `data/<id>/certification.json` with the change. Exit condition: certify reports the game production safe and `certify -- --check` passes. Never set `productionSafe: true` on the build target; the build throws if you do.
9. **Defect report.** Exit condition: every engine change the game wanted is logged as a defect, the report is appended before any correction, and no engine source changed during the build.

This order is not a preference. A game must be playable through a Node script before a browser sees it, because a renderer written against unproven rules debugs two things at once.

## 3. The contract checklist

Every member of `GameModuleV3` must be filled in and every one of them has a duty.

1. `identity`: Stable id, display name, epoch, share URL, accent, and one line rule. The id must be lowercase kebab case. It is also the seed namespace and the storage key, so a changed id is a migration.
2. `input`: A grid or a custom keyboard model. The shell never guesses which one a game uses. Grid games read through `ui/gridCursor.ts` or native buttons; custom games own their keyboard handling.
3. `manifest`: The index URL and the lookahead window. The shell fetches the index and the module parses one entry when a day is opened. Chunks use `entries` keyed by puzzle number.
4. `archiveEnabled`: Whether a game keeps a replay archive.
5. `hasWinLoss`: Whether the game has a real win and loss. The win rate row renders only when this is true.
6. `stateVersion`: The module owned payload version. The storage envelope version is engine owned and separate.
7. `distribution`: The histogram labels and the distinguished bucket index. Its length must equal the registry row's `bucketCount`.
8. `shareCapabilities`: The share grammar, at least two telemetry patterns from ARCHITECTURE2.md section 13, and `maxRows`, never above seven.
9. `parsePuzzle`: The manifest entry parser. It rejects malformed content, and it never fetches or generates.
10. `generatePuzzle`: The fallback for a day past the manifest horizon. Deterministic, and unrated when the game has no stored optimum.
11. `firstSessionPuzzle`: Optional. A tutorial board that is not today's puzzle and is never counted.
12. `initialState`: The in progress state for the puzzle being opened. Pure.
13. `serialize`: A snapshot of the game payload. Not an action log, and nothing the engine owns.
14. `deserialize`: Validation and reconstruction against the supplied puzzle. A malformed or impossible save is a value failure. `puzzle-mismatch` is optional because the engine owns puzzle identity.
15. `migrateState`: The explicit path from older payload versions to `stateVersion`. Refuse rather than invent history a save does not hold.
16. `apply`: The pure action reducer. Routine invalid actions are rejection values with an announcement, never exceptions.
17. `inspect`: The pure terminal decision. A finished outcome carries `score`, `won`, `detail`, `tier`, `bucket` and `difficulty`. It is the only place a result is graded, so there is no separate bucket or tier function to drift from it.
18. `difficulty`: One emergent integer measured from the puzzle the same way certification measures it, never read back from a stored manifest field.
19. `telemetry`: The compact local run log of the player's own actions, held on device. It is not analytics and it is never sent anywhere.
20. `shareArtifact`: The pure mapper from run log to artifact: title, semantic token rows, the finished outcome, and a behavioral fingerprint. No hidden puzzle data may enter it. The engine appends the URL and enforces the nine line grammar, and rows must be the same width because nothing pads them.
21. `mount`: The game specific DOM mount. It receives `MountContext`, owns only its host, and returns a per session `GameView`.
22. `help`: Structured help with a worked example and a text equivalent for any drawn example.

A game author must be able to read the contract and not discover its rules by trial and error. Anything the engine expects that is not written in the contract, this guide, or the architecture documents is a defect to report.

## 4. The design document

ARCHITECTURE2.md section 44 lists what a design document must settle before the game may enter the production allow list. A game whose generation or artifact design is still aspirational is a concept, not a production candidate.

1. one sentence rule
2. cognitive mode
3. substrate and its hardest substrate gate
4. session length
5. input model
6. puzzle generator strategy
7. measured generation acceptance rate
8. state space census
9. exact or bounded verification method
10. uniqueness claim, if applicable
11. fairness claim
12. decomposition result
13. symmetry result
14. one emergent integer difficulty measure
15. seven band calibration evidence
16. Monday versus Sunday player feel statement
17. every refusal and announcement
18. histogram buckets
19. at least two telemetry patterns
20. exact telemetry record shape
21. exact mapping function
22. clipboard artifact
23. graphic card artifact specification
24. share leak test result
25. fingerprint definition
26. browser fallback budget
27. all ten contract pieces
28. explicit risks

A new game also appends to the numbered decisions in `ARCHITECTURE.md` and `ARCHITECTURE2.md`, and never renumbers or edits a settled entry in place.

## 5. Verification gate

Before any fix is reported as done, all of these must pass, in this order: `typecheck`, `typecheck:tools`, `typecheck:sw`, `depcheck`, `test`, the verify script for any game whose rules, scoring, generator, or codec you touched, then `build`, then `budget`. Paste the real output. Never report a fix as done on reasoning alone.

```text
npm ci                      once, or after a dependency change
npm run typecheck           the browser program
npm run typecheck:tools     the Node tools program
npm run typecheck:sw        the service worker program
npm run depcheck            the layer rule
npm test                    Vitest, whole suite
npm run poker-grid:verify   replays the committed manifest through the solver
npm run cipher:verify       the same for CIPHER
npm run vector:verify       the same for VECTOR, about 100 seconds
npm run build               the one pass release build, writes dist/
npm run budget              per page gzipped cold load against 150 KB, needs dist/
npm run certify             the section 45 gate for every live game, writes changed records
npm run certify -- --check  the same, and fails if a committed record would change
npm run dev                 dev server, no service worker
npm run preview             serves dist/, service worker active
npm run build:harness       includes the share string harness at /harness/
```

In the container, where one command is cut off at 300 seconds, run the whole list detached with `setsid nohup npm run gate > /tmp/gate.log 2>&1 &` and read `/tmp/gate.log`: `tools/gate.sh` prints one PASS or FAIL line per step, runs every `:verify` script it finds in package.json, and keeps each step's full output in `/tmp/gate.<step>.log`. Added 2026-09-21 with FIVE LETTERS.

Run `certify` through npm. It starts each probe script with the npm that started it and needs no shell, and it refuses to run when started any other way.

## 6. Certification

A game ships only through its own record. There is no other path, and no exemption covers a new game: `manual-mobile-2026-09-16` names the three games that shipped before the gate and nothing else.

**How it works.** `GAME_PLANS` in `tools/certify.ts` says what each of the nineteen steps of ARCHITECTURE2.md section 45 means for each game. `npm run certify` evaluates the plan of every `live` registry game, writes `data/<id>/certification.json` when an outcome changes, and exits non zero for a game that is not production safe. `vite.config.ts` admits a game target to a release build only when that record is production safe on the build's local date. CI runs `certify -- --check --from-ci` last.

**What the scaffold writes.** One row, `"<id>": { ...newGamePlan("<id>") }`, inserted above the `/* NEW_GAME_INSERTION: GAME_PLANS */` marker. `newGamePlan` gives the automated steps real probes: the suite wide steps, the scaffold's own `generator`, `module` and `render` tests, `npm run <id>:verify`, the manifest horizon, and the byte budget over this game's page. A probe on a script or file the game has not added yet fails, and a failure refuses.

**The five empty steps.** `difficulty-calibration`, `decomposition-check`, `symmetry-check`, `offline-smoke` and `manual-mobile-check` have an empty probe list. The gate records an empty list as a skip, and a skip refuses whatever else the record says. Replace each by overriding its key after the spread:

```ts
  "sample-game": {
    ...newGamePlan("sample-game"),
    "difficulty-calibration": probes(file("data/sample-game/study.json"), testFile("tests/games/sample-game/difficulty.test.ts")),
    "offline-smoke": { kind: "manual", date: "2026-10-02", evidence: "Headless Chromium against vite preview ..." },
  },
```

1. `difficulty-calibration`: the committed calibration study and the test that recomputes it.
2. `decomposition-check` and `symmetry-check`: the game's checkers from ARCHITECTURE2.md section 12. `n/a` with a written reason is accepted by the gate, but only a person may write that reason, after checking it.
3. `offline-smoke`: a `manual` result recording the date and what was observed, rerun after any change to the worker or asset naming.
4. `manual-mobile-check`: a `manual` result from running MANUAL-CHECKS.md for this game.

**Guards that already hold.** A scaffolded game is `planned`, so certify does not evaluate it and CI does not require its verifier until it is marked live. Once live, the certify tests require every npm script its plan names to exist in `package.json` and to run in `ci.yml` before the certify step, and every file its plan names to exist. The evidence in a record names test files by path, so moving or renaming a named test changes the record: update the plan, rerun `npm run certify`, and commit the record with the change.

## 7. The abstraction test

Requirement 7.4 applies to every game after game one. The new game must be authored with zero engine changes. If an author wants an engine change, that is a finding and it is logged as a defect report, not a permission. The report comes after the game is built, and the correction is a later change after the report, not part of the build itself.

## 8. What is already decided

A new game does not choose everything. The following are settled and must be followed:

1. The share vocabulary is closed to games. It is in `src/shared/share-vocabulary.ts`, and rows are semantic tokens, never codepoints.
2. Tier names are suite wide. They are in `src/engine/tiers.ts` and the structural mirror in `src/core/types.ts`.
3. The share grammar belongs to the engine: nine lines, seven rows, eight tokens a row, the same width in every row. `src/engine/share-grammar.ts`.
4. The storage envelope belongs to the engine. Contract decision 8 and engine decision 8.
5. Puzzle identity is owned by the engine. Contract decision 14.
6. Chunks are keyed entries by puzzle number, and the index owns how many chunks exist. Contract decisions 13 and 17.
7. The run log never leaves the device. Any proposal to send it somewhere is refused.

## 9. The accessibility floor

A renderer must pass this list before it is considered complete:

- full keyboard play
- visible focus
- live region announcements
- no meaning in color alone
- 44 pixel touch targets
- a 360 pixel viewport
- `prefers-reduced-motion` honoured

## 10. Worked references

Use real implementations when writing a new game. The scaffold output is the smallest game that meets the whole contract and the gate's automated steps; `toy-v3` is the smallest that meets the contract alone.

| Checklist item | POKER GRID | CIPHER | VECTOR |
|---|---|---|---|
| Module, outcome, share capabilities | `src/games/poker-grid/module.ts` | `src/games/cipher/module.ts` | `src/games/vector/module.ts` |
| Rules and rejections | `src/games/poker-grid/rules.ts` | `src/games/cipher/rules.ts` | `src/games/vector/rules.ts` |
| Run log, artifact, leak probes | `src/games/poker-grid/telemetry.ts` | `src/games/cipher/telemetry.ts` | `src/games/vector/telemetry.ts` |
| Difficulty measure | `src/games/poker-grid/difficulty.ts` | `src/games/cipher/difficulty.ts` | `src/games/vector/rules.ts` |
| Generator | `src/games/poker-grid/generator.ts` | `src/games/cipher/generator.ts` | `src/games/vector/generator.ts` |
| Generation and verification tools | `tools/generate.ts`, `tools/verify.ts` | `tools/cipher-generate.ts`, `tools/cipher-verify.ts` | `tools/vector-generate.ts`, `tools/vector-verify.ts` |
| Renderer and accessibility | `src/games/poker-grid/render.ts` | `src/games/cipher/render.ts` | `src/games/vector/render.ts` |
| Help and text equivalent | `src/games/poker-grid/help.ts` | `src/games/cipher/help.ts` | `src/games/vector/help.ts` |
| Module and share tests | `tests/games/poker-grid/module.test.ts` | `tests/games/cipher/module.test.ts` | `tests/games/vector/module.test.ts` |
| Certification plan | `GAME_PLANS["poker-grid"]` | `GAME_PLANS.cipher` | `GAME_PLANS.vector` |

ROTATE LOCK, the first game authored on v3 through this guide, is the reference for a `custom` input game with an ORDER plus rotation tray, a route solver shipped to the browser, a verifier that enumerates by a different method, and a plan row that overrides four of the stub's five empty steps: `src/games/rotate-lock/` and `ROTATE-LOCK.md`.

## 11. The traps

- `dispatch` is synchronous and a renderer must not read its own state after dispatching. The shell applies synchronously and then calls update.
- Data under `data/<game>/` is generated and never hand edited, and that includes `certification.json`: certify refuses a record whose outcomes do not match its hash.
- A game never imports another game.
- A solver must never be importable from the browser bundle if it carries a large table.
- A renderer must never draw the answer. The scaffold's test checks that the target cell looks like every other cell until it is found.
- The test suite is slow only on a bridge filesystem, so run from local disk for the full suite.

The dash rule is operationally narrow. A generated file must contain no en dash or em dash, and no hyphen surrounded by whitespace. Hyphens inside identifiers, paths, class names, and compounds are allowed. The test must use `/[–—]|(?<=\s)-(?=\s)/`, not a kebab case matcher.

## 12. The scaffold contract

The scaffolding tool is a generator, not a document. It writes a small but honest daily game that the author replaces rule by rule: find one target cell on a three by three board in at most three misses. It compiles, it passes its own tests, and it contains no placeholder comment and no `TODO` text.

It writes these files:

- `src/games/<id>/rules.ts`
- `src/games/<id>/generator.ts`
- `src/games/<id>/module.ts`
- `src/games/<id>/render.ts`
- `src/games/<id>/style.css`
- `src/games/<id>/help.ts`
- `src/shell/entries/<id>.ts`
- `src/shell/entries/<id>.html`
- `tests/games/<id>/rules.test.ts`
- `tests/games/<id>/generator.test.ts`
- `tests/games/<id>/module.test.ts`
- `tests/games/<id>/render.test.ts`

And it inserts up to three rows, each above its marker, after checking every file and marker before writing anything:

- `src/shell/registry.ts`, `/* NEW_GAME_INSERTION: SUITE_GAMES */`: a `planned` row, for a new id only. An id with a `planned` row is adopted instead: the module takes the row's display name, rule, accent, epoch, bucket count from 3 to 7, win and loss flag and state version, and the registry is not written.
- `vite.config.ts`, `/* NEW_GAME_INSERTION: TARGETS */`: a target with `productionSafe: false`, which stays false forever.
- `tools/certify.ts`, `/* NEW_GAME_INSERTION: GAME_PLANS */`: the `newGamePlan` row of section 6.

A generated game is not finished when it exists. It is finished when the author has replaced its trivial rules with a real puzzle, a real distribution and a real share layout, and its own record says it is production safe.
