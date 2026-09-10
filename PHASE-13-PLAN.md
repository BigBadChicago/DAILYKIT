# PHASE 13 PLAN, GAMES THREE, FOUR, AND FIVE

Three games. **One per chat**, in this order: VECTOR, then TALLY DROP, then
RECALL. Hardest generator first.

Read: `.github/copilot-instructions.md`, `ARCHITECTURE.md` in full, `BACKLOG.md`,
`NEW_GAME.md`, `SLATE.md`, this file. `ARCHITECTURE.md` outranks this file.

`NEW_GAME.md` is the procedure. This file is the specification of what the three
games are and what each must prove. Where they overlap, follow `NEW_GAME.md` for
how and this file for what.

## 1. Fixed facts, not the author's to choose

Ids, epochs, hues and paths are already shipping in `src/shell/registry.ts`.
Changing any of them is a migration, not a rename.

| | VECTOR | TALLY DROP | RECALL |
|---|---|---|---|
| id | `vector` | `tally-drop` | `recall` |
| Order | game three | game four | game five |
| Epoch | 2026-01-05 | 2026-01-05 | 2026-01-05 |
| Accent hue | 28 | 202 | 342 |
| Input | `grid` | `custom` | `grid` |
| `hasWinLoss` | true | false | false |
| Failure model | pass or fail, 3 submissions | continuum, shifts above minimum | continuum, cells recalled |
| Session target | 2 to 4 min | 60 to 90 s | 40 to 60 s |

`bucketCount` in the registry is provisional for all three. Set the real value
from your `DistributionSpec`, and the registry test will hold you to it.

## 2. What each game is

Rules text belongs in that game's design document. This is the seed.

**VECTOR.** Point every arrow so each numbered cell is the first one that exactly
that many arrows reach. Arrows travel until they hit the first numbered cell or
leave the board. Tap a cell to cycle its arrow. Reuses `ui/gridCursor.ts`
unchanged.

- Generate: fill blanks with seeded arrows, trace rays, publish the arrival
  counts as the numbers, blank the arrows.
- Verify: constraint propagation with **no guessing permitted**. A board passes
  only if it resolves completely. That single pass proves uniqueness and human
  solvability together, which is the reason this game is on the slate.
- Difficulty: maximum propagation depth before the board resolves. An integer
  from the verifying pass. Banded by weekday.
- Share: one row per submission, up to three, five cells, `best` across for a
  solve and `miss` across for a failure.
- Naming caution from `SLATE.md`: no published genre name appears anywhere in
  the product or the repository. Record it in `ASSETS.md`.

**TALLY DROP.** Slide the five number strips until every row adds up to the
totals in the margins.

- Verify: enumerate all 7,776 offset states and assert **exactly one** satisfies
  all four targets. No beam, no heuristic, no tolerance. This is the strongest
  verification claim in the suite.
- Difficulty: the count of states satisfying three of the four rows. An integer
  from the same enumeration.
- Share: title carries the tier, then one five cell meter row.

**RECALL.** Study a pattern of lit cells, then reproduce it from memory three
times, growing denser each round.

- Verify structurally. Reject a pattern that is symmetric under any reflection or
  rotation, a pure row or column fill, or one whose lit cells are all contiguous.
  Each collapses the memory task into a one word description.
- Difficulty: total lit cells.
- The study phase is a fixed duration with a visible countdown and a replay that
  costs score. **No reaction time component anywhere**, which is what keeps it
  playable under `prefers-reduced-motion` and with a screen reader.

## 3. Order of work, per game

Each step has an exit condition. Do not start the next one before it holds.

1. `<GAME>.md` design document. Exit: rules text, worked feedback or scoring
   examples, tier mapping, distribution buckets, share layout with three worked
   outcomes, and the verification strategy from section 2 written out.
2. `rules.ts` plus its tests. Exit: every rejection path covered, terminal
   detection covered, one property test, and the game playable through a Node
   script.
3. `generator.ts`, the two tools, the manifest. Exit: 365 days generated, every
   day verified by a separate process, and `npm run <id>:verify` green.
4. `module.ts` plus its tests. Exit: parse, snapshot round trip, outcome
   grading, and share rows covered.
5. `render.ts`, `style.css`, `help.ts`. Exit: playable at 360 pixels, full
   keyboard play, announcements on every state change.
6. Entry file, registry `status: "live"`, allow list `productionSafe: true`.
   Exit: `npm run build` and `npm run budget` green, hub shows the game.
7. Defect report. Section 5.

## 4. Hard rules

1. **Zero engine changes while building.** Layers 0, 1, 2, 3 and the shell are
   frozen for steps 1 through 6. Every change you want is logged, not made.
2. **A game never imports another game.** If two games need the same thing, that
   is a defect for the report, not an import.
3. **Never hand edit `data/`.** Fix the generator, regenerate the range, verify.
4. **The manifest is 365 days**, generated and verified in CI. Add the verify
   script to `.github/workflows/ci.yml` in the same change.
5. **Share blocks emit vocabulary tokens only.** No glyph, no card, no position,
   nothing a reader can work backwards from.
6. **A solver or verifier with a large table stays out of the browser bundle.**
   The module imports the generator, never the solver. CIPHER's split is the
   worked example.
7. **An unrun manual check never blocks you.** Note which sections your work
   touches and carry on.

## 5. The defect report, per game

Append to `ARCHITECTURE.md` in the shape of the Phase 11 report. Per defect:
what was wanted, why the game wanted it, what was done instead to stay inside
rule 4.1, and the proposed correction. Then the one sentence requirement 7.4
asks for: **could this game have been authored from `NEW_GAME.md` and the
scaffold alone, and if not, what was the cheapest change that would have made it
possible.**

Correct the engine **after** the report, not during the build, and rebuild every
existing game against the correction before the next game starts.

**The expectation is that the list shrinks.** Phase 11 found eight. If game four
finds more than game three, stop building games and say so: requirement 7.4 says
the contract is the problem at that point, not the games.

## 6. Definition of done, per game

- [ ] Design document written and matching the shipped rules.
- [ ] Every rejection path tested. One property test. Determinism tested.
- [ ] 365 day manifest generated, verified by a separate process, verify script
      in CI.
- [ ] Playable at 360 pixels, keyboard only, with announcements.
- [ ] `typecheck`, `typecheck:tools`, `typecheck:sw`, `depcheck`, `test`,
      `<id>:verify`, `build`, `budget` all green, output pasted.
- [ ] Registry `live`, allow list `productionSafe: true`, hub renders it.
- [ ] Daily card renders one more row. Cross promotion offers it.
- [ ] `ARCHITECTURE.md` manifest rows, decisions, phase log. `BACKLOG.md`
      deferrals. `ASSETS.md` if any asset shipped. A changelog entry.
- [ ] Defect report appended, corrections applied afterwards, all games green.

## 7. Stop and ask

- A verification strategy in section 2 turns out not to prove what it claims.
- A game cannot be built without an engine change, and the workaround would ship
  something a player would notice.
- A difficulty band cannot be filled with 52 days a year from the eligible pool.
- Two games want the same skill once the rules are real, which breaks
  requirement 7.1.1.
