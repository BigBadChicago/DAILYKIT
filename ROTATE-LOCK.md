# ROTATE LOCK

Design document for game four of the suite and the first game authored on the v3
contract, charter Phase 13. It answers every item of ARCHITECTURE2.md section 44
and is the authority for `src/games/rotate-lock/`. Where it and the code disagree
the code is a defect, except where section 20 records a measurement that replaced
a provisional value here.

Written 2026-09-17. Section 8 is the prototype measurement the design was chosen on;
section 20 holds the values from the committed study, `data/rotate-lock/study.json`,
and the pipeline run that wrote the manifest.

---

## 1. Identity and the rule

| Field | Value |
|---|---|
| id | `rotate-lock` |
| Display name | ROTATE LOCK |
| Path | `/rotate-lock/` |
| Epoch | 2026-01-05, the first Monday of the epoch year |
| Accent hue | 308 |
| Board font | `ui-monospace, monospace` |
| hasWinLoss | true, corrected from the registry's provisional false |
| Buckets | 5, corrected from the registry's provisional 4 |
| stateVersion | 1 |

**One sentence rule** (item 1), the hub listing:

> Order and rotate the route pieces so the path takes every marked turn and ends at the lock.

**Rules text**, the whole of what a player is told:

1. The board is six by six. One cell is the start, one cell is the lock, and a few
   cells are marked turns.
2. The tray holds seven route pieces. Each piece is a straight arrow one, two or
   three cells long.
3. The route leaves the start and follows the pieces in tray order, each piece
   moving as many cells as its length in the direction it points. The route is
   drawn on the board after every move.
4. Swap any two pieces, or rotate one a quarter turn clockwise. Each is one move.
5. The lock opens when the route stays on the board, never enters a cell twice,
   turns at every marked cell, and ends on the lock. The route may also turn
   where nothing is marked.
6. Open it in as few moves as you can. After 56 moves the lock jams.

---

## 2. Cognitive mode (item 2)

Spatial planning with arithmetic partition. The player reads the marked turns as
fixed corners, infers any unmarked corner the pieces force, measures each leg of
the route in cells, and partitions seven lengths into those legs. The move count
then rewards planning the whole arrangement before touching it, because every
trial costs a move.

This is the same family as TURN TABLE, as PHASE-13-PLAN.md section 8 already
concedes. The narrower worry of its section 9, two games that play the same way,
does not apply: TURN TABLE rotates fixed tiles in place, and ROTATE LOCK has no
fixed positions at all. Its pieces have no home cell until the order gives them
one.

---

## 3. Substrate and its hardest gate (item 3)

Substrate: a rectilinear route on a six by six lattice, built from seven directed
segments of length one to three. Only geometry and small integers, so licensing
exposure is zero.

Hardest substrate gate: **legibility at 360 pixels**, the section 46 stress test.
The board and the tray must both be readable and touchable on one portrait screen
with no scrolling. Resolved in section 13: a board of 6 by 6 cells at 54 pixels,
and a tray of two rows, four pieces over three, at 80 by 56 pixels each, with the
route drawn as glyphs inside cells rather than as thin lines.

---

## 4. Session length (item 4)

Two to five minutes. Monday is under two for a player who counts first, and Sunday
takes five with unmarked turns to infer. In the registry this sits after CIPHER and
before the shorter ordering games, and the registry comment about provisional order
now has one fact to sort by.

---

## 5. Input model (item 5)

`custom`, pointer `tap`. The board is display only. Every interaction is on the
tray, which is the ORDER adapter of ARCHITECTURE2 section 21 plus a rotation verb.

| Semantic action | Pointer | Keyboard |
|---|---|---|
| Focus a piece | none, focus follows the tap | ArrowLeft, ArrowRight, ArrowUp, ArrowDown move focus in tray order, Home and End jump |
| Select a piece | tap it | Enter or Space on the focused piece |
| Swap two pieces, `{ kind: "swap", a, b }` | with one selected, tap another | with one selected, Enter or Space on another |
| Rotate a piece, `{ kind: "rotate", piece }` | the Rotate button, acting on the selected piece | R on the focused piece |
| Clear the selection | tap the selected piece again | Escape |

Selection is renderer state and never an action, so it costs nothing and is never
saved. Actions name pieces by id, not by slot, so a replayed log means the same
thing whatever the order was at the time.

Declared keys: `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home`, `End`,
`Enter`, ` `, `Escape`, `r`, `R`.

---

## 6. Rules, precisely

### 6.1 Coordinates and pieces

Cells are `row * 6 + col`, row 0 at the top. Directions are 0 up, 1 right, 2 down,
3 left, and a clockwise quarter turn is `(d + 1) % 4`.

A puzzle is `{ start, lock, marks, lengths, order, facing }`: `lengths[id]` is the
length of piece `id`, `order[slot]` the piece in each tray slot at the start of the
day, and `facing[id]` its starting direction. Start, lock and marks are distinct
cells.

### 6.2 The trace

The trace walks the pieces in tray order from the start. For piece `k` facing `d`
at junction cell `p`:

1. If `k > 0` and `d` equals the previous facing, `p` must not be a mark. The route
   would go straight through a marked turn.
2. If `k > 0` and `d` differs from the previous facing, the route turns at `p`. A
   reverse is not special: its first step re-enters the previous cell, which rule 4
   refuses.
3. Each of the piece's cells is entered in turn, and must be on the board.
4. It must not have been entered before, the start included.
5. It must not be a mark unless it is the piece's last cell. A mark in the middle of
   a piece is passed straight through.
6. It must not be the lock unless it is the last cell of the last piece.

The trace stops at the first failure and reports it with the piece index. It never
throws. A trace that walks all seven pieces **opens** when it ends on the lock and
turned at every mark.

The failure kinds, in the order the trace can meet them: `off-board`, `crossing`,
`through-mark`, `early-lock`, `short-of-lock`, `missed-marks`. The renderer names
the first one; section 13.3 has the sentences.

### 6.3 Actions and refusals (item 17)

| Code | When | Announcement |
|---|---|---|
| `game-over` | any action once the lock is open or jammed | "The lock is already finished for today." |
| `unknown-piece` | a piece id that is not an integer in range | "That piece is not in the tray." |
| `same-piece` | a swap naming one piece twice | "Choose two different pieces to swap." |

Nothing else is refused. A swap or rotation that leaves the route broken is a legal
move, because the route is information and a move is the price of it. Every code is
reachable and each has a test.

### 6.4 Terminal conditions and score

The day ends when a move leaves the route open, or when the 56th move leaves it
closed, which jams the lock. The start arrangement is never open, generator screen
S6, so zero moves never finishes.

`par` is the fewest moves from the start arrangement to any open arrangement,
computed exactly (section 10.3). The score is the move count, lower is better,
following VECTOR and CIPHER. `over = moves - par`.

### 6.5 Tier and buckets (item 18)

| Result | Tier | Bucket label |
|---|---|---|
| Opened at par | 0 Excellent | At par |
| Opened 1 to 4 over | 1 Great | 1 to 4 over |
| Opened 5 to 10 over | 2 Good | 5 to 10 over |
| Opened 11 or more over | 3 Fair | 11 or more over |
| Jammed | 4 Rough | Jammed |

Distinguished bucket: 0. Four is the width of one wasted full rotation, so a single
rotation overshoot costs the top tier and nothing more. The tier comes from par,
which is recomputed from the puzzle on every device, so it is never null, including
past the horizon where only the band is unrated.

---

## 7. Generator strategy (item 6)

Direct construction, ARCHITECTURE2 section 10.1: build the route, then derive the
marks and the pieces from it, then scramble.

1. **Route.** Draw a start cell. Draw a segment count of 4, 5 or 6. For each
   segment draw a direction that is neither the previous one nor its reverse, find
   the longest free run, and draw a length from 1 to `min(run, 5)`. A dead end
   restarts the attempt.
2. **Pieces.** Split each segment into pieces of length 1 to 3 by repeated draws.
   Keep the route only if the split yields exactly seven pieces.
3. **Marks.** Every corner is a mark, then the hidden turn lever removes `h` of them,
   `h` drawn from 0, 1 or 2. At least two marks must remain.
4. **Screens**, cheapest first, section 7.1.
5. **Scramble.** Shuffle the tray order and draw every facing, up to
   `SCRAMBLE_TRIES` times, until par lies in `[PAR_FLOOR, PAR_CEILING]` and the
   start does not open.

Randomness is the engine's integer rng through a `Draw` seam, as VECTOR does it,
one stream per puzzle, and the manifest records how many attempts the day consumed
so the verifier can replay it.

Levers recorded per day in the manifest: `hidden-0`, `hidden-1` or `hidden-2`, and
`segments-4`, `segments-5` or `segments-6`.

### 7.1 Screens

| Order | Screen | Rejects |
|---|---|---|
| S0 | piece count | a split that is not seven pieces |
| S1 | marks | fewer than two marks after hiding |
| S2 | decomposition, section 11 | a route whose legs are each read off one piece |
| S3 | symmetry, section 12 | a layout fixed by a board symmetry |
| S4 | uniqueness | more or fewer than one route |
| S5 | band | a difficulty outside the day's weekday band |
| S6 | scramble | no scramble with par in range within `SCRAMBLE_TRIES` |
| S7 | duplicate | a layout already used earlier in the horizon |

---

## 8. Measured acceptance rate (item 7)

From the prototype run of 20,000 attempts per setting, 2026-09-17, before any band
screen:

| Hidden turns | Routes built with seven pieces | Pass S2 | Unique |
|---|---|---|---|
| 0 | 1,036 | 955 | 948 |
| 1 | 1,043 | 954 | 494 |
| 2 | 1,034 | 948 | 134 |
| 3 | 1,029 | 940 | 10 |

S0 is the expensive screen and costs nothing, a few microseconds of drawing. The
uniqueness screen rejects almost nothing when every corner is marked, which by
section 10.2 is not evidence on its own; it becomes real evidence at one and two
hidden turns, where it rejects half and six sevenths. Three hidden turns is not a
lever value because one route in a hundred survives.

The rates from the real pipeline, with the band and scramble screens, are in
section 20.

---

## 9. State space census (item 8)

Per day, the player's arrangement space is every order times every facing:
`7! * 4^7 = 82,575,360` arrangements. Pieces of equal length make some of those
indistinguishable as routes, but not as arrangements, and the move count is over
arrangements, so the census is stated at that size.

The route level solver (section 10.1) does not search arrangements. It chooses a
length, not a piece, and orders same direction runs by non decreasing length, so it
visits each distinct partial route once. The prototype averaged 715 nodes per board
at zero hidden turns and at most a few thousand at two, under a millisecond.

The verifier (section 10.2) searches arrangements by piece id, pruned by the trace
rules and the distance to the lock. Over the committed year it visited 128,903,489
nodes, 1,086,909 on the largest day, in about 53 seconds.

---

## 10. Verification (item 9)

### 10.1 In the game: the route solver

`src/games/rotate-lock/solver.ts`. Depth first over lengths and directions with
these sound prunes: the trace rules of section 6.2 applied per step, the Manhattan
distance to the lock no more than the remaining length and of the same parity, and
no more unturned marks than remaining pieces. It returns the distinct routes, each
as its list of turn cells, up to a limit, and the difficulty of section 14. It
ships in the browser because it carries no table, as VECTOR's propagator does.

### 10.2 In CI: the independent verifier

`tools/rotate-lock-verify.ts`, a separate program that imports the rules and the
generator but never the solver. For every day it:

1. decodes the entry and checks structure: 36 cells, distinct start, lock and marks,
   seven lengths from 1 to 3, a permutation, facings from 0 to 3;
2. replays the recorded attempt count from the seed and requires a byte identical
   layout;
3. enumerates arrangements by piece id and facing with its own walker and requires
   exactly one distinct open route, **EXACT**;
4. recomputes par from the open arrangements it found, by its own cycle count, and
   requires it to equal the stored par;
5. requires the stored difficulty to equal the module's measure and the band to
   match the weekday;
6. runs the decomposition and symmetry checkers of sections 11 and 12;
7. requires no layout to repeat across the horizon.

### 10.3 Par

For a start arrangement and a target arrangement, the fewest moves are the rotations
each piece needs, `(target - start) mod 4` summed over pieces, plus the swaps the
slot permutation needs, `7 - cycles`. Rotations and swaps commute because a facing
travels with its piece, so the sum is exact for that target. Par is the minimum over
every open arrangement, which the solver enumerates by assigning piece ids to the
unique route's legs. Every stored par is labeled EXACT.

### 10.4 Uniqueness claim (item 10)

Exactly one route opens the lock, where a route is its sequence of cells. Several
arrangements draw that route, because equal length pieces can trade places and
pieces within one leg can reorder, and every one of them opens the lock. The claim
is about routes, which is what the player sees, and is proved by both searches.

### 10.5 Fairness claim (item 11)

Declared model: perfect information. The route for the current arrangement is always
drawn, the rules are the six trace rules and nothing else, and the unique route is
reachable from the marks, the lengths and the board edge. ROTATE LOCK does **not**
claim that Sunday is solvable by pure deduction without hypothesis: an unmarked turn
may have to be supposed and then checked. That check costs moves, and the move count
is the scoring, so a guess is a price and never a trap.

---

## 11. Decomposition (item 12)

The constraint graph of a route is a chain, so it never splits into independent
components in the section 12.1 sense. The decomposition risk here is the other one:
that the seven piece problem collapses into independent one piece problems.

The checker rejects a candidate when either holds:

1. **One piece per leg.** Pieces equal legs, so each leg's length names its piece
   and the ordering is a lookup.
2. **No shared partition.** No leg length can be made from two different sub
   multisets of the seven lengths, so each leg's pieces are forced independently of
   every other leg.

Result: over the 120,000 attempt study S2 rejected 466 of the 3,466 routes that
reached it, 13 percent, and every pass has at least one leg with two ways to fill
it. The verifier reruns the checker on every committed day.

---

## 12. Symmetry (item 13)

Transformations considered, section 12.2:

1. **Equivalent piece permutations.** Equal length pieces are interchangeable and a
   leg's pieces reorder freely. Handled by stating uniqueness over routes and taking
   par over every open arrangement, section 10.3.
2. **Reversal.** The route has a start and a lock, so reversing it is a different
   puzzle. Not a symmetry.
3. **Board rotations and reflections.** The eight dihedral maps of the square. A
   layout fixed by a non identity map, with start, lock and the mark set each mapped
   to themselves, could admit a mirrored route. Start and lock are distinct cells, so
   only a map fixing both qualifies. The checker rejects such a layout outright,
   before uniqueness, so the uniqueness search never has to reason about it.

Result: the screen rejected no candidate in the study and one in 60,000 attempts in
the prototype. It is kept because the cost is eight map lookups and the uniqueness
search would otherwise carry the claim alone; section 10.2 says a screen that
rejects almost nothing is not evidence on its own, and this one is not offered as
any. The verifier reruns it on every committed day.

---

## 13. Presentation

### 13.1 Layout at 360 pixels

Top to bottom inside the 344 pixel content width: a route status line, the board of
six 54 pixel cells with 4 pixel gaps, the move counter, the tray of two
rows of 80 by 56 pixel pieces, and the Rotate button at 44 pixels tall. No hover
state carries meaning, and `touch-action: manipulation` prevents double tap zoom.

### 13.2 What a cell shows

Text first, so nothing rests on color:

| Cell | Glyph |
|---|---|
| start | `S` |
| lock | `L`, and `O` once open |
| marked turn, not yet taken | `+` |
| marked turn, taken | `+` in the route color with a heavy border |
| a route cell | `^`, `>`, `v` or `<`, the direction the route entered it |
| the cell where the trace failed | `x` |
| empty | nothing |

### 13.3 Route status sentences

One line, announced through the live region whenever it changes:

| Trace | Sentence |
|---|---|
| open | "The lock is open." |
| `off-board` | "Piece N runs off the board." |
| `crossing` | "Piece N crosses the route." |
| `through-mark` | "Piece N goes straight through a marked turn." |
| `early-lock` | "Piece N reaches the lock too early." |
| `short-of-lock` | "The route ends away from the lock." |
| `missed-marks` | "The route ends at the lock but misses K marked turns." |

A piece's label is "Piece N, length L, pointing up", with "selected" appended when
selected. Each move announces what moved, then the route sentence.

---

## 14. Difficulty (item 14)

**Dead turns**: the number of distinct partial routes the solver reaches that have
just turned and cannot be completed, each identified by its turn cells and the
lengths still unplaced. One integer, emergent, measured by the same solver that
proves uniqueness.

It is the section 27 checkpoint decision depth made countable. Every dead turn is a
corner a player could plausibly take, marked or not, that later runs out of pieces,
board or marks. Hidden turns multiply them, because an unmarked corner can be tried
at any cell, and ambiguous partitions multiply them again.

`difficulty(puzzle)` recomputes it from the puzzle and never reads the manifest.

---

## 15. Seven band calibration (item 15)

`BAND_EDGES` are the septiles of dead turns over screened candidates drawn across
all three hidden turn values, measured by `tools/rotate-lock-calibrate.ts` and
committed in `data/rotate-lock/study.json`. The weekday map is VECTOR's,
`[0, 1, 2, 3, 5, 6, 4]` from Monday: gentle Monday, hard Saturday, Sunday between
Thursday and Friday.

The prototype measured an earlier form of the count, keyed on corners without the
new leg; the committed measure keys on the full partial route and the lengths left,
and its edges are in section 20.

---

## 16. Monday against Sunday (item 16)

**Monday.** Almost always every corner is marked: 384 of the 448 band 0 boards in
the study hide none, 63 hide one and 1 hides two. The route is visible before any
piece moves: connect start, marks and lock in the only order the board edge
allows, count each leg, and split the lengths. A player who counts first opens it
at or near par in well under two minutes.

**Saturday and Sunday.** Band 6 hides a corner on 58 percent of boards (188 hide
none, 194 hide one, 60 hide two), and band 4, Sunday, on 49 percent. Where the
marks are all there, the count of plausible corners the pieces allow is what makes
it hard. Where one or two corners are unmarked, some legs can be filled more than
one way. The marks no longer spell the route, so the player has to find the corner
the pieces demand, and the obvious first leg is often wrong. The route drawing tells
them so, one move at a time, and the tier tells them what the guessing cost.

---

## 17. Social telemetry (items 19 to 25)

### 17.1 Patterns (item 19)

Three, declared in `shareCapabilities`:

1. `micro-replay-path`: the rows are the player's moves in order.
2. `comparative-friction`: each move is marked by whether it returned to an
   arrangement this run had already been in.
3. `emergent-fingerprint`: section 17.6.

Grammar `B`, sequence ladder. `maxRows` 7.

### 17.2 Run log record (item 20)

```text
RunLog { v: 1, entries: RotateLockRunEntry[] }

RotateLockRunEntry {
    index:   integer, zero based move number
    kind:    "swap" | "rotate"
    revisit: boolean, true when the arrangement after the move was already seen
                      earlier in this run, the start arrangement included
    opened:  boolean, true only on the move that opened the lock
}
```

No piece id, slot, facing or cell. The log is the player's own actions, held on the
device, and never sent anywhere.

### 17.3 Mapping function (item 21)

Pure, over the run log alone:

1. Token per move: `barFull` when `revisit` is false, `barEmpty` when it is true.
2. Tokens chunk into rows of eight in move order.
3. If there is more than one row, the last is padded with `unused` to eight.
4. The title is `ROTATE LOCK #<n> <tier name>, <m> moves`, or
   `ROTATE LOCK #<n> Rough, jammed`, followed by `, streak <k>` when the streak is at
   least 2.

A run of eight moves or fewer is one row as wide as the move count. The jam at 56
moves is exactly seven full rows, so the grammar's height cap is never reached.

### 17.4 Clipboard artifact (item 22)

Opened in 9 at par 9, no revisits, streak 3:

```text
ROTATE LOCK #12 Excellent, 9 moves, streak 3
🟦🟦🟦🟦🟦🟦🟦🟦
🟦⬛⬛⬛⬛⬛⬛⬛
dailykit.providentia.games
```

Opened in 17 with par 11, three moves back into earlier arrangements:

```text
ROTATE LOCK #12 Good, 17 moves
🟦🟦🟦🟦⬜🟦🟦🟦
🟦⬜🟦🟦🟦🟦⬜🟦
🟦⬛⬛⬛⬛⬛⬛⬛
dailykit.providentia.games
```

Opened in 6 at par 6:

```text
ROTATE LOCK #40 Excellent, 6 moves
🟦🟦🟦🟦🟦🟦
dailykit.providentia.games
```

Jammed: seven rows of eight, title `ROTATE LOCK #12 Rough, jammed`, nine lines.

### 17.5 Graphic card (item 23)

1200 by 900, from the same `ArtifactModel` and no other input:

1. Title band, 120 pixels: game name and puzzle number, left; tier name and move
   count, right.
2. Fingerprint field, 1100 by 560: two horizontal lanes, swaps above and rotations
   below. One mark per move at `x = index`, spaced evenly across the field. A new
   arrangement is a filled square, a revisit a hollow ring, and the opening move a
   filled star. Shape carries the meaning, so grayscale and high contrast lose
   nothing.
3. Footer, 120 pixels: the suite URL.

The card renderer is suite work and not built by any game yet; this is the
specification ROTATE LOCK hands it.

### 17.6 Fingerprint (item 25)

One point per move: `x` the move index, `y` 0 for a swap and 1 for a rotation,
`shape` `correction` for a revisit and `accepted` otherwise. Two players who open the
lock in the same number of moves differ whenever they swapped and rotated in a
different rhythm or backtracked at different times.

### 17.7 Leak test result (item 24)

Four probes in `telemetry.ts`, each with a positive control test that feeds it a
deliberately leaking artifact and requires it to fire.

| Question | Probe | Why ROTATE LOCK passes |
|---|---|---|
| Position | every token is `barFull`, `barEmpty` or trailing `unused` | no token can name a piece, slot, facing or cell |
| Answer property | the rows equal the rows rebuilt from the run's revisit flags alone | nothing about the puzzle enters the rows |
| Ordering | `unused` appears only after the last move token of the last row | the order is move chronology |
| Shape | every row but a lone first row is eight wide, and rows never exceed seven | the silhouette is move count only |

Title: carries the tier and the move count. It contains no cell, length or direction.

**Accepted residue.** A player who opens the lock at par publishes par as their row
length, and tier plus move count bound par for everyone. Par measures the distance
from the scramble to the answer, not the answer: knowing that today is nine moves
says nothing about which pieces go where. POKER GRID's tier against a stored optimum
carries the same kind of residue and it was accepted there.

Result: pass, for the generated matrix of good, average, bad and jammed runs in the
telemetry tests.

---

## 18. Browser fallback budget (item 26)

Past the horizon the module generates the day in the browser with the band screen
removed, so any unique route with a scramble in range is accepted. The study
accepts 2.6 percent of attempts at about 3 milliseconds per accepted puzzle, so the
fallback is expected well under a tenth of a second.
The ceiling is `FALLBACK_ATTEMPTS`, and a day that exhausts it reports a puzzle
failure rather than looping. The measured time is in section 20. The day is
unrated: no band, and the tier is still real because par is exact.

---

## 19. The contract (item 27)

`GameModuleV3<RotateLockState, RotateLockAction, RotateLockPuzzle>`.

| Member | ROTATE LOCK |
|---|---|
| identity | section 1 |
| input | `custom`, tap, the keys of section 5 |
| manifest | `/data/rotate-lock/manifest.index.json`, lookahead 7 |
| archiveEnabled | true |
| hasWinLoss | true: opened or jammed |
| stateVersion | 1 |
| distribution | the five labels of section 6.5, distinguished 0 |
| shareCapabilities | grammar B, the three patterns of 17.1, maxRows 7 |
| parsePuzzle | decodes the obfuscated layout and refuses anything section 10.2 step 1 would |
| generatePuzzle | the fallback of section 18 |
| firstSessionPuzzle | a fixed board: every corner marked, four legs, par 3, band 0 |
| initialState | the puzzle's order and facings, no moves |
| serialize | `{ v: 1, data: { m: "<move codes>" } }`, two characters per move |
| deserialize | replays the moves through the rules and refuses any that a real game could not make |
| migrateState | refuses every older version, there is none |
| apply | section 6.3 |
| inspect | section 6.4 and 6.5 |
| difficulty | dead turns, section 14 |
| telemetry | section 17.2, derived from the move log |
| shareArtifact | section 17.3 |
| mount | section 13 |
| help | the headline rule, four steps, and a worked example of a three piece route in text |

The ten contract pieces of the original Section 5 map onto these: identity, puzzle
production (`parsePuzzle`, `generatePuzzle`), state (`initialState`, `serialize`,
`deserialize`), rules (`apply`), terminal conditions (`inspect`), share rendering
(`shareArtifact`), stats shape (`distribution`), rendering (`mount`), input
(`input`) and help (`help`).

**Serialized move codes.** A swap of pieces `a` and `b` is `a` then `b` as digits, a
rotation of `p` is `r` then the digit. At most 56 moves, 112 characters.

---

## 20. Measured values

Reproduced by `npm run rotate-lock:calibrate`, `npm run rotate-lock:generate` and
`npm run rotate-lock:verify`, 2026-09-17.

**Calibration study**, `data/rotate-lock/study.json`: 400 seeds of 300 attempts,
120,000 attempts, 3,109 screened puzzles, 2.59 percent. Rejections: 89,132 dead end
routes, 24,764 splits that were not seven pieces, 794 with fewer than two marks,
466 decomposition, 0 symmetry, 1,735 uniqueness, 0 scramble.

**Difficulty.** 871 distinct dead turn values in the prototype's pooled sample of
1,557; in the study, `BAND_EDGES` are `168, 263, 365, 495, 691, 1013`, which put
448, 445, 442, 443, 444, 445 and 442 screened puzzles in bands 0 to 6. The yearly
need is 52 or 53 per band, so each band has more than eight times its supply.

**Par.** Floor 8, ceiling 14. Of the study's screened puzzles 1,186 are par 8, 813
par 9, 552 par 10, 301 par 11, 155 par 12, 68 par 13 and 34 par 14. No candidate
failed the scramble screen in 40 tries.

**Horizon.** 365 days from 97,269 attempts in about 8 seconds, 0.38 percent
acceptance with the band screen, 2,194 band rejections. Days per weekday band 53,
52, 52, 52, 52, 52, 52. The manifest chunk is 48,130 bytes.

**Verification.** 365 days, one route each, EXACT, par recomputed independently,
band, decomposition, symmetry and no repeated layout, in about 53 seconds.

**Browser.** The fallback past the horizon is held under 1.5 seconds in the
generator test for days 366, 400 and 1000 under Node; the renderer's page is 28.3 KB
gzipped against the 150 KB budget; the engine chunk is unchanged at 30,262 bytes.

---

## 21. Risks (item 28)

1. **Visual density.** Seven pieces and 36 cells on one portrait screen is the
   section 46 stress test. Mitigated by glyph route cells and a two row tray; not
   proven until the manual mobile check runs on real devices.
2. **Clockwise only rotation is tedious.** A piece that needs a counterclockwise turn
   costs three moves. Par counts it the same way, so the tier is fair, but it may feel
   like busywork. A second rotation verb would lower par everywhere and is a rule
   change, so it waits for the manual check to say it matters.
3. **Sunday may feel like trial.** The fairness claim is perfect information, not
   pure deduction. If Sunday reads as guessing, the lever is `hidden-2` weight, not
   the rule.
4. **Par leaks as row length at par.** Accepted in section 17.7.
5. **The `unused` padding glyph is unaudited** on dark chat backgrounds, the BACKLOG
   item. ROTATE LOCK is the first game to put it inside a normal result.
6. **Same family as TURN TABLE.** Conceded at lineup level; section 2 records why the
   two do not play the same way.
7. **The manual mobile check cannot be run by an agent.** The gate refuses a new game
   without it and no exemption covers one, so ROTATE LOCK cannot go live until the
   owner runs MANUAL-CHECKS.md for it on devices.
