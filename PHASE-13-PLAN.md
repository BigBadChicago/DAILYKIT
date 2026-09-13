# PHASE 13 PLAN, THE FIVE NEW GAMES

Five games. **One per chat.** Each one built on the v3 contract from its first
line, and each one gated on the v3 migration finishing first.

Read: `.github/copilot-instructions.md`, `ARCHITECTURE2.md` in full,
`ARCHITECTURE.md`, `BACKLOG.md`, `NEW_GAME.md`, this file. **`ARCHITECTURE2.md`
outranks this file, and outranks `ARCHITECTURE.md` wherever the two disagree.**

`NEW_GAME.md` is the procedure. This file is the specification of what the five
games are, in what order, and what each must prove. Where they overlap, follow
`NEW_GAME.md` for how and this file for what.

## 0. What this document replaced, and the numbering trap

The previous version of this file specified VECTOR, TALLY DROP and RECALL as
games three, four and five under the `SLATE.md` slate. VECTOR shipped. **TALLY
DROP and RECALL were cancelled on 2026-09-13** when the lineup in
`ARCHITECTURE2.md` was approved, along with composition A, which makes the suite
eight games rather than five. Neither is being built and neither is in the
registry. `SLATE.md` is kept as the superseded record of how the first five were
chosen; it is history and it is not to be edited into agreement with today.

**Two phase numbering schemes now coexist and they are not the same sequence.**

- **Charter phases 0 through 14.** The original fourteen phase plan. This
  document is charter Phase 13, which used to mean three games and now means
  five.
- **v3 migration phases, in `ARCHITECTURE2.md` section 56.** Phase 1 was the v3
  contract, Phase 2 was VECTOR on v3, Phase 3 is CIPHER. These run inside charter
  Phase 13's calendar time and have nothing to do with its numbering.

Say which scheme you mean, every time. "Phase 3" without a qualifier has already
cost one conversation.

## 1. Order of work

Nothing in this document starts until the v3 migration finishes.

1. **v3 migration phase 3, CIPHER on v3.** Specified in `ARCHITECTURE2.md`
   section 56 as next.
2. **v3 migration phase 4, POKER GRID on v3.** Last of the three legacy games,
   because its tier grades against a stored optimum and its share block is the
   only one whose rows are not one per attempt.
3. **The five new games**, one per chat, in the order settled in section 1.1.

**Why the migration comes first.** A new game authored on v2 would become a
sixth legacy module to migrate, and the migration is the expensive part. Built
after it, each new game is authored once, against one contract, and the section
45 certification gate applies to it from the beginning rather than being
retrofitted.

### 1.1 Order among the five

The old plan's principle was hardest generator first. It is kept, with one
exception at the front.

**DIFFERENCE RELAY goes first**, even though its generator is the most tractable
of the five. It is the first game ever authored on v3 rather than migrated onto
it, so that chat is also the test of whether `NEW_GAME.md` and the scaffold
describe a v3 game correctly. Pairing the hardest generator with the first use of
a new contract puts two unknowns in one chat, and when something fails there is
no way to tell which one caused it.

After that, hardest first:

1. **DIFFERENCE RELAY.** Smallest state space, exhaustive by enumeration. Proves
   the v3 authoring path.
2. **RING BALANCE.** Anchored permutations, and the first game whose correctness
   depends on explicit symmetry breaking.
3. **ORDER OF OPERATIONS.** Permutation plus subset dynamic programming, and the
   arithmetic load on a human player is the open question.
4. **TURN TABLE.** Orientation enumeration plus graph search, and the first of
   the two rendering heavy games.
5. **ROTATE LOCK.** Hardest rendering problem in the suite, taken last so it
   inherits four renderers' worth of solved layout problems.

## 2. Fixed facts, not the author's to choose

Ids, epochs, hues and paths ship in `src/shell/registry.ts` today. Changing any
of them is a migration, not a rename.

| | DIFFERENCE RELAY | RING BALANCE | ORDER OF OPERATIONS | TURN TABLE | ROTATE LOCK |
|---|---|---|---|---|---|
| id | `difference-relay` | `ring-balance` | `order-of-operations` | `turn-table` | `rotate-lock` |
| Path | `/difference-relay/` | `/ring-balance/` | `/order-of-operations/` | `/turn-table/` | `/rotate-lock/` |
| Epoch | 2026-01-05 | 2026-01-05 | 2026-01-05 | 2026-01-05 | 2026-01-05 |
| Accent hue | 68 | 188 | 228 | 108 | 308 |
| Build order | 1 | 2 | 3 | 4 | 5 |

**Provisional, and yours to settle in the design document.** `bucketCount` is 4
for all five, `hasWinLoss` is a guess, `stateVersion` is 1, the one line rules in
the registry are drafts against requirement 7.1.6, and the registry's ordering of
the five is arbitrary. The registry is meant to run longest session to shortest
and no design document states a session length yet. The registry test holds a
game to its module only once the module exists, so a wrong guess costs nothing
until the game is built and then must be corrected in the same change.

**ROTATE LOCK was named VECTOR LOCK** in `ARCHITECTURE2.md` until 2026-09-13. The
rename removed a collision with the shipped VECTOR, which is a different game.
Any document still saying VECTOR LOCK predates the rename.

## 3. What each game is

Rules text belongs in that game's design document. This is the seed, taken from
`ARCHITECTURE2.md` sections 27 and 46.

**DIFFERENCE RELAY.** Order numbers under adjacent difference constraints.

- Verify: 6! enumeration plus deduction. Exhaustive, so the uniqueness claim is
  exact and there is no beam anywhere.
- Difficulty: forced depth.
- Telemetry: action chronology plus fingerprint.
- Primary engine stress test: whether deduction fairness can be kept stricter
  than mere uniqueness. A board with one solution that a human can only reach by
  guessing satisfies uniqueness and fails fairness, and this game is where that
  distinction gets a mechanical definition.

**RING BALANCE.** Order numbers around a constrained ring.

- Verify: anchored permutation enumeration.
- Difficulty: chain depth.
- Telemetry: attempt trace plus fingerprint.
- Primary engine stress test: explicit symmetry breaking. A ring has rotational
  and reflective symmetry, so a naive uniqueness count returns every rotation of
  one answer and calls the board ambiguous. The anchor is the fix and the
  symmetry check in the section 45 gate is what proves it was applied.

**ORDER OF OPERATIONS.** Order signed operators through checkpoints.

- Verify: permutation enumeration plus subset dynamic programming.
- Difficulty: reachable state mass.
- Telemetry: meter plus friction.
- Primary engine stress test: division edge cases and human arithmetic load. The
  second half is the product risk, not the technical one: a puzzle that is
  correct and exhausting is a puzzle nobody opens twice.

**TURN TABLE.** Rotate route tiles under checkpoint constraints.

- Verify: orientation enumeration plus graph search.
- Difficulty: propagation work.
- Telemetry: spatial trace plus replay.
- Primary engine stress test: compact rendering with touch and keyboard parity.

**ROTATE LOCK.** Order and rotate route pieces under turn checkpoints.

- Verify: state enumeration plus pruning.
- Difficulty: checkpoint decision depth.
- Telemetry: vector trace plus deterministic output.
- Primary engine stress test: mobile visual density.

## 4. Order of work, per game

Each step has an exit condition. Do not start the next one before it holds.

1. **`<GAME>.md` design document.** Exit: every one of the twenty eight items in
   `ARCHITECTURE2.md` section 44 is answered, not deferred. Section 44 is
   explicit that a game whose generation or artifact design is still aspirational
   is a concept and not a production candidate. `VECTOR.md` is the worked example
   of the depth expected.
2. **`rules.ts` plus its tests.** Exit: every rejection path covered, terminal
   detection covered, one property test, and the game playable through a Node
   script before any DOM exists.
3. **`generator.ts`, the two tools, the manifest.** Exit: 365 days generated,
   every day verified by a separate process, measured acceptance rate recorded,
   seven bands populated, and `npm run <id>:verify` green.
4. **`module.ts` on the v3 contract, plus its tests.** Exit: parse, snapshot
   round trip, outcome grading, `tierOf`, `difficulty`, the telemetry record
   shape, `shareArtifact`, and the declared `shareCapabilities`. At least two
   telemetry patterns and a deterministic fingerprint, per section 54.
5. **Leak probes plus positive controls.** Exit: each probe has a test that feeds
   it a deliberately leaking artifact and requires it to fire. A probe that has
   never fired is not evidence. VECTOR's four probes are the worked example.
6. **`render.ts`, `style.css`, `help.ts`.** Exit: playable at 360 pixels, full
   keyboard play, announcements on every state change, complete refusal
   catalogue reachable.
7. **Entry file, certification, allow list.** Exit: the section 45 gate passes in
   full and `productionSafe: true` is set as a consequence of it. Registry
   `status: "live"`. Hub shows the game.
8. **Defect report.** Section 6.

## 5. Hard rules

1. **Zero engine changes while building.** Layers 0, 1, 2, 3 and the shell are
   frozen for steps 1 through 7. Every change you want is logged, not made.
2. **A game never imports another game.** If two games need the same thing, that
   is a defect for the report, not an import.
3. **Never hand edit `data/`.** Fix the generator, regenerate the range, verify.
4. **The manifest is 365 days**, generated and verified by a separate process in
   CI. Add the verify script to `.github/workflows/ci.yml` in the same change.
5. **The share artifact is nine total lines including title and URL**, per
   `ARCHITECTURE2.md` section 49, and eight tokens per row. This is tighter than
   the v2 ten line allowance in `ARCHITECTURE.md` charter decision 1, which the
   legacy games still use. New games get nine.
6. **Nothing a reader can work backwards from.** No cell, no position, no
   direction, no measurement of how close a wrong answer came. The leak probes
   are the check and they are not optional.
7. **A verifier with a large table stays out of the browser bundle.** CIPHER's
   split is the worked example, VECTOR's inversion is the counter example: VECTOR
   ships its propagator because it is three rules over 36 cells and carries no
   table.
8. **An unrun manual check never blocks you.** Note which sections your work
   touches and carry on.

## 6. The defect report, per game

Append to `ARCHITECTURE2.md` in the shape of the Phase 11 report. Per defect:
what was wanted, why the game wanted it, what was done instead to stay inside
rule 5.1, and the proposed correction. Then the one sentence requirement 7.4
asks for: **could this game have been authored from `NEW_GAME.md` and the
scaffold alone, and if not, what was the cheapest change that would have made it
possible.**

Correct the engine **after** the report, not during the build, and rebuild every
existing game against the correction before the next game starts.

**The expectation is that the list shrinks.** Phase 11 found eight against the v2
contract. VECTOR found four against it. The first game here is the first test of
the v3 contract as an authoring surface rather than a migration target, so a
spike at DIFFERENCE RELAY is expected and informative. If game three of the five
finds more than game two, stop building and say so: requirement 7.4 says the
contract is the problem at that point, not the games.

## 7. Definition of done, per game

`ARCHITECTURE2.md` section 54 is the authority. Restated here as the checklist:

- [ ] Design document answering all twenty eight items of section 44.
- [ ] Deterministic generator, measured acceptance rate, computed state space
      census.
- [ ] Independent verifier, separate process from generation.
- [ ] Explicit fairness claim, and a unique solution where the game claims one.
- [ ] Decomposition check and symmetry check.
- [ ] One emergent integer difficulty measure, seven populated bands, machine
      checked calibration report.
- [ ] Monday against Sunday stated as a player feel, not only as a number.
- [ ] Complete refusal catalogue, every path tested. One property test.
      Determinism tested.
- [ ] Compact state, manifest round trip, state round trip.
- [ ] Playable at 360 pixels, keyboard parity, announcements.
- [ ] Two or more telemetry patterns, deterministic fingerprint, real clipboard
      artifact, graphic card artifact specified.
- [ ] Leak free certification with positive controls.
- [ ] Offline smoke test.
- [ ] The full section 45 gate green, output pasted.
- [ ] Registry `live`, allow list `productionSafe: true` as a consequence of
      certification and never of directory existence.
- [ ] Daily card renders one more row. Cross promotion offers it.
- [ ] `ARCHITECTURE2.md` manifest rows, decisions, migration log. `BACKLOG.md`
      deferrals. `ASSETS.md` if any asset shipped. A changelog entry.
- [ ] Defect report appended, corrections applied afterwards, all games green.

## 8. Deviations carried into this phase

Known, accepted, and recorded so nobody rediscovers them as bugs.

1. **Requirement 7.1.1 is not satisfied by this lineup.** DIFFERENCE RELAY, RING
   BALANCE and ORDER OF OPERATIONS are all order a permutation under
   constraints. TURN TABLE and ROTATE LOCK are both rotate route pieces under
   checkpoints. Five games, two cognitive modes. Across all eight the suite has
   no categorization game and no pattern or memory game, the latter because
   RECALL covered it and was cancelled. Accepted 2026-09-13 with composition A.
   The pool concepts that would close the gap, if a later review wants one:
   THREE-WAY SPLIT, SHADOW LEDGER, WORD WEAVE, PRIME PAIRING. Substituting one is
   an edit to `src/shell/registry.ts` and nothing else while the game is unbuilt.
2. **The daily card exceeds the v3 nine line cap at seven and eight finished
   games.** Composition A created this and it is unresolved. It does not block
   any game here, and it must be settled before the suite share path moves to
   v3. See `BACKLOG.md`.
3. **The suite is eight games**, a stated deviation from the charter's Section 0
   and requirement 7.3.1, approved 2026-09-13.

## 9. Stop and ask

- A verification strategy in section 3 turns out not to prove what it claims.
- A game cannot be built without an engine change and the workaround would ship
  something a player would notice.
- A difficulty band cannot be filled with 52 days a year from the eligible pool.
- Two games want the same skill once the rules are real. Requirement 7.1.1 is
  already conceded at the lineup level, so this means something narrower and
  worse: two games that play the same way, not two that share a family.
- The section 45 gate cannot be passed for a reason that is a property of the
  concept rather than of the implementation.
