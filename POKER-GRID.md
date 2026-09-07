# POKER GRID DESIGN DOCUMENT

File path: `POKER-GRID.md` (repo root, beside `ARCHITECTURE.md`)

---

## 1. Rules text

This text is the source for both the about page and `help()`. It is one screen.

**Headline.** Clear the board by selecting five connected cards that make a poker hand.

**Steps.**
1. Drag across five cards that touch edge to edge. Diagonals do not count.
2. The five must make a pair or better. High card is not a hand.
3. Cleared cards vanish, the columns fall, and no new cards arrive.
4. Play until no five connected cards make a hand. There is no losing.

**Worked micro example.** Caption: a plus shape is a legal path. Lines rendered by the help panel's `draw` hook as a small 3 by 3 board with the centre column and middle row filled, showing five cards of which two share a rank, captioned "two nines and three others, a pair, legal".

**Selection detail shown in the panel only on the second line of step 1.** Tap a card to add it. Tap a card already in your path to take back that card and everything after it.

---

## 2. Board, coordinates, and cards

| Property | Value |
|---|---|
| Columns | 5 |
| Rows | 7 |
| Cells | 35, index `row * 5 + col`, row 0 at the top |
| Gravity | toward row 6 |
| Card encoding | integer 0 to 51, `rankIndex * 4 + suit`, rank 2 at index 0 through ace at index 12, suits ordered clubs, diamonds, hearts, spades |
| Empty cell | `null` in state, `.` in the serialized grid string |

Rank value for hand evaluation is 2 through 14 with ace high, and ace additionally counts as 1 for the wheel straight A2345 only.

Because a board holds 35 distinct cards from one deck, every five card selection contains five distinct cards. The evaluator therefore never handles duplicate cards, which removes an entire class of case from it.

---

## 3. Selection rules

A selection is an ordered list of cell indices, built one cell at a time.

1. The first cell may be any occupied cell.
2. A later cell may be added only if it is occupied, not already selected, and orthogonally adjacent to at least one already selected cell. Branching from any selected cell is legal, so plus, T, L, S, and block shapes are all reachable.
3. Maximum selection length is five. A sixth cell is refused rather than replacing anything.
4. Taking back: tapping or dragging back over a selected cell at position `i` removes cells `i` through the end. Dragging back over the immediately previous cell is the case `i = length - 1`.
5. A selection is committed when it has exactly five cells and evaluates to a pair or better. Commit clears those cells, settles the board, and appends the hand to the played list.

Rule 4 is the resolution of an interaction, recorded in Section 14.2. Truncation is chosen over free removal because it keeps the connectivity invariant true by construction, with no articulation point test in the rules layer and no way for the player to reach a disconnected selection.

The renderer decides *when* to emit a commit. Drag input emits it on pointer release with five cells held. Tap input emits it on the tap that adds the fifth cell. Keyboard emits it on Enter. The rules layer knows nothing about gestures.

---

## 4. Action set and rejection table

```
type Action =
  | { kind: "add"; cell: number }
  | { kind: "truncate"; index: number }   // index 0 clears the selection
  | { kind: "commit" }
```

Every rejection below needs a test, per Section 10.1.

| Action | Code | Condition | Announce |
|---|---|---|---|
| any | `finished` | board is terminal | Board finished. |
| add | `out-of-range` | cell outside 0 to 34 | (developer error, never announced) |
| add | `empty-cell` | cell holds no card | That space is empty. |
| add | `already-selected` | cell already in the selection | That card is already chosen. |
| add | `not-adjacent` | selection non empty and cell touches no selected cell | Cards must touch edge to edge. |
| add | `selection-full` | selection already holds five | Five cards chosen already. Take one back to change your path. |
| truncate | `bad-index` | index below 0 or at or above selection length | (developer error, never announced) |
| commit | `incomplete` | selection length is not five | Choose five cards. |
| commit | `no-hand` | five cards evaluate to high card | Those five do not make a pair or better. |

`add` and `truncate` are pure state edits. `commit` is the only action that mutates the grid.

---

## 5. Hand definitions

This table is the content of `src/shared/poker-hands.ts`, the source of truth shared with PokerFall by copy, per requirement 6.6. It is authored in Phase 5.

| Ordinal | Category id | Shape given five distinct cards |
|---|---|---|
| 8 | `straight-flush` | five consecutive ranks, all one suit |
| 7 | `four-of-a-kind` | four ranks equal, one other |
| 6 | `full-house` | three equal plus two equal |
| 5 | `flush` | all one suit, ranks not consecutive |
| 4 | `straight` | five consecutive ranks, mixed suits |
| 3 | `three-of-a-kind` | three equal, two singletons |
| 2 | `two-pair` | two pairs plus a singleton |
| 1 | `one-pair` | one pair plus three singletons |
| 0 | `high-card` | none of the above, illegal in POKER GRID |

Notes that belong in the shared file as comments:

1. A royal flush is not a separate category. It is the top straight flush and scores as one.
2. The wheel A2345 is a straight and is the lowest one. AKQJT is the highest. QKA23 is not a straight.
3. The shared file exports category detection and the ordinal only. It exports **no kicker comparison**, because POKER GRID never compares two hands against each other, only classifies one. If PokerFall needs a comparator it owns it.
4. The shared file also exports `HAND_SHARE_TIER` from Section 6, so the two projects cannot disagree about what counts as a premium hand.
5. Point values are **not** in this file, per requirement 6.6.

---

## 6. Hand quality tiers and share tokens

`HAND_SHARE_TIER` maps each legal category to one token from `shared/share-vocabulary.ts`.

| Token | Glyph | Categories |
|---|---|---|
| `best` | star | straight flush, four of a kind |
| `strong` | diamond | full house, flush |
| `partial` | green square | straight, three of a kind |
| `weak` | orange circle | two pair, one pair |
| `miss` | triangle | unused by POKER GRID |

`miss` is deliberately unused. Every row in a POKER GRID block is a hand the player actually completed, so nothing in this game is a miss, and requirement 7.3.6 wants a glyph to mean roughly the same thing across the suite. Reserving the triangle for genuine failure in the pass or fail games of the slate keeps that meaning intact.

Invariant asserted by test: `HAND_SHARE_TIER` is monotone with respect to `HAND_POINTS`. If Phase 7 measurement reorders the point values, the mapping is reordered with them in the same commit and the test catches any drift.

---

## 7. Scoring model

Score is a pure function of the played hand list.

```
score = sum over played hands of HAND_POINTS[category]
      + CARD_CLEAR_POINTS * cardsCleared
```

`cardsCleared` is always `5 * handsPlayed`, a consequence of locked decision 3.

**Named constants, values calibrated in Phase 7.**

| Constant | Meaning |
|---|---|
| `HAND_POINTS.onePair` through `HAND_POINTS.straightFlush` | eight values, set inversely proportional to measured availability under adjacency, then hand tuned |
| `CARD_CLEAR_POINTS` | points per card removed from the board |

There is no perfect clear bonus. A perfect clear already earns the maximum hand count, which under the constraints below is the dominant term, and it already has its own distinguished histogram bucket. A bonus would add a constant to both the player score and the stored optimum and change nothing except the arithmetic.

**Calibration constraints, asserted by test once Phase 7 sets the numbers.**

- **C1, monotone tokens.** As Section 6.
- **C2, hand count dominance.** For every pair of hand counts `0 <= b < a <= 7`:
  `a * HAND_POINTS.onePair + 5a * CARD_CLEAR_POINTS > b * HAND_POINTS.straightFlush + 5b * CARD_CLEAR_POINTS`.
  The test enumerates all 28 pairs rather than reasoning about the tightest one. This is the machine readable form of the second sub rule of locked decision 5.
- **C3, quality floor.** `HAND_POINTS.onePair + 5 * CARD_CLEAR_POINTS >= TIER_QUALITY_THRESHOLD * (HAND_POINTS.straightFlush + 5 * CARD_CLEAR_POINTS)`.
  The `h` terms cancel, so this holds for every hand count at once. It is what guarantees that matching the optimum's hand count with weak hands never drops below the second tier.

A satisfying assignment exists, which is worth recording so Phase 7 does not chase an infeasible target. With `CARD_CLEAR_POINTS = 160`, `onePair = 10`, `straightFlush = 100`, and the six other categories between them, C2 and C3 both hold at `TIER_QUALITY_THRESHOLD = 0.85`. These are not proposed values, only a feasibility witness.

**Consequence, stated plainly because it shapes the whole game.** C2 makes the score lexicographic: hands played first, hand quality as tiebreak. Playing one more pair always beats upgrading any single hand to a straight flush. That is exactly what locked decision 5 asks for, and it means the honest description of the game is "empty as much of the board as you can, and prefer better hands when you have a free choice". The end screen and the help text should say that rather than implying quality competes with coverage.

---

## 8. Result tiers against the stored optimum

Locked decision 6 requires five named tiers against the stored optimum, with the exact percentage on tap.

**Tier assignment is by hand deficit, not by raw score ratio.**

```
d = best.hands - playedHands            // clamped at 0
q = playerHandPoints / bestHandPoints   // clamped at 1, only consulted when d = 0

tier 0   d = 0 and q >= TIER_QUALITY_THRESHOLD
tier 1   d = 0
tier 2   d = 1
tier 3   d = 2
tier 4   d >= 3
```

`playerHandPoints` is `score - CARD_CLEAR_POINTS * cardsCleared`. `bestHandPoints` is `best.score - CARD_CLEAR_POINTS * 5 * best.hands`, so the manifest must store `best.hands` alongside `best.score`.

Deficit is chosen over a score ratio with fixed boundaries because C2 forces the ratio to cluster at multiples of `1 / best.hands`, and a fixed boundary set placed between clusters for a seven hand optimum lands in the wrong place for a five hand optimum. Deficit is the same quantity without the aliasing.

The percentage revealed on tap is the plain score ratio `playerScore / best.score`, rendered to a whole percent.

**Beam search overrun.** If the solver used beam search, a player can exceed the stored best. Then `d` is negative and clamps to 0, `q` clamps to 1, the tier is 0, and the percentage displays as 100. The event is written to the state as `exceededStoredBest: true` so a future verification pass can find boards whose stored value is too low.

**Unrated boards.** Past the manifest horizon `best` is null. No tier is computed, the end screen shows the score with the word unrated, and the share title carries `unrated` in place of a tier name.

### 8.1 Tier names, approved

Charter decision 8 required suite wide, plain spoken names that do not collide
with the token names `best`, `strong`, `partial`, `weak`, `miss`. Three sets were
proposed in Phase 2 and the grades set was approved in Phase 3, with tier 0
named Excellent rather than Perfect.

| | Tier 0 | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|---|
| **Approved** | Excellent | Great | Good | Fair | Rough |
| Set B, craft | Flawless | Sharp | Steady | Loose | Messy |
| Set C, distance | Matched | Close | Halfway | Short | Far |

The approved set has the shortest words and the lowest idiom load, which matters
for the string extraction of Section 11.7, and it reads correctly in a game with
no failure state, where Set B's Messy reads as a scolding. Set C describes the
measurement most honestly but presumes every suite game scores against a known
optimum, which the deduction and categorization games on the Phase 9 slate will
not.

Naming tier 0 Excellent rather than Perfect leaves the word Perfect free, so the
zero cards remaining histogram bucket keeps the label **Perfect Clear** in the
stats panel, the end screen, and the code. The two ideas describe different
things, a grade against the stored optimum and a board emptied completely, and
they now have different words without either losing its natural one.

The names live in `engine/tiers.ts` as a suite constant. POKER GRID reads them
and never declares its own.

---

## 9. Settling algorithm

Pure, in place on a copy, deterministic, no randomness.

```
settle(grid):
  for col in 0..4:
    write = 6                                  # bottom row
    for row from 6 down to 0:
      c = grid[row * 5 + col]
      if c is not null:
        grid[write * 5 + col] = c
        if write != row: grid[row * 5 + col] = null
        write = write - 1
    for row from write down to 0:
      grid[row * 5 + col] = null
```

Cost is 35 reads and at most 35 writes. Relative order within a column is preserved, which is what makes the board reproducible from the puzzle plus the hand list even though the state is stored as a snapshot.

Asserted after every settle, invariant 6.2.1.5: for every column, no occupied cell has an empty cell below it.

---

## 10. Terminal detection

Terminal means no connected five cell set of occupied cells evaluates to a pair or better. It is checked after every settle and its answer is cached in the state.

The move generator enumerates every connected five cell subset of occupied cells exactly once, using canonical rooting:

```
for root in occupied cells, ascending index:
    grow({root}, frontier = neighbours(root) with index > root, forbidden = {})

grow(sub, frontier, forbidden):
    if |sub| == 5: emit sub; return
    if |sub| + |frontier| < 5: return                 # prune
    for i, c in enumerate(frontier):
        nextForbidden = forbidden + frontier[0..i]
        nextFrontier  = frontier[i+1..]
                      + neighbours(c) occupied, index > root,
                        not in sub, frontier, or nextForbidden
        grow(sub + c, nextFrontier, nextForbidden)
```

Each set is emitted once because the root is fixed as the minimum index in the set, and the `forbidden` accumulation makes each extension order canonical. This is the same generator the solver uses in Phase 5, so it is written once and tested once.

Worst case is the full 35 card board. The exact count of connected five cell subsets of a full 5 by 7 grid is on the order of 10<sup>3</sup>. Phase 5 asserts the exact number as a regression bound rather than trusting an estimate. Terminal detection early exits on the first legal hand, so on a live board it typically stops after a few dozen candidates. Even the worst case, a few thousand evaluator calls on five distinct cards, is well inside a frame on a mid tier phone, so no incremental or cached move list is needed. That is a deliberate refusal of an optimization.

Invariant 6.2.1.6 is this definition, so the test is that the flag and a brute force recomputation always agree.

---

## 11. Distribution buckets

Locked decision 4: buckets are cards remaining in steps of five, zero distinguished.

```
labels: ["Perfect Clear", "5 left", "10 left", "15 left", "20 left",
         "25 left", "30 left", "35 left"]
distinguishedIndex: 0
bucketOf: cardsRemaining / 5
```

Eight buckets. Remaining is always a multiple of five, a consequence of locked decisions 1 and 3. The 35 bucket is unreachable on any manifest board because requirement 6.3.5 rejects boards with too few opening moves, but it stays in the list because a runtime generated board past the horizon has no such guarantee.

`hasWinLoss` is false, so the win rate row is suppressed, per recorded conflict resolution 1.

---

## 12. Share block

### 12.1 Layout

```
line 1        title
lines 2..n    one row per hand played, in play order, one glyph each, at most 7
last line     dailykit.providentia.games
```

Maximum nine lines. Minimum three lines, a board where the player played one hand.

**Title format.** `POKER GRID #<number> <tier name>` plus ` streak <n>` when the current streak is at least two. Streak rides on the title line, per charter decision 1. Unrated boards use the word `unrated` where the tier name goes and never show a streak, because a past horizon board is played in archive view.

There is **no summary bar row**. Section 14.1 records why.

Because every row is one glyph wide, the engine's per block padding of contract decision 4 has nothing to do here, and `barFull` and `barEmpty` never appear in a POKER GRID block. Requirement 3.5.4 holds trivially.

Rows are spoiler free by construction: a row names a quality tier and nothing else. No rank name, no suit, no position, no board shape, and no count of cards leaves the block except through the number of rows, which is the player's own coverage and not part of the solution.

### 12.2 Worked examples

**Perfect clear.** Seven hands: four of a kind, flush, straight, three of a kind, two pair, one pair, full house. Tier 0.

```
POKER GRID #250 Excellent streak 12
⭐
🔷
🟩
🟩
🟠
🟠
🔷
dailykit.providentia.games
```

**Strong result.** Six hands against a seven hand optimum, so `d = 1`, tier 2. Five cards stranded.

```
POKER GRID #251 Good streak 13
🔷
🟩
🟠
🟩
🟠
🟠
dailykit.providentia.games
```

**Poor result.** Three hands against a seven hand optimum, `d = 4`, tier 4. Twenty cards stranded, no streak.

```
POKER GRID #252 Rough
🟠
🟠
🟩
dailykit.providentia.games
```

**Unrated, past the manifest horizon.**

```
POKER GRID #1120 unrated
🟠
🔷
🟩
🟩
dailykit.providentia.games
```

Snapshot tests in Phase 5 cover: zero hands, one hand, seven hands, every tier name, unrated, streak absent, streak present, and a block in which all seven rows carry the same glyph.

### 12.3 Contribution to the daily card

Forward input to Phase 10, recorded here so it is not redesigned later. POKER GRID's one row on the suite daily card is the single token for its **result tier**, using the same five token vocabulary, tier 0 to `best` through tier 4 to `miss`. This is the one place POKER GRID emits `miss`, and there it does mean the worst band, consistently with the other games.

---

## 13. State and puzzle shapes

```
TPuzzle = {
  number: PuzzleNumber
  cells: readonly number[]        // 35 card codes, index 0 is top left
  best: { score: number; hands: number; method: "exact" | "beam" } | null
  levers: readonly string[]       // audit trail, requirement 6.3.6
}

TState = {
  grid: readonly (number | null)[]   // 35
  selection: readonly number[]       // 0..5 cell indices, ordered
  hands: readonly { category: HandCategory; points: number }[]
  score: number
  terminal: boolean
  exceededStoredBest: boolean
}
```

`hands` stores the category and its points, not the cells. Cells are not stored because nothing reads them: the share block needs only the category, the grid is a snapshot, and replay is out of scope by contract decision 9. Not storing them also means a saved game leaks less to a player poking at `localStorage`.

**Serialization, `stateVersion` 1.**

```
{ v: 1, data: { g: string, s: number[], h: [number, number][], x: boolean } }
```

`g` is 35 characters, one per cell, from a fixed 52 character alphabet plus `.` for empty. `s` is the selection. `h` is the played hand list as category ordinal and points pairs. `x` is `exceededStoredBest`. Score and terminal are recomputed on deserialize rather than stored, so a stored save can never disagree with the rules about its own score. `deserialize` fails with `puzzle-mismatch` when `g` contains a card the puzzle does not, or when the multiset of remaining cards plus five times the hand count does not equal 35.

**Levers vocabulary**, fixed now so Phase 7 fills values rather than inventing names: `suit-bias`, `rank-clump`, `guaranteed-straight-flush`, `sparse-pairs`, `corner-isolate`, `none`.

**Module flags.** `archiveEnabled: true`, `hasWinLoss: false`, `stateVersion: 1`, input descriptor `{ kind: "grid", cols: 5, rows: 7, pointer: "drag" }`.

---

## 14. Locked decision interactions, resolved

### 14.1 Section 6.5 does not fit inside itself

6.5.1 allows seven hand rows, 6.5.3 requires a final summary bar row, 6.5.4 requires a title and a URL line, and 6.5.5 caps the block at nine lines. Seven plus one plus two is ten. The requirement is internally unsatisfiable in the perfect clear case, which is the case most worth sharing.

**Resolution: drop the summary bar row.** Under locked decisions 1 and 3 a hand always clears exactly five cards and nothing ever refills, so cards cleared is exactly five times the number of hand rows. The bar carries zero information the block does not already show, and the row count shows it more directly. Dropping it satisfies 6.5.5 exactly, keeps all seven hand rows in the best case, and removes a second problem: a one glyph hand row padded to a seven glyph bar width with `barEmpty` reads as an empty progress bar, which is precisely the wrong impression.

Charter decision 1 is amended accordingly in Section 15. The engine constant `SHARE_MAX_ROWS = 8` is unchanged, because it is a suite level ceiling and other games may want eight rows with no bar. POKER GRID asserts its own nine line cap in a module test.

The alternative, keeping the bar and allowing ten lines only when the player clears the whole board, is question 1 at the end.

### 14.2 Tap to remove versus the connectivity invariant

Locked decision 2 requires tap to remove. Charter decision 4 requires every selection to be a connected set. Removing an arbitrary cut cell from a connected set disconnects it. Resolved by Section 3 rule 4: tapping a selected cell truncates the path from that cell onward. Connectivity is preserved by construction because a prefix of a connected growth sequence is always connected, no articulation point test enters the rules layer, and the drag back behaviour of charter decision 4 is the special case `i = length - 1` rather than a second rule.

### 14.3 No failure state versus the engine lifecycle

Requirement 3.2 names both `WON` and `LOST`. Locked decision 4 removes the loss
state. Resolved in Phase 3: neither state exists. The lifecycle's terminal state
is `COMPLETE`, carrying the outcome whose `won` field POKER GRID sets to null
because `hasWinLoss` is false. No chrome anywhere renders the word won for this
module, and no unreachable state is left in the machine for the author of a
later suite game to wonder about. See ARCHITECTURE.md resolution 11.

### 14.4 Cards cleared dominance flattens the tier ladder

Constraint C2, which the second sub rule of locked decision 5 requires, makes hand quality a tiebreak rather than a competing axis. The consequence is that tiers 2, 3, and 4 are decided entirely by how many hands the player got, and quality only separates tier 0 from tier 1. This is not a defect, it is what the locked decision asks for, but it means the end screen must not present quality and coverage as a trade off, and the Phase 7 calibration study should measure the *distribution of hand counts* achieved by the greedy player, not just the score gap, because that is what the tier ladder actually reads.

### 14.5 Perfect Clear versus the top tier name

With tier 0 named Excellent, the word Perfect is free and the zero remaining
bucket keeps the label Perfect Clear. The two never collide on screen.

The underlying property still holds and is still asserted. A perfect clear uses
seven hands, the maximum, so its deficit is always zero, and C3 guarantees its
quality ratio never drops it below tier 1. A player who sweeps the board
therefore always sees Excellent or Great and never sees Fair or Rough after
emptying the grid. No special case is needed in code; this falls out of C3 and
is a property test in Phase 5.

### 14.6 No duplicates constrains what the generator can promise

Locked decision 7 with 35 of 52 cards means a board holds an average of 8.75 cards per suit and four of a kind requires all four suits of one rank to be present *and* mutually reachable in a connected five set. The generator lever `guaranteed-straight-flush` is therefore a placement constraint and not only a selection constraint, and the availability measurement of Phase 7 must count adjacency reachable occurrences rather than presence in the deal. Recorded here so Phase 7 does not measure the wrong thing.

### 14.7 Stored optimum versus anti spoiler

The stored `best.score` and `best.hands` for **today's** board are needed by the end screen and reveal no cards. For **future** boards in the same monthly chunk they are as sensitive as the boards themselves and are covered by the same light obfuscation as recorded conflict resolution 2. No separate handling.
