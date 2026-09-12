# VECTOR, DESIGN DOCUMENT

Phase 13 deliverable one for game three. The equivalent of `POKER-GRID.md` and
`CIPHER.md`. Everything here follows from `SLATE.md` slot 2 and
`PHASE-13-PLAN.md` sections 1 and 2, both approved. Nothing here reopens either.

Read with `ARCHITECTURE.md`. Named constants this document leaves uncalibrated
are marked **calibrated in the generation step**, the same device
`POKER-GRID.md` used for the scoring table before Phase 7 measured it and
`CIPHER.md` used for its bands before Phase 11 measured them.

## 1. Identity

| Property | Value |
|---|---|
| Game id | `vector` |
| Display name | VECTOR |
| One sentence rule | Point every arrow so each numbered cell is the first one that exactly that many arrows reach. |
| Epoch | 2026-01-05, the first Monday of the epoch year, template decision 4. Same puzzle numbers as CIPHER |
| Accent hue | 28 |
| Session target | Two to four minutes |
| Core skill | Constraint propagation, every fact present at the start |
| `hasWinLoss` | true |
| `archiveEnabled` | true |
| `stateVersion` | 1 |
| Input | `grid`, 6 by 6, pointer `tap` |
| `bucketCount` | 4, section 6.3. The registry's provisional value is replaced by this |

## 2. Rules text

The rules as a player reads them, and as the help panel states them.

**Headline.** Point every arrow at a number.

1. Tap a blank cell to turn its arrow. Each tap turns it to the next direction
   that reaches a number.
2. An arrow travels in a straight line and stops at the first number it meets.
   Other arrows never block it.
3. Every number must be reached by exactly that many arrows. A zero means no
   arrow may reach it.
4. Fill every blank cell, then submit. You have three submissions, and a wrong
   one tells you only that it was wrong.

**Worked micro example.** A single strip of five cells, a 3 on the left, a 0 on
the right, three blanks between them.

```
[3] . . . [0]
```

Each blank can only point left or right, because up and down leave the strip
without meeting a number. The 0 refuses every arrow, so all three point left,
and the 3 is satisfied. Text equivalent for the help panel, required by
`HelpContent`: "A three, then three blank cells, then a zero. Nothing may reach
the zero, so all three arrows point left, and the three is reached three times."

The strip is an illustration and not a board. It does not satisfy the placement
invariants of section 3.4, which govern real boards only.

## 3. Board, coordinates, and the closed system

| Property | Value |
|---|---|
| Columns | 6 |
| Rows | 6 |
| Cells | 36, index `row * 6 + col`, row 0 at the top |
| Clue cells | 8 to 12, holding an integer, fixed for the day |
| Blank cells | 24 to 28, each holding one arrow or nothing yet |
| Direction encoding | 0 up, 1 right, 2 down, 3 left, clockwise from up |
| Empty blank | `null` in state, `.` in the serialized string |

Six columns is the widest legible board at a 360 pixel viewport. With 16 pixels
of page padding and 4 pixel gaps, a cell is 54 pixels square, clear of the 44
pixel floor of requirement 8.2. Six rows rather than seven keeps ray lengths
equal in both axes, which matters because an asymmetric board biases which
directions can reach a number at all, and that bias would show up as a
systematic difference between horizontal and vertical deductions.

### 3.1 Arrows must land

**Every arrow must reach a numbered cell.** A direction whose ray leaves the
board without meeting a number is not a legal placement and is not offered.

`SLATE.md` states the rule as an arrow travelling until it reaches the first
numbered cell "or leaves the board". That reading is resolved here in favour of
the closed system, and section 14.1 records why: with escaping arrows permitted,
a cell with two escaping directions has two placements that produce identical
counts, so the board has more than one arrow solution while having exactly one
count solution. The whole verification claim of this game rests on the arrow
board being unique, and the open reading forfeits it.

The closed system buys three further things. The player gets a global check,
because the clue values sum to the number of blank cells exactly. Every
direction a cell offers reaches a distinct number, so resolving a cell's target
resolves its arrow. And the rule shortens rather than lengthens.

### 3.2 Candidates

For a blank cell `c` and a direction `d`, the **target** of `(c, d)` is the
first clue cell along the ray, or none. Targets are static for the whole day,
because only clue cells stop a ray and clue cells never move. The **candidate
set** of `c` is the set of directions whose target is not none.

Two distinct directions from one cell can never share a target, since the four
rays are disjoint. So a cell's candidates are in bijection with the clues it can
reach, and every deduction about targets is a deduction about arrows.

### 3.3 Suppliers

The **suppliers** of a clue `N` are the blank cells with a direction whose
target is `N`. Each supplier can contribute at most one arrow to `N`. The
supplier relation is the transpose of the candidate relation and is computed
once per puzzle by the same function.

### 3.4 Placement invariants

Asserted in code and in tests. Numbering is referenced elsewhere in this
document.

1. The board is 36 cells and the clue cells never change during play.
2. Every row and every column holds at least one clue cell.
3. Every blank cell has at least two candidate directions. Follows from
   invariant 2, since a cell sees a clue along its own row and another along its
   own column.
4. The clue values sum to the number of blank cells.
5. Every clue has at least one supplier.
6. The board has exactly one arrow assignment satisfying every clue, and
   propagation reaches it, section 7.
7. Submissions never exceed three, and solved implies at least one submission.

Invariant 2 is the placement rule that makes invariant 3 free. Invariant 3 is
worth having on its own: a cell with one candidate is solved before the player
does anything, and a board made mostly of those is a board with no puzzle in it.

## 4. Actions, state, and rejections

### 4.1 State

```
VectorState = {
  arrows:      (0 | 1 | 2 | 3 | null)[36]   null on clue cells and unfilled blanks
  submissions: number                        0 to 3
  solved:      boolean
}
```

The in progress arrow board is the whole of requirement 3.3.3 for this game, so
it is state and not renderer scratch.

`solved` is stored rather than recomputed, and this is the one place VECTOR
diverges from POKER GRID's habit of recomputing everything on deserialize. A
board that satisfies every clue is not by itself a win: a player may reach the
answer and not have submitted it yet, and recomputing would hand them a victory
they never claimed. `deserialize` instead asserts the pair is consistent, so a
stored flag that disagrees with the board is impossible rather than undetectable.

### 4.2 Actions

| Action | Effect |
|---|---|
| `{ kind: "cycle", cell }` | Advances the cell to the next direction in its candidate set, in the order up, right, down, left, wrapping past the last candidate to empty. |
| `{ kind: "set", cell, dir }` | Writes one direction, or `null` to clear. |
| `{ kind: "submit" }` | Scores the board. Correct ends the game as a win, wrong spends one of three. |

`cycle` is the tap and the keyboard activation. `set` is the primitive, and it
exists because tests and any future direct input should not have to count taps.
`cycle` is defined in terms of `set` and the two share one implementation.

### 4.3 Rejections, every path

| Code | Announce | When |
|---|---|---|
| `cell-range` | (developer error, never announced) | cell outside 0 through 35 |
| `not-a-blank` | That cell holds a number. | `cycle` or `set` on a clue cell |
| `not-a-candidate` | That arrow would leave the board without reaching a number. | `set` with a direction outside the cell's candidate set |
| `incomplete` | Fill every blank cell before you submit. | `submit` with any blank empty |
| `game-over` | This puzzle is finished. | any action once solved or three submissions spent |

`incomplete` does not spend a submission. A half filled board is a mistake in
the tap, not an answer, and spending an attempt on it would make the count
measure carelessness rather than reasoning.

There is no rejection for a complete but wrong board. That is an answer, it is
wrong, and it spends a submission. Section 14.2.

## 5. Checking a submission

A submission is correct when, for every clue `N`, the number of arrows whose
target is `N` equals the value of `N`.

The check consults no answer key. Because the solution is unique, satisfying
every clue and being the solution are the same thing, so the rules layer decides
correctness from the board in front of it. **The answer is therefore stored
nowhere**, not in the manifest, not in `localStorage`, and not in the bundle.
Requirement 8.4 has almost nothing left to protect for this game, which is the
strongest anti spoiler position of the three games so far and is a consequence
of the closed system rather than a feature added on top of it.

Cost is one pass over the blank cells with a precomputed target per cell and
direction, so it is a few dozen array reads.

## 6. Terminal conditions, score, tier, distribution

A game is finished when a submission is correct, which is a win, or when three
submissions have been spent without one, which is a loss.

- `won` is true or false. `hasWinLoss` is true.
- `score` is the submissions used, 1 through 3, on a win, and 0 on a loss. Same
  convention as CIPHER: lower is better on a win, which is why the end screen
  shows the submission count and the tier and never the word score.
- `detail` is `Solved on submission 2` or `Not solved`.

On a loss the end screen reveals the solution, derived in the browser by running
the propagation of section 7 over today's clues. Nothing is fetched and nothing
was stored to make that possible.

### 6.1 Tier

From the submission count alone, owing nothing to the manifest, so it is correct
past the horizon. Contract decision 16.

| Outcome | Tier | Ordinal |
|---|---|---|
| Solved on the first submission | Excellent | 0 |
| Solved on the second | Great | 1 |
| Solved on the third | Good | 2 |
| Not solved | Rough | 4 |

**Fair is unused.** Four outcomes cannot fill five bands, and the honest choices
are to leave one empty or to grade a failure by how close it came. Grading a
failure means measuring the board a player got wrong and putting that
measurement in a share title, which is board information travelling to someone
who has not played yet. The empty band costs nothing: the daily card meter of
suite decision 3 simply never renders four cells for this game.

### 6.2 Distribution

Four buckets:

```
["1 submission", "2 submissions", "3 submissions", "Not solved"]
distinguishedIndex: 0
```

`bucketOf` returns `submissions - 1` on a win and 3 on a loss.

## 7. The deduction rules and the depth measure

Three rules, stated once here, implemented once in `propagate.ts`, and used by
the generator, the verifier, the difficulty measure, and the reveal on loss.

Each blank cell carries a live domain, initially its candidate set. Each clue
carries an assigned count and a set of possible suppliers, initially all of them.

- **P1, single.** A cell whose domain holds one direction takes that direction.
- **P2, full.** A clue whose assigned count equals its value drops from every
  unassigned cell the direction that targets it. A clue of value zero fires this
  in the first round.
- **P3, forced.** A clue whose remaining possible suppliers number exactly what
  it still needs takes an arrow from every one of them.

**Soundness.** Every solution satisfies P1, P2 and P3, so no rule can remove a
direction any solution uses. If propagation assigns every cell, then every
solution equals that assignment, so there is at most one, and the generating
assignment is one, so there is exactly one. This single argument is why
uniqueness and human solvability arrive together, and it is the reason this game
is on the slate at all.

**A round applies every rule to the state as it stood at the start of the
round.** Depth is the number of rounds until every cell is assigned. The
alternative, a work queue that applies each deduction the moment it becomes
available, produces a depth that depends on the order the queue happens to pop,
which is not a number two processes can be made to agree on. Rounds are order
independent by construction, which is what lets `tools/vector-verify.ts`
reproduce the stored difficulty exactly rather than within a tolerance.

**Stall.** A round that assigns nothing and removes nothing while blank cells
remain is a stall. A stalled board is rejected and regenerated. Nothing in this
game guesses, ever, in any process.

## 8. Worked example

A 4 by 4 board rather than the shipping 6 by 6, so the trace fits on a page. The
mechanism is identical.

```
      c0    c1    c2    c3
r0   [4]    .     .     .
r1    .     .    [2]    .
r2   [3]    .     .    [2]
r3    .    [0]    .     .
```

Five clues, eleven blanks, values summing to eleven, every row and column
covered. Candidate sets, written as target clue by position:

| Cell | Candidates |
|---|---|
| (0,1) | left to (0,0), down to (3,1) |
| (0,2) | left to (0,0), down to (1,2) |
| (0,3) | left to (0,0), down to (2,3) |
| (1,0) | up to (0,0), down to (2,0), right to (1,2) |
| (1,1) | right to (1,2), down to (3,1) |
| (1,3) | left to (1,2), down to (2,3) |
| (2,1) | left to (2,0), right to (2,3), down to (3,1) |
| (2,2) | left to (2,0), right to (2,3), up to (1,2) |
| (3,0) | up to (2,0), right to (3,1) |
| (3,2) | left to (3,1), up to (1,2) |
| (3,3) | left to (3,1), up to (2,3) |

**Round 1.** The 4 at (0,0) has exactly four suppliers and needs four, so P3
takes all of them: (0,1) left, (0,2) left, (0,3) left, (1,0) up. In the same
round the 0 at (3,1) fires P2 and drops the direction aimed at it from (1,1),
(2,1), (3,0), (3,2) and (3,3).

**Round 2.** Four cells now hold one candidate each, so P1 assigns (1,1) right,
(3,0) up, (3,2) up, (3,3) up. The 3 at (2,0) has lost (1,0) to the first round,
leaving exactly three possible suppliers against a need of three, so P3 takes
(2,1) left, (2,2) left and (3,0) up.

**Round 3.** Only (1,3) is unassigned. The 2 at (1,2) is full, so P2 drops its
left direction, and the 2 at (2,3) needs one more from one remaining supplier,
so P3 takes it down. The board resolves.

Depth is 3. The solution:

```
      c0    c1    c2    c3
r0   [4]    <     <     <
r1    ^     >    [2]    v
r2   [3]    <     <    [2]
r3    ^    [0]    ^     ^
```

Two properties of this board are worth naming because the generator screens for
both. The 4 is an opening, a clue whose need equals its supply, and a board with
no opening cannot start. The 0 is the other kind of opening, and it is the one
that pays twice, because it both removes directions and hands P1 its first
singles.

## 9. Generation

A day's puzzle is a clue layout and a lever record, both derived from
`seed(gameId, puzzleNumber, salt)` so a client past the horizon reproduces
attempt 0 exactly. Generation decision 10.

1. **Place clues.** Draw a permutation of six cells, one per row and one per
   column, which satisfies invariant 2 outright. Add two to six more cells drawn
   from the remainder. Clue count is therefore 8 to 12.
2. **Fill arrows.** Give every blank cell a direction drawn uniformly from its
   candidate set. Invariant 3 guarantees the set is non empty.
3. **Publish counts.** Trace every arrow to its target and write the arrival
   count into each clue. Invariant 4 holds by construction, since every arrow
   arrives somewhere.
4. **Blank the arrows.** The layout is the puzzle.
5. **Propagate.** Reject on a stall. Record the depth and the count of cells
   assigned in round 1.
6. **Screen and band.** Sections 9.1 and 9.2.

The generating assignment is discarded after step 3. It is a solution and, once
the board passes step 5, it is the solution, but nothing downstream needs it.

### 9.1 Rejection, and what it is for

Rejected under a salt and regenerated:

- **A stall.** Mandatory. It is the whole verification.
- **Depth below `DEPTH_FLOOR`.** A board that resolves in two rounds falls out at
  a glance and reads as a broken game rather than an easy one. This is CIPHER's
  fairness floor pointing the other way. **Calibrated in the generation step.**
- **An opening share above `OPENING_MAX`.** The fraction of blanks assigned in
  round 1. A board where most of the work is the first thing you see has one
  decision in it. **Calibrated in the generation step.**
- **A clue with no suppliers.** Its value is necessarily zero and it constrains
  nothing, so it is decoration on a board that has to stay readable at 54 pixels
  a cell.
- **A layout already used inside the horizon.** Two days with the same board is
  visible to anyone who opens the archive. Compared on the layout string, which
  is exactly the puzzle.

### 9.2 Difficulty and bands

Difficulty is the propagation depth, an integer produced by the verifying pass.
Bands run Monday gentle to Saturday hard with Sunday between Thursday and
Friday, matching the curve POKER GRID and CIPHER already set. Edges are
**calibrated in the generation step** from the measured depth distribution and
recorded in `ARCHITECTURE.md` under VECTOR generation decisions.

If depth turns out to take too few distinct values to cut into seven windows, a
**band is a set of depth values** rather than a numeric window. That is CIPHER
generation decision 2 and it is pre authorised here so measurement does not have
to stop and ask. What measurement must confirm is that every band admits enough
boards to fill 52 days a year at a workable acceptance rate. If it cannot, that
is a section 7 stop and ask in `PHASE-13-PLAN.md`.

Recorded per day for audit, requirement 6.3.6: the levers drawn, from the fixed
vocabulary `clue-sparse`, `clue-dense`, `zero-heavy`, `edge-weighted`,
`centre-weighted`, `none`, plus the opening share and the attempt number.

### 9.3 The fallback past the horizon

`generatePuzzle` runs the whole pipeline in the browser, including propagation,
because propagation is 36 cells and three rules with no table. A board generated
on a phone therefore carries the same solvability and uniqueness proof as one
from the manifest, which is new: POKER GRID's fallback is unrated because a
phone cannot solve it, and CIPHER's is unrated because the solver is 1.7
megabytes and stays in CI.

**The fallback enforces the stall check and `DEPTH_FLOOR`, never the weekday
band.** The band is a property of a curated horizon and insisting on it would
make an unbounded loop out of an unlucky seed. It retries under successive salts
up to `FALLBACK_ATTEMPTS` and reports a puzzle failure if it exhausts them,
which the shell already renders as an unavailable day.

`ShareContext.rated` is not consulted anywhere in this module. VECTOR's tier is
its submission count on every day of its life.

### 9.4 The first session board

`firstSessionPuzzle` returns a board checked into `generator.ts` as a constant:
twelve clues, short rays, depth at `DEPTH_FLOOR`. It is not any day's puzzle and
is never counted, offline decision 11. A test asserts it resolves by propagation
and that its depth is at or below the gentlest band's floor, so it cannot drift
harder than the Monday it precedes.

## 10. Verification

`tools/vector-verify.ts`, a separate process from generation in CI, generation
decision 13. Per entry:

1. **Re-derive.** Regenerate the layout from the recorded seed and attempt and
   assert it is byte identical to the stored one. Verification re-derives rather
   than re-reads, generation decision 12.
2. **Invariants.** All seven of section 3.4.
3. **Resolves.** Propagation assigns every cell, and the round count equals the
   stored difficulty exactly.
4. **Band.** The difficulty falls in the band for that entry's weekday.
5. **Opening.** The round 1 assignment count equals the stored opening and its
   share is at or below `OPENING_MAX`.
6. **Uniqueness, independently.** A backtracking search, written separately from
   the propagator and used nowhere else, is asked to find a second solution. For
   each blank cell and each direction other than the one propagation assigned, it
   fixes that direction and searches the remainder with a node ceiling. Every
   branch must be unsatisfiable. Any solution differs from the known one at some
   cell, so the branches cover every other solution exhaustively.
7. **No duplicate layout** inside the horizon.

Assertion 6 is the one that earns its keep. Assertions 3 and 6 make the same
claim by two different routes, and the argument in section 7 is a proof about
the rules rather than about the code that implements them. A propagator with a
bug in P3 would pass assertion 3 while resolving to something that is not the
answer, and only an independent search notices. Exceeding the node ceiling fails
the board rather than passing it.

**Cost.** Propagation is a handful of passes over 36 cells. The uniqueness
search branches at most 28 times 3 ways with propagation pruning each branch at
or near its root. A full year generates and verifies in seconds, so there is no
beam anywhere in this game, no search ceiling that changes an answer, and no
value labelled best known. VECTOR makes the same strength of claim CIPHER does
and makes it about a board rather than about a four symbol code.

## 11. Manifest and serialization

### 11.1 Manifest

`data/vector/manifest.index.json` names the horizon and one chunk.
`data/vector/manifest.horizon.json` holds all 365 days as `entries` keyed by
puzzle number, contract decision 13. One chunk, because a layout is 36
characters and a year is roughly 25 kilobytes, which does not want twelve files.
Named for the span it covers rather than a calendar year, since a 5 January
epoch runs four days into the next one.

An entry carries the obfuscated layout, the levers, the difficulty and opening
under `best`, and the attempt it was drawn on. It carries no answer, section 5.

The layout encodes as 36 characters over a 32 symbol alphabet: index 0 is a
blank cell and index `v + 1` is a clue of value `v`. Clue values above 30 are
impossible on a board with two or more clues and the encoder asserts it.
Obfuscation uses `engine/manifest-codec.ts` with a radix of 32, so VECTOR writes
no codec of its own. That is Phase 11 defect 2's correction working as intended,
and it is the first game to be authored after it.

### 11.2 Serialization

```
{ v: 1, data: { a: "..0.13....", n: 2, s: false } }
```

`a` is 36 characters, a digit 0 to 3 for a direction and `.` for a clue cell or
an unfilled blank. `n` is the submissions spent. `s` is solved.

`deserialize` validates against the supplied puzzle: length, every clue cell
holding `.`, every filled blank holding a direction inside that cell's candidate
set, `n` in 0 through 3, and `s` implying both `n >= 1` and a board that
satisfies every clue. Anything else is `malformed`.

The candidate check is defence in depth against a stale save rather than a
contract obligation, contract decision 14. It is not a reliable mismatch
detector, since yesterday's arrows can be legal on today's board, and VECTOR
does not claim otherwise. The engine owns puzzle identity and `main.ts` restores
stored state only for the day being opened.

## 12. Share block

One row per submission, in order, five cells each. `best` across for the
submission that solved it, `miss` across for one that did not. Three rows
maximum, so five lines including the title and the URL.

Five cells is the suite's meter width, shared with the daily card and with TALLY
DROP. A row carries the outcome of one submission and nothing else: no cell, no
direction, no clue, no count of how close a wrong board was.

**Title.** `VECTOR <number> <tier name>`, plus `, streak <n>` when the streak is
at least two, following CIPHER's form. There is no unrated case, section 9.3.

### 12.1 Worked examples

Solved on the first submission:

```
VECTOR 249 Excellent
⭐⭐⭐⭐⭐
dailykit.providentia.games
```

Solved on the third, with a streak:

```
VECTOR 249 Good, streak 12
🔻🔻🔻🔻🔻
🔻🔻🔻🔻🔻
⭐⭐⭐⭐⭐
dailykit.providentia.games
```

Not solved:

```
VECTOR 249 Rough
🔻🔻🔻🔻🔻
🔻🔻🔻🔻🔻
🔻🔻🔻🔻🔻
dailykit.providentia.games
```

A win and a loss can both run three rows and are told apart by the last one,
which is stars on a win and never on a loss. Every row is five cells, so the
engine's per block padding has nothing to do.

The daily card needs nothing new. It reads `FinishedOutcome.tier`.

Snapshot tests cover: each of the three win rows, the loss, the streak present
and absent, and every tier name.

## 13. Input and accessibility

`InputDescriptor` is `{ kind: "grid", cols: 6, rows: 6, pointer: "tap" }`, so
`ui/gridCursor.ts` is reused unchanged. Clue cells are unnavigable and the
cursor skips them, which is the same behaviour presentation decision 12 gives an
emptied POKER GRID column.

- Tap a blank cell to cycle it. Arrow keys move the cursor, Enter or Space
  activates, which cycles the cell under the cursor.
- **The ray of the focused cell is highlighted**, along with the clue it
  reaches, drawn as an outline and a dotted overlay rather than a colour change,
  requirement 8.1. This is the sighted equivalent of the announcement below, and
  it is the only assistance the board gives.
- Every cycle announces through `MountContext.announce`: the cell, the new
  direction, and the clue it now reaches, or that the cell is empty again.
- Clue cells are exposed in the DOM with their value and position so a screen
  reader can browse the board even though the cursor does not stop on them.
- Arrows are self drawn SVG paths, no font and no emoji. Recorded in
  `ASSETS.md`, along with the naming caution below.
- `prefers-reduced-motion` removes the cycle transition and the ray fade. The
  highlight is static either way, and there is no timing element anywhere in
  this game.

**Naming caution, from `SLATE.md`.** Arrow and ray counting puzzles appear in
published catalogues under proprietary genre names. Mechanics are not
protectable and this one is generated independently, but no published genre name
appears anywhere in the product or in this repository. Recorded in `ASSETS.md`
at build time.

## 14. Interactions this document must resolve

### 14.1 Escaping arrows against a unique board

`SLATE.md` permits an arrow to leave the board. `PHASE-13-PLAN.md` requires
propagation to resolve the board completely, and the slate's own argument for
this game is that resolving proves uniqueness and solvability at once.

A cell with two escaping directions has two arrow placements producing identical
clue counts, so propagation can never resolve it and every board containing one
is rejected. The open reading therefore does not weaken the proof, it throws
away most of the boards, and it leaves the player a rule about a case that never
survives generation.

**Resolved in favour of the closed system**, section 3.1. An escaping direction
is not a candidate, so it is never offered, never placeable, and never
mentioned except in the one rejection that explains itself.

### 14.2 A live clue tally against three blind submissions

The natural interface for this genre marks each clue satisfied, oversubscribed
or short as the player works. That interface cannot ship here. A complete board
with every clue marked satisfied is the solution, so a live tally tells the
player they have won before they submit, and the three submissions of the fixed
failure model become decoration.

**Resolved: the board shows no correctness signal before a submission.** No clue
tally, no satisfied styling, no completion indicator beyond the fact that every
cell is filled, which is a requirement of submitting and not a statement about
being right.

The assistance that survives is the ray highlight of section 13, because it
displays a static fact about the board rather than a fact about the player's
answer. Tracing a ray is bookkeeping. Counting arrivals is the game.

The cost is real and is accepted: a player who reasons correctly and then
miscounts once loses a submission and is told nothing. Three submissions is the
allowance for exactly that, and the guarantee that every board is forced means a
careful player never has to guess, only to check.

### 14.3 Five tier names against four outcomes

Resolved in section 6.1. Fair is unused, and a failure is not graded by how
close it came.

### 14.4 One activation verb against two useful ones

Cycling forward is the only verb a grid cell has, because `gridCursor` offers
one activation. Four taps therefore return a cell to empty, and there is no
backward cycle. With at most four candidates that is a bounded annoyance. It is
also predicted defect 1, section 15.

## 15. Where this design meets the contract, and where it does not

Written before implementation as a prediction, to be confirmed or struck by the
build. The zero engine changes rule stands: each is confirmed only by hitting it
during the build, and the workaround named is what the game does instead.

| # | Defect | Workaround inside the rule |
|---|---|---|
| 1 | A `grid` game has exactly one activation verb per cell, so a cell with more than one useful action has no second key. Contract decision 11 gives raw keys only to `custom` games, and a game that attached its own listener would be a `grid` game pretending to be a `custom` one | Forward cycle only, wrapping through empty. Proposed correction: a grid game may declare extra keys that the cursor passes through untouched |
| 2 | `FinishedOutcome.score` now means "lower is better" in two of three games and "higher is better" in one, with nothing in the type saying which | Nothing to work around inside a module. Proposed correction: the field is documented as module private and no suite level code compares it across games, or it carries a direction |
| 3 | The backlogged shared list cursor gets no second example here, because VECTOR is a lattice game and uses the cursor unchanged | Nothing. The item stays open for TALLY DROP, which is the first game that could justify it. Recorded so game four does not find it undecided and assume nobody looked |
| 4 | `firstSessionPuzzle` returns a puzzle with no manifest entry, so the module builds an entry shaped value with no difficulty, no lever record and no attempt | Construct it in `generator.ts` beside the constant board. Proposed correction only if a second game hits the same shape |

The prediction worth stating plainly: **VECTOR should find fewer defects than
CIPHER did**, because it is a grid game with a tap, a manifest, a tier from play
and a small serialized payload, which is the shape the contract was corrected
into after Phase 11. If it finds more, requirement 7.4 says the contract is the
problem and building stops. Section 5 of `PHASE-13-PLAN.md` is where that call
gets made.

## 16. Files

```
VECTOR.md                        this document
src/games/vector/rules.ts        cycle, set, submit, satisfaction, terminal, rejections
src/games/vector/propagate.ts    candidates, suppliers, P1 to P3, rounds, depth, solve
src/games/vector/generator.ts    seeded clue placement, arrow fill, screening, the first session board
src/games/vector/module.ts       the GameModule implementation
src/games/vector/render.ts       board, arrows, ray highlight, submission counter
src/games/vector/style.css
src/games/vector/help.ts
src/shell/entries/vector.ts
src/shell/entries/vector.html
tools/vector-generate.ts
tools/vector-verify.ts           re-derivation and the independent uniqueness search
data/vector/manifest.index.json
data/vector/manifest.horizon.json
tests/games/vector/*.test.ts
```

`propagate.ts` ships in the browser bundle, which inverts CIPHER's split. Rule 6
of `PHASE-13-PLAN.md` keeps a solver out of the bundle when it carries a large
table, and this one carries none: three rules over 36 cells. It ships because
the reveal on a loss needs it and because the fallback generator of section 9.3
is only trustworthy with it. The uniqueness search is the piece that stays in
CI, and it lives in `tools/vector-verify.ts` so it cannot be imported by
accident.

Plus `status: "live"` in `src/shell/registry.ts` with `bucketCount: 4`, and one
line in the `vite.config.ts` allow list, which are configuration and do not
count against the zero changes rule.
