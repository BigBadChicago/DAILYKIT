# NEW GAME

This guide is the authoring path for a new game. It is written for one person with this repository and no chat history. A game in this codebase is a directory under `src/games/<id>/`, one entry file under `src/shell/entries/`, one line in the suite registry, one line in the build allow list, and no engine change.

## 1. The one paragraph model

A game is a module that satisfies `GameModule`. The shell loads it through a single entry file and the suite registry names it for the hub. The build allow list decides whether the game is visible in a release build, and the engine never changes to make one game behave differently. Every game is a daily puzzle with a manifest index, a seeded generator, a pure rules file, a renderer, and a share block.

## 2. The order of work

1. Write the design document and the rule set. Include identity, rules, state, actions, rejection table, terminal condition, scoring, tiers, distribution, serialization, share examples, accessibility, and verification. Exit condition: the rules are testable in Node without a browser and require no invented behavior.
2. Build pure rules and complete tests before any renderer is touched. Exit condition: every rejection path, terminal condition, determinism property, and one legal state property pass in Node.
3. Build the generator, its two separate tools, and the verified manifest. Exit condition: 365 days are generated and a separate process verifies every day before a browser sees it.
4. Write the module and its state shape. Exit condition: parsing, fallback generation, snapshot round trip, outcome grading, distribution buckets, and share rows pass module tests.
5. Build the renderer and style. Exit condition: keyboard and declared pointer input work, announcements and visible focus work, and the layout passes at 360 pixels with reduced motion.
6. Add the entry file and the two configuration lines. Exit condition: the entry imports the module and calls `mountShell`, the registry entry is `planned`, and the allow list entry is `productionSafe: false` until the game is ready.
7. Write the defect report. Exit condition: every wanted engine change is logged as a defect, the report is appended before corrections, and no engine source was changed during the build.

This order is not a preference. A game must be playable through a Node script before a browser sees it, because a renderer written against unproven rules debugs two things at once.

## 3. The contract checklist

Every member of `GameModule` must be filled in and every one of them has a duty.

1. `identity`: Stable id, display name, epoch, share URL, accent, and one line rule. The id must be lowercase kebab case. It is also the seed namespace, so a changed id is a migration.
2. `input`: A grid or a custom keyboard model. The shell never tries to guess which one a game uses. Grid games read through `ui/gridCursor.ts`, custom games own their keyboard handling.
3. `manifest`: The index URL and the lookahead window. The shell fetches the index and the module only parses one entry when a day is opened. Chunks use `entries` keyed by puzzle number. This records Phase 11 defects 1 and 7.
4. `archiveEnabled`: Whether a game keeps a replay archive.
5. `hasWinLoss`: Whether the module has a real win and loss shape. The suite win rate row renders only when this is true.
6. `stateVersion`: The module owned payload version. The storage envelope version is engine owned and stays separate.
7. `distribution`: The histogram labels and the distinguished bucket index. The engine renders it and the module decides what a finished outcome means.
8. `parsePuzzle`: The manifest entry parser. It must reject malformed content and is the place to validate the schema from one manifest entry. It must not fetch or generate.
9. `generatePuzzle`: The fallback for a day outside the manifest horizon. That path must be deterministic and unrated if the game has no stored optimum.
10. `firstSessionPuzzle`: Optional. It enables a tutorial board that is not today's puzzle and is never counted. If absent, the game uses the help panel over today's board.
11. `initialState`: The in progress state. It must be pure and it must match the puzzle being opened.
12. `serialize`: The game payload snapshot. It must not become an action log or include data the engine owns.
13. `deserialize`: Validation and reconstruction against the supplied puzzle. Return a value failure for malformed state. `puzzle-mismatch` is optional because the engine owns puzzle identity under contract decision 14.
14. `migrateState`: The explicit path from older payload versions to `stateVersion`. Do not migrate the engine envelope, history, or archive payloads.
15. `apply`: The pure action reducer. Routine invalid actions are rejection values, never exceptions.
16. `inspect`: The pure terminal decision and finished result. The module owns its tier under engine decision 16.
17. `bucketOf`: The pure histogram bucket for a finished state. It must index `distribution.labels`.
18. `shareBlock`: The title and semantic token rows. The engine appends the URL, pads rows, and enforces the row cap. This avoids Phase 11's duplicated share assumptions.
19. `mount`: The game specific DOM mount. It receives `MountContext`, owns only its host, and returns a per session `GameView` handle.
20. `help`: Structured help with a worked example and a text equivalent for any drawn example.

A defect this phase must not allow: a game author can read the contract and not discover its rules by trial and error. The known defect that triggered this phase was that the engine had manifest opinions it did not write down, so a second game had to discover them by reading engine source or by watching a puzzle fail to load. The correction is the contract and this guide.

## 4. Decision registry duties

A new game appends to the numbered decisions in `ARCHITECTURE.md`, and it never renumbers or edits an existing settled entry in place. The new game should ask whether it changes any design decision, and if so it records the new decision under the matching registry. The purpose is to keep the history intact and readable with no chat memory.

## 5. Verification gate

This is the exact gate sentence from section 6 of `.github/copilot-instructions.md`:

> Before you report any fix as done, all of these must pass, in this order: `typecheck`, `typecheck:tools`, `typecheck:sw`, `depcheck`, `test`, the verify script for any game whose rules, scoring, generator, or codec you touched, then `build`, then `budget`. Paste the real output. Never report a fix as done on reasoning alone.

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

Before any fix is reported as done, all of these must pass in order. The relevant game verify script runs for any game whose rules, scoring, generator, or codec you touched.

## 6. The abstraction test

Requirement 7.4 applies to every game after game one. The new game must be authored with zero engine changes. If an author wants an engine change, that is a finding and it is logged as a defect report, not a permission. The report comes after the game is built, and the correction is a later change after the report, not part of the build itself.

## 7. What is already decided

A new game does not choose everything. The following are settled and must be followed:

1. The share vocabulary is closed to games. It is in `src/shared/share-vocabulary.ts`. This is contract decision 4 and the suite decision about the family look. It is not the author's to change.
2. Tier names are suite wide. They are in `src/engine/tiers.ts` and the structural mirror in `src/core/types.ts`. This is settled charter decision 16 and a later game cannot pick new names.
3. The storage envelope belongs to the engine. This is contract decision 8 and engine decision 8.
4. Puzzle identity is owned by the engine. This is contract decision 14.
5. Chunks are keyed entries by puzzle number. This is contract decision 13 and the Phase 11 defect correction. The index owns how many chunks exist under contract decision 17.

## 8. The accessibility floor

A renderer must pass this list before it is considered complete:

- full keyboard play
- visible focus
- live region announcements
- no meaning in color alone
- 44 pixel touch targets
- a 360 pixel viewport
- `prefers-reduced-motion` honoured

## 9. Three worked references

Use real implementations when writing a new game.

| Checklist item | POKER GRID | CIPHER | Smallest complete fixture |
|---|---|---|---|
| Contract, parse, state, outcome, share | `src/games/poker-grid/module.ts` | `src/games/cipher/module.ts` | `src/games/toy-tap/module.ts` |
| Rules and rejections | `src/games/poker-grid/rules.ts` | `src/games/cipher/rules.ts` | `src/games/toy-tap/module.ts` |
| Generator and weekday behavior | `src/games/poker-grid/generator.ts` | `src/games/cipher/generator.ts` | `src/games/toy-tap/module.ts` |
| Generation and verification tools | `tools/generate.ts`, `tools/verify.ts` | `tools/cipher-generate.ts`, `tools/cipher-verify.ts` | `src/games/toy-tap/module.ts` |
| Renderer and accessibility | `src/games/poker-grid/render.ts` | `src/games/cipher/render.ts` | `src/games/toy-tap/module.ts` |
| Help and text equivalent | `src/games/poker-grid/help.ts` | `src/games/cipher/help.ts` | `src/games/toy-tap/module.ts` |
| Styles | `src/games/poker-grid/style.css` | `src/games/cipher/style.css` | `src/games/toy-tap/module.ts` |
| Rules tests | `tests/games/poker-grid/rules.test.ts` | `tests/games/cipher/rules.test.ts` | `tests/games/poker-grid/module.test.ts` |
| Module and share tests | `tests/games/poker-grid/module.test.ts` | `tests/games/cipher/module.test.ts` | `tests/games/poker-grid/module.test.ts` |

## 10. The traps

- `dispatch` is synchronous and a renderer must not read its own state after dispatching. The shell applies synchronously and then calls update.
- Data under `data/<game>/` is generated and never hand edited.
- A game never imports another game.
- A solver must never be importable from the browser bundle if it carries a large table.
- The test suite is slow only on a bridge filesystem, so run from local disk for the full suite.

The dash rule is operationally narrow. A generated file must contain no en dash or em dash, and no hyphen surrounded by whitespace. Hyphens inside identifiers, paths, class names, and compounds are allowed. The test must use `/[–—]|(?<=\s)-(?=\s)/`, not a kebab case matcher.

## 11. The generator contract

The scaffolding tool is a generator, not a document. It writes a small but honest daily game that the author must replace rule by rule. It must be strong enough to compile and to pass its own tests, with no placeholder comment and no `TODO` text.

The tool writes these files:

- `src/games/<id>/rules.ts`
- `src/games/<id>/generator.ts`
- `src/games/<id>/module.ts`
- `src/games/<id>/render.ts`
- `src/games/<id>/style.css`
- `src/games/<id>/help.ts`
- `src/shell/entries/<id>.ts`
- `src/shell/entries/<id>.html`
- `tests/games/<id>/rules.test.ts`
- `tests/games/<id>/module.test.ts`

A generated game is not finished when it exists. It is only finished when the author has replaced its trivial rules with a real puzzle, a real distribution, and a real share layout.
