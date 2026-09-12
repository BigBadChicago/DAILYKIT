# VECTOR launch pass, document insertions

Six edits. Each says where it goes and what it replaces.

---

## 1. ARCHITECTURE.md, file manifest

Add these rows to the file manifest table, after the POKER GRID and CIPHER rows.

| File | Layer | Responsibility | Depends on |
|---|---|---|---|
| VECTOR.md | n/a | The VECTOR design document, rules, tiers, share layout, and the resolutions of its internal conflicts | none |
| src/games/vector/propagate.ts | 4 | Board geometry, the three deduction rules, depth, and the solve used by the loss reveal | none |
| src/games/vector/rules.ts | 4 | State, actions, refusals, satisfaction, terminal detection, tier and bucket | core/result, core/types, games/vector/propagate |
| src/games/vector/generator.ts | 4 | The carve loop, the screens, the weekday bands, and the first session board | games/vector/propagate |
| src/games/vector/module.ts | 4 | The VECTOR GameModule | contract/*, core/*, engine/manifest-codec, engine/tiers, shared/share-vocabulary, games/vector/* |
| src/games/vector/render.ts | 4 | Board, tap cycle, grid cursor, ray highlight, submission counter, loss reveal | contract/types, ui/dom, ui/gridCursor, games/vector/propagate, games/vector/rules |
| src/games/vector/help.ts | 4 | The five cell worked example and its text equivalent | contract/types, games/vector/propagate, games/vector/render |
| src/games/vector/style.css | 4 | The VECTOR play area | none |
| src/shell/entries/vector.ts | 5 | The VECTOR bundler entry, the one file that names it | games/vector/module, shell/main |
| src/shell/entries/vector.html | 5 | The VECTOR page | none |
| tools/vector-generate.ts | n/a | Generates the horizon, one stream per puzzle, and writes the index and chunk | core/rng, core/seed, engine/manifest-codec, games/vector/* |
| tools/vector-verify.ts | n/a | Re-derives every entry and searches independently for a second solution | core/rng, core/seed, engine/manifest-codec, games/vector/*, tools/vector-generate |
| data/vector/study.json | n/a | The measured evidence behind the screens and the band edges | none |
| data/vector/manifest.index.json | n/a | The horizon and its single chunk pointer | none |
| data/vector/manifest.1-365.json | n/a | A year of VECTOR layouts, obfuscated, carrying no answer | none |

---

## 2. ARCHITECTURE.md, new section after "CIPHER generation decisions"

## VECTOR generation decisions

Settled in Phase 13 and backed by `data/vector/study.json`.

1. **Boards are carved, not sampled.** Filling blanks at random and keeping the
   boards that resolve gives one board in twenty thousand at eight to twelve
   clues, measured over 6,000 seeds at each clue count. The carve starts from a
   twenty two clue skeleton that resolves and removes clues one at a time,
   keeping every removal that still resolves, and accepts at 5.0 percent at 0.55
   milliseconds an attempt.
2. **Difficulty is the intensity, not the propagation depth.**
   `PHASE-13-PLAN.md` section 2 named the maximum depth. Measured over 996
   boards that integer takes four values, 271 at depth 4, 400 at 5, 312 at 6 and
   thirteen elsewhere, which cannot carry seven weekday bands and cannot be
   rescued by CIPHER's set of classes device because there are not seven sets to
   be had. Intensity is `floor(100 * sum of per cell assignment rounds / blank
   cells)`, from the same pass, measured range 159 to 387. Approved as a
   deviation from the plan.
3. **Depth survives as a screen, not as the band input.** `DEPTH_FLOOR` is 4 and
   rejects two boards in 996. A verification that only checks the interesting
   property has nothing to say when the dull one breaks.
4. **Band edges are 217, 232, 244, 257, 271 and 292**, the septiles of the 955
   boards that pass the screens, with occupancy 121 to 150. Changing one edge
   invalidates every stored band in the horizon, the same warning
   `OPENING_GUESS` carries in CIPHER.
5. **One stream per puzzle and no salts.** A carve consumes a variable number of
   draws, so the stream position already separates attempts. An entry records
   the attempt count and the verifier replays that many carves.
6. **No answer is stored anywhere.** Correctness is checked against the rules
   rather than a key, which uniqueness makes equivalent, so the manifest, the
   save and the bundle all carry the layout only. The loss reveal derives the
   solution in the browser.
7. **The fallback past the horizon is fully verified.** Propagation is 36 cells
   and three rules with no table, so `generatePuzzle` runs the whole pipeline on
   the phone and enforces the stall check and both screens, never the band. This
   is the first game whose past horizon boards carry the same proof as manifest
   boards.
8. **Verification asserts uniqueness twice by different routes.** Propagation
   resolving the board proves it, and a backtracking search written separately
   from the propagator is asked to find a second solution. Measured on the test
   fixture: 33 branches, 106,444 nodes, 49 milliseconds. A branch that exceeds
   the node ceiling fails the board rather than passing it.

---

## 3. ASSETS.md

| Asset | Where | Licence |
|---|---|---|
| VECTOR arrow glyphs | `src/games/vector/render.ts`, four inline SVG paths | Self drawn for this project, no third party rights |
| VECTOR board typography | System monospace stack, no webfont | System supplied |

**Naming caution, VECTOR.** Arrow and ray counting puzzles appear in published
catalogues under proprietary genre names. Mechanics are not protectable and this
one is generated independently, but no published genre name appears anywhere in
the product or in this repository, and the design document describes structures
rather than naming them.

---

## 4. BACKLOG.md

| Item | Rationale |
|---|---|
| Grid games get one activation verb per cell | A game wanting a second per cell verb has only the cursor's activate and cancel. VECTOR used cancel for clear, which worked. Revisit if a third is ever wanted. |
| `FinishedOutcome.score` has no stated direction | Lower is better in CIPHER and VECTOR, higher in POKER GRID, and the type says nothing. No suite level code compares it across games today. Document the field as module private or give it a direction. |
| Share titles disagree between games | POKER GRID writes `#250 Excellent streak 12`, CIPHER and VECTOR write `#251 Great, streak 12`. Harmonise when POKER GRID is next touched, not before. |
| Shared list cursor | Still open. VECTOR is a lattice game and gave it no second example. SPAN and STEPWISE are both non grid and will. |
| CASCADE, bench concept | Arithmetic where each target hit becomes a number you may reuse. Measured evidence on the adjacent family only. The fallback if the suite ever wants an arithmetic game. |
| FOUR FAMILIES, bench concept | Categorization from computable integer properties, 154,000 partitions enumerable. Unmeasured. |
| REWRITE, bench concept | Dead end count as the difficulty measure, the widest claimed spread in the concept pool. Unmeasured. |
| GLYPH SUM, bench concept | Digit substitution with a cumulative depth measure. Abstract symbols remove the translation debt entirely. Unmeasured. |
| Memory mode deliberately unfilled | No concept in a pool of sixty four cleared the gates. A difficulty chosen by the generator rather than measured by the verifier is the defect that sank the designed version. Closed, not deferred. |
| Suite size closed at five | Seven was considered and refused. Two of the five slots were replaced rather than added to. |
| Non daily games | Practice mode on a daily game only, as its own phase after game five. A cadence change breaks the suite streak and the daily card, and an endless game has no shared board and therefore no share loop. |

---

## 5. VECTOR.md corrections

Four edits to the design document, all from things the code turned out to know
better than the prose did.

1. **Section 9 in full** is replaced by the rewrite already delivered. Boards are
   carved, difficulty is the intensity, and the band table is measured.
2. **Section 12, the title line.** CIPHER's real title carries a hash. The three
   worked blocks become `VECTOR #249 Excellent`, `VECTOR #249 Good, streak 12`
   and `VECTOR #249 Rough`, and the sentence claiming CIPHER uses no hash is
   struck.
3. **Section 13, input.** Add that the renderer creates the grid cursor itself,
   and that Escape clears the cell under the cursor. The cursor is not wired by
   the engine from the input descriptor.
4. **Section 10, assertion numbering.** Assertions 3 to 5 name the stored fields
   and now read `intensity` where they read `difficulty`.

---

## 6. ARCHITECTURE.md, phase log

Add: **Phase 13, game three.** VECTOR built and live. Two deviations from
`PHASE-13-PLAN.md`, both approved and both forced by measurement: generation is
a carve rather than rejection sampling, and difficulty is the intensity rather
than the maximum propagation depth. The defect report is in `VECTOR.md` section
15 as amended.
