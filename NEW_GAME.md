# NEW GAME

This guide is the authoring path for a new game. It is written for one person with this repository and no chat history. A game in this codebase is a directory under `src/games/<id>/`, one entry file under `src/shell/entries/`, one line in the suite registry, one line in the build allow list, and no engine change.

## 1. The one paragraph model

A game is a module that satisfies `GameModule`. The shell loads it through a single entry file and the suite registry names it for the hub. The build allow list decides whether the game is visible in a release build, and the engine never changes to make one game behave differently. Every game is a daily puzzle with a manifest index, a seeded generator, a pure rules file, a renderer, and a share block.

## 2. The order of work

1. Write the design document and the rule set. Exit condition: the rules are testable in Node without a browser and they explain every rejection, every terminal condition, and every score or tier outcome.
2. Build the pure rules file and the tests before any renderer is touched. Exit condition: a rule test covers every rejection path and the terminal state is proven for a real board.
3. Build the generator and the two tools that create and verify the manifest. Exit condition: the game can produce a puzzle from a seed and its data path is verified by script before a browser sees it.
4. Write the module and its state shape. Exit condition: `defineGame` is satisfied, the round trip from parse to serialize to deserialize succeeds, and the share block stays inside the engine row cap.
5. Build the renderer. Exit condition: the board is playable with keyboard and pointer input, the live region announces each action, and the focus states are visible.
6. Add the entry file and the two configuration lines. Exit condition: the entry imports the generated module and calls `mountShell`, the registry entry is marked planned, and the allow list entry is not production safe until the game is ready.
7. Write the defect report. Exit condition: any engine change you wanted is logged as a defect, not patched into the engine, and the report says which change would have been required to do it.

This order is not a preference. A game must be playable through a Node script before a browser sees it, because a renderer written against unproven rules debugs two things at once.

## 3. The contract checklist

Every member of `GameModule` must be filled in and every one of them has a duty.

1. `identity`: Stable id, display name, epoch, share URL, accent, and one line rule. The id must be lowercase and hyphenated. It is also the seed namespace, so a changed id is a migration.
2. `input`: A grid or a custom keyboard model. The shell never tries to guess which one a game uses. Grid games read through `ui/gridCursor.ts`, custom games own their keyboard handling.
3. `manifest`: The index URL and the lookahead window. The shell fetches the index and the module only parses one entry when a day is opened.
4. `archiveEnabled`: Whether a game keeps a replay archive.
5. `hasWinLoss`: Whether the module has a real win and loss shape. The suite win rate row renders only when this is true.
6. `stateVersion`: The module owned payload version. The storage envelope version is engine owned and stays separate.
7. `distribution`: The histogram labels and the distinguished bucket index. The engine renders it and the module decides what a finished outcome means.
8. `parsePuzzle`: The manifest entry parser. It must reject malformed content and is the place to validate the schema from the manifest.
9. `generatePuzzle`: The fallback for a day outside the manifest horizon. That path must be deterministic and unrated if the game has no stored optimum.
10. `firstSessionPuzzle`: Optional. It enables a tutorial board that is not today's puzzle. If it is absent, the game falls back to its help panel over today's board.
11. `initialState`: The in progress state. It must be pure and it must match the puzzle being opened.
12. `serialize` and `deserialize`: The saved payload. The game stores only what is needed and never the secret answer in storage.
13. `migrateState`: The version migration path for saved payloads. It must be explicit and must not silently reinterpret data from a past version.
14. `apply`: The action reducer. It must be pure and it must reject routine invalid actions as values rather than throws.
15. `inspect`: The terminal decision. It decides whether the board is ongoing or finished and what score and tier it holds.
16. `bucketOf`: The histogram bucket for a finished state.
17. `shareBlock`: The share rows and title. The engine appends the URL and enforces the row cap, so the game never breaks the suite family look.
18. `mount`: The game specific DOM mount. It returns a per session `GameView` handle and never mutates module state.
19. `help`: The structured help content shown to a new player.

A defect this phase must not allow: a game author can read the contract and not discover its rules by trial and error. The known defect that triggered this phase was that the engine had manifest opinions it did not write down, so a second game had to discover them by reading engine source or by watching a puzzle fail to load. The correction is the contract and this guide.

## 4. Decision registry duties

A new game appends to the numbered decisions in `ARCHITECTURE.md`, and it never renumbers or edits an existing settled entry in place. The new game should ask whether it changes any design decision, and if so it records the new decision under the matching registry. The purpose is to keep the history intact and readable with no chat memory.

## 5. Verification gate

This gate is the exact gate from the project instructions and it is not reworded:

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
5. Chunks are keyed entries by puzzle number. This is contract decision 13 and the Phase 11 defect correction.

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

- POKER GRID: `src/games/poker-grid/module.ts`, `src/games/poker-grid/rules.ts`, `src/games/poker-grid/render.ts`
- CIPHER: `src/games/cipher/module.ts`, `src/games/cipher/rules.ts`, `src/games/cipher/render.ts`
- The smallest complete implementation: `src/games/toy-tap/module.ts`

## 10. The traps

- `dispatch` is synchronous and a renderer must not read its own state after dispatching. The shell applies synchronously and then calls update.
- Data under `data/<game>/` is generated and never hand edited.
- A game never imports another game.
- A solver must never be importable from the browser bundle if it carries a large table.
- The test suite is slow only on a bridge filesystem, so run from local disk for the full suite.

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
