# VECTOR.md section 9, replacement

Replaces sections 9, 9.1, 9.2, 9.3 and 9.4 of `VECTOR.md` in full. Sections 1
through 8 and 10 through 16 are unchanged except where section 10 assertions 3
to 5 name the stored fields, which now read `intensity` where they read
`difficulty`.

## 9. Generation

A day's puzzle is a clue layout and a lever record, derived from one seeded
stream so a client past the horizon reproduces the day exactly.

### 9.0 Why the boards are carved and not sampled

The procedure this document originally specified was: place clues, fill every
blank with a random legal arrow, publish the arrival counts, propagate, and
reject on a stall. It is sound and it does not work. Measured over 6,000 seeds
at each clue count, the share of boards that resolve without guessing:

| Clues | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 |
|---|---|---|---|---|---|---|---|---|
| Resolves | 0.00% | 0.00% | 0.08% | 0.23% | 0.68% | 3.57% | 6.81% | 14.52% |

The 8 to 12 clue range this game wants is unreachable by rejection sampling, and
the browser fallback of 9.3 would spin for minutes on a phone.

**Boards are carved.** Start from a dense skeleton that resolves, then remove
clues one at a time, keeping each removal that still resolves. A removal is a
small perturbation rather than a fresh board, because every arrow keeps its
direction wherever that direction still reaches a clue and only the arrows whose
target vanished are redrawn. Measured over 20,000 attempts: 996 boards, 5.0
percent, at 0.55 milliseconds an attempt, landing on 8 to 12 clues.

### 9.1 The procedure

1. **Skeleton.** Draw a permutation of six cells, one per row and one per
   column, satisfying invariant 2 outright. Add cells until the skeleton holds
   `START_CLUES`, 22.
2. **Fill and publish.** Give every blank a direction drawn uniformly from its
   candidate set, trace to targets, and write the arrival counts into the clues.
   Invariant 4 holds by construction because every arrow arrives somewhere.
3. **Propagate.** Redraw the arrows up to `DERIVE_TRIES` times until the board
   resolves. If none does, take a new skeleton.
4. **Carve.** Repeatedly drop one clue at random. Skip the drop if the remaining
   clues no longer cover every row and column. Otherwise re-derive as in step 2,
   carrying the previous arrows, and keep the result if it resolves. Stop at
   `CLUE_FLOOR`, 8, or after `REMOVAL_STALL_LIMIT` consecutive refusals.
5. **Reject** a carve that stalls above `CLUE_CEILING`, 12.
6. **Screen and band.** Sections 9.2 and 9.3.

**One stream per puzzle and no salts.** POKER GRID and CIPHER retry under a
salt. A carve consumes a variable number of draws, so the position in the stream
already distinguishes one attempt from the next, and a salt would be a second
way of saying the same thing. What a day records is the **attempt**, the count
of carves the stream consumed before one passed, and verification replays that
many carves from the same seed and asserts the layout is byte identical.

### 9.2 Difficulty, and why it is not the depth

`PHASE-13-PLAN.md` section 2 names the difficulty as the maximum propagation
depth. Measured across 996 carved boards, that integer takes four values:

| Depth | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|
| Boards | 2 | 271 | 400 | 312 | 11 |

Three usable classes cannot carry seven weekday bands, and unlike CIPHER, where
a band could become a set of classes, there are not enough classes here to make
seven sets of any kind. Carving to a sparser floor was tried and does not widen
the range: at a floor of six clues the depths are still 4 through 7.

**Difficulty is therefore the intensity: the mean round in which a cell was
forced, in hundredths.** It is `floor(100 * sum of assignment rounds / blank
cells)`, an integer from the same single propagation pass, reproducible exactly
with no float comparison anywhere. It reads what the depth was meant to read,
how long the chain of forced deductions runs, and it also counts how much of the
board waits on that chain rather than falling out early. Measured range 159 to
387, smooth and unimodal.

The depth is still computed, still stored, and still screened on. It is no
longer the band input.

**Bands** are the septiles of the 955 boards that pass the screens, gentle
Monday to hard Saturday with Sunday between Thursday and Friday:

| Weekday | Intensity | Boards in the study |
|---|---|---|
| Monday | 217 or less | 121 |
| Tuesday | 218 to 232 | 135 |
| Wednesday | 233 to 244 | 141 |
| Thursday | 245 to 257 | 140 |
| Sunday | 258 to 271 | 135 |
| Friday | 272 to 292 | 150 |
| Saturday | 293 or more | 133 |

Every band holds more than the 52 days a year spends, at roughly one accepted
board in seven, which is about 140 carve attempts and 80 milliseconds per day.
`BAND_EDGES` carries the same warning `OPENING_GUESS` carries in CIPHER:
changing one edge invalidates every stored band in the horizon.

### 9.3 Screens

Rejected and re-carved from the same stream:

- **A stall or a contradiction.** Mandatory. It is the whole verification.
- **Depth below `DEPTH_FLOOR`, 4.** Two boards in 996. The floor is nearly free
  and is asserted anyway, because a verification that only checks the
  interesting property has nothing to say when the boring one breaks.
- **An opening above `OPENING_MAX_PERCENT`, 40 percent of blanks.** Rejects 5
  percent, the boards where most of the work is the first thing you see.
- **A clue with no suppliers**, which necessarily has value zero and constrains
  nothing.
- **A layout already used inside the horizon.** Compared on the layout, which is
  exactly the puzzle.

Recorded per day for audit, requirement 6.3.6: the levers, from the fixed
vocabulary `clue-sparse`, `clue-dense`, `zero-heavy`, `edge-weighted`,
`centre-weighted`, `none`, plus the depth, the opening, the intensity and the
attempt. Levers are recorded rather than scheduled, following CIPHER generation
decision 3.

### 9.4 The fallback past the horizon

The whole pipeline runs in the browser, because propagation is 36 cells and
three rules with no table, and a carve costs half a millisecond. A board
generated on a phone therefore carries the same solvability and uniqueness proof
as one from the manifest, which is new: POKER GRID's fallback is unrated because
a phone cannot solve it, and CIPHER's because the solver is 1.7 megabytes and
stays in CI.

**The fallback enforces the stall check and both screens, never the band.** The
band is a property of a curated horizon and insisting on it would turn an
unlucky stream into a long loop. It carves up to sixty times, at a measured
5 percent acceptance, and reports a puzzle failure if it exhausts them, which
the shell already renders as an unavailable day.

`ShareContext.rated` is not consulted anywhere in this module. VECTOR's tier is
its submission count on every day of its life.

### 9.5 The first session board

`firstSessionBoard` returns the layout checked into `generator.ts`: eleven
clues, twenty five blanks, depth four, intensity 196, which is below the
gentlest band's floor, so the tutorial cannot drift harder than the Monday it
precedes. It is not any day's puzzle and is never counted, offline decision 11.
Its depth, opening and intensity are recomputed from the propagator rather than
written into the file, so the constant cannot disagree with the rules. A test
asserts it resolves and that its intensity stays under the Monday edge.
