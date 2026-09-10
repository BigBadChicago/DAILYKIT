# PHASE 12 PLAN, TEMPLATE EXTRACTION

Phase 12 of the charter. This document is the specification. It is written to be
executed by GitHub Copilot in Agent mode with `.github/copilot-instructions.md`
loaded, and it assumes no chat history whatsoever.

**Read before starting**, in this order: `.github/copilot-instructions.md`,
`ARCHITECTURE.md` in full including every numbered decisions section,
`BACKLOG.md`, this file, then `POKER-GRID.md` and `CIPHER.md`. The path scoped
files under `.github/instructions/` load themselves when you open a file they
match, so you do not read them up front.

`ARCHITECTURE.md` outranks this document. If the two disagree, follow
`ARCHITECTURE.md`, say so in your reply, and name the section.

## 1. What Phase 12 is for

Two games exist. Three do not. Phase 11's defect report ended with the sentence
requirement 7.4 asks for, and the answer was no: a new game could not be authored
in one file plus assets, because the engine had opinions about manifests that it
never wrote down, and the author of game two had to discover them by reading
engine source or by watching a puzzle fail to load.

Phase 12 exists to end that. Its output is not a convenience. It is the
instrument that makes games three, four and five identical in shape, so their
defect reports shrink to nothing as requirement 7.4 expects, and so a reviewer
can tell a real defect from an author who guessed.

The charter's measure of success is whether game three can go from idea to
playable in one weekend. Treat that as the acceptance bar for every decision in
this phase: if a step in your guide cannot be followed on a Saturday by one
person with this repository and no other context, it is not finished.

## 2. Deliverables, exactly

| # | Deliverable | Path |
|---|---|---|
| 1 | The authoring guide | `NEW_GAME.md` |
| 2 | The scaffolding tool | `tools/new-game.ts` |
| 3 | Its npm script | `package.json`, `"new-game"` |
| 4 | Tests for the tool | `tests/tools/new-game.test.ts` |
| 5 | Insertion markers | `src/shell/registry.ts`, `vite.config.ts` |
| 6 | Document updates | `ARCHITECTURE.md`, `BACKLOG.md` |
| 7 | The phase report | your reply, shape in section 9 |

Nothing else. A deliverable not on this list is scope creep and belongs in
`BACKLOG.md` with a one line rationale.

## 3. `NEW_GAME.md`, the authoring guide

The audience is one person, months from now, who has decided to build game four
and has read nothing. It is a procedure, not an essay. It must contain, in this
order:

1. **The one paragraph model.** What a game is in this codebase: a directory
   under `src/games/<id>/`, one entry file under `src/shell/entries/`, one line
   in the registry, one line in the build allow list, and no engine change ever.
2. **The order of work**, as numbered steps with a stated exit condition each:
   design document, then pure rules with complete tests, then the generator and
   its two tools and a verified manifest, then the module, then the renderer,
   then the entry and the two configuration lines, then the defect report. State
   plainly that the order is not a preference: the game must be playable through
   a Node script before a browser sees it, because a renderer written against
   unproven rules debugs two things at once.
3. **The contract checklist.** Every member of `GameModule`, what it must do,
   what it must never do, and which past defect made it that way. A reader must
   be able to fill this in without opening `src/contract/game-module.ts`, and
   opening it must confirm rather than surprise.
4. **The decision registry duties.** Which sections of `ARCHITECTURE.md` a new
   game appends to, and the rule that a numbered decision is never renumbered or
   edited in place.
5. **The verification gate**, quoted from section 6 of the Copilot instructions
   rather than reworded, so the two cannot drift.
6. **The abstraction test.** Requirement 7.4 applies to games three, four and
   five exactly as it applied to game two: zero engine changes while building,
   every wanted change logged as a defect, a report at the end, corrections
   afterwards. State that wanting an engine change is a finding, not a
   permission.
7. **What is already decided and is not the author's to choose.** The share
   vocabulary is closed to games. Tier names are suite wide. The storage envelope
   is the engine's. Puzzle identity is the engine's. Chunks are entries keyed by
   puzzle number. Cite the decision number for each.
8. **The accessibility floor**, as a checklist a renderer must pass: full
   keyboard play, visible focus, live region announcements, no meaning in colour
   alone, 44 pixel touch targets, a 360 pixel viewport, and `prefers-reduced-motion`
   honoured.
9. **Three worked references.** For each of POKER GRID and CIPHER, the file that
   answers each checklist item, so an author reads a real implementation rather
   than a description of one. The third reference is `src/games/toy-tap/`, which
   is the smallest complete implementation in the repository.
10. **The traps.** At minimum: `dispatch` is synchronous and a renderer must not
    read its own state after dispatching; data under `data/<game>/` is generated
    and never hand edited; a game never imports another game; the solver of a
    game must never be importable from the browser bundle if it carries a large
    table; and the test suite is slow only on a bridge filesystem.

Length is whatever the procedure needs. Padding it is worse than leaving it
short, and so is compressing a step until it needs interpretation.

## 4. `tools/new-game.ts`, the scaffolding tool

**One command produces a working game.** Not a skeleton with holes in it. The
generated game must compile, pass the layer check, pass its own generated tests,
build, and be playable in the dev server, before the author has typed anything.

### 4.1 Invocation

```
npm run new-game -- --id <kebab-case-id> --name "<DISPLAY NAME>" --hue <0-359>
```

Every argument is required. There is no interactive mode, because a prompt that
an agent cannot answer is a tool an agent cannot use.

### 4.2 What it writes

```
src/games/<id>/rules.ts        state, actions, apply, terminal, every rejection
src/games/<id>/generator.ts    seeded puzzle construction, weekday hook
src/games/<id>/module.ts       the GameModule implementation, defineGame
src/games/<id>/render.ts       play area only, pointer and keyboard
src/games/<id>/style.css       accent and board typography only
src/games/<id>/help.ts         headline, steps, worked example
src/shell/entries/<id>.ts      imports the module, calls mountShell
src/shell/entries/<id>.html    copy of the sibling page with the entry swapped
tests/games/<id>/rules.test.ts  every rejection path, terminal, property test
tests/games/<id>/module.test.ts round trip, outcome, share rows
```

The generated game is **the simplest complete daily game that satisfies the
contract**: a small seeded target the player finds in a fixed number of attempts,
with a real win and loss, a distribution, and a share block of vocabulary
tokens. It exists to be replaced rule by rule, so it must be honest code and not
a demonstration of the API.

**No `TODO` and no placeholder comment anywhere in generated output.** Where the
author is expected to substitute their own rules, the guide says so and the code
is a working implementation of something trivial, because a placeholder that
compiles is a placeholder that ships.

### 4.3 What it must not do

1. **No new dependency**, runtime or build time. Node's standard library only.
2. **No engine change.** It writes under `src/games/`, `src/shell/entries/` and
   `tests/`, and edits exactly two configuration files at their markers.
3. **No overwrite.** If any target path exists, it writes nothing at all and
   exits non zero naming the collision. Partial output is worse than none.
4. **No manifest.** Generation of a horizon is the author's step, after their
   rules exist. The generated module reads its index like every other game and
   plays unrated past the horizon, which is the honest state for a game with no
   manifest yet.
5. **No production exposure.** The generated allow list entry is
   `productionSafe: false`, exactly as `toy-tap` is, so a half built game cannot
   reach a release build. Flipping it is a deliberate line the author changes
   when the game is finished.

### 4.4 The two configuration edits

Add a marker comment to each file first, in its own commit sized change:

- `src/shell/registry.ts`, immediately before the closing bracket of
  `SUITE_GAMES`.
- `vite.config.ts`, immediately before the closing brace of `TARGETS`.

The tool inserts above the marker and refuses if the marker is absent or the id
is already present. A generator that edits configuration by regular expression
against arbitrary text is a source of silent damage; a generator that edits at a
named marker and refuses otherwise is not.

The registry entry it writes carries `status: "planned"`. A game becomes `live`
when its author says so, not when a file exists.

### 4.5 Shape of the code

`tools/new-game.ts` separates **deciding what to write** from **writing it**.
Export a pure function that takes the options and returns the file map, path to
contents, and keep the filesystem work in a thin main. This is what makes
section 5's tests possible without a temporary directory, and it is the same
reasoning that put the codec's pure functions in `tools/sw-manifest.ts`.

## 5. `tests/tools/new-game.test.ts`

Test the pure function, not the disk. At minimum:

1. Every declared path in section 4.2 is present in the returned map, and no
   other path is.
2. No generated file contains `TODO`, `FIXME`, `placeholder`, or `implementation
   goes here`.
3. No generated prose or comment uses a dash **as punctuation**. The check is
   literal and narrow, because the rule is about sentences and not about names:
   assert that no file contains an en dash or an em dash anywhere, and that no
   file contains a hyphen with whitespace on both sides. Nothing else.
   **A hyphen inside a word or an identifier is not punctuation and must not be
   flagged.** Kebab-case game ids, the paths built from them, CSS class names,
   and ordinary compounds such as four way or best known are all legal. A test
   that forbids the pattern `[a-z]+-[a-z]+` is unsatisfiable rather than strict,
   because the id the tool was asked to generate matches it.
4. The generated module file names the id exactly once in `identity.id` and
   imports nothing from another game, asserted by scanning the import lines.
5. The generated entry imports the generated module and calls `mountShell`.
6. The generated registry line and allow list line are exactly the text the tool
   will insert, including `productionSafe: false` and `status: "planned"`.
7. An id that is not lowercase kebab case is rejected, and so is one that already
   appears in `SUITE_GAMES`, because both are `seedFor` inputs and a collision is
   a shared RNG stream.
8. Determinism: the same options produce a byte identical file map.

## 6. Acceptance, run once and pasted into the report

Tests prove the tool's output. They do not prove the output runs. Do this once,
in a scratch branch or with the files removed afterwards, and paste the real
terminal output:

1. `npm run new-game -- --id scaffold-check --name "SCAFFOLD CHECK" --hue 96`
2. `npm run typecheck && npm run typecheck:tools && npm run depcheck && npm test`
3. `GAME=scaffold-check npm run build:game`
4. `npm run dev`, open the generated page, play one puzzle to a finished state,
   and share the result. State what the share block looked like.
5. Remove the generated files, revert the two marker insertions, and show
   `git status` clean.

If any step needs an edit to succeed, the tool is not finished. Fix the tool
rather than the generated output, and say in the report what you fixed.

## 7. Documentation duties

Section 9 of the Copilot instructions applies in full. Specifically:

1. `ARCHITECTURE.md` file manifest gains a row for `NEW_GAME.md`,
   `tools/new-game.ts`, `tests/tools/new-game.test.ts`, and this plan.
2. The phase log row for Phase 12 moves to done, with a one line note naming
   what shipped.
3. Any decision this phase settles that a future reader could reasonably undo,
   for example the marker insertion strategy or the choice of what the scaffold
   generates, is appended as a numbered entry under a new heading, **Template
   decisions**, in the same style as the existing registries. Do not renumber
   anything.
4. `BACKLOG.md` records anything you deliberately did not build, including
   choices you rejected.
5. No changelog entry: nothing in this phase is player facing.

## 8. What would count as rework, and is therefore forbidden

This phase exists so that later phases need no rework. Hold yourself to the same
standard while running it.

1. **Do not change engine source.** Layers 0, 1, 2, 3 and the shell are settled.
   If the scaffold cannot be written without an engine change, that is a genuine
   architecture defect: stop, write it up as Phase 11's report was written, and
   wait. Do not implement it and mention it afterwards.
2. **Do not restate a numbered decision in `NEW_GAME.md` in different words.**
   Cite it by number and quote it. Two statements of one rule drift.
3. **Do not invent a rule the repository does not already hold.** If the guide
   needs a rule that nothing enforces, propose it and wait; a guide that is
   ahead of the code teaches an author something untrue.
4. **Do not fill the results table in `MANUAL-CHECKS.md`.** It records human
   runs. The checklist has never been run, and that does not block this phase or
   any other. It gates a launch. Note in your report which sections of it your
   work touches, and carry on.
5. **Do not touch `data/`.** No game data changes in this phase.

## 9. The phase report

End with, in this order:

1. **What shipped**, one line per deliverable with its path.
2. **The acceptance transcript** from section 6, real output, not a summary.
3. **Decisions you made that I should review**, numbered, each with the
   alternative you rejected and why. This is the charter's operating rule 1 and
   it is how a phase is reviewed without reading every line.
4. **Anything you could not do**, with the reason and what you would need.
5. **The one sentence measure**: could game three go from idea to playable in one
   weekend using only `NEW_GAME.md` and the tool, and if not, what is still
   missing.

Then stop. Do not begin Phase 13 in the same chat. Phase 13 is three games, one
per chat, each starting from `ARCHITECTURE.md`, `NEW_GAME.md`, `SLATE.md`, and
its own design document.

## 10. Preconditions this phase sets for Phase 13

Game three is VECTOR, then TALLY DROP, then RECALL, in that order, per
`SLATE.md` section 5. Each of those phases must be able to start with nothing
but the repository. Before you report Phase 12 done, confirm each of these is
true, and say so:

1. `NEW_GAME.md` names the design document as step one and states what a game's
   design document must contain, using `POKER-GRID.md` and `CIPHER.md` as the
   worked shape.
2. The verification strategy for each of the three remaining games is already
   recorded in `SLATE.md`, so an author does not reinvent it.
3. The guide states the abstraction test rule for game three explicitly, along
   with where the defect report goes.
4. The registry already carries all five games, so shipping game three is a
   status change and not a new entry.

## 11. Self check before you hand back

Answer each with yes plus the evidence, or no plus the reason. A no is a valid
answer and stops the handover. Do not answer from memory: run the command or
open the file.

1. `npm run new-game -- --id scaffold-check --name "SCAFFOLD CHECK" --hue 96`
   produced every path in section 4.2 and nothing else.
2. The full gate passed with zero edits to generated output. Output pasted.
3. The generated game was played to a finished state in the dev server and
   produced a share block. Block pasted.
4. `git status` is clean after removal. Output pasted.
5. Running the tool twice with the same options produces a byte identical file
   map, and the second run against an existing id writes nothing and exits non
   zero.
6. No generated file contains `TODO`, `FIXME`, `placeholder`, or `implementation
   goes here`.
7. The dash check is the narrow one from section 5 item 3, and `poker-grid` and
   `cipher` would both pass it.
8. The registry entry is `status: "planned"` and the allow list entry is
   `productionSafe: false`.
9. No file under `src/core`, `src/engine`, `src/ui`, `src/contract`, `src/shell`
   except the two marker insertions was modified. `git diff --stat` pasted.
10. `NEW_GAME.md` cites every settled rule by decision number rather than
    restating it in new words.
11. Section 10's four preconditions for Phase 13 are all true.
