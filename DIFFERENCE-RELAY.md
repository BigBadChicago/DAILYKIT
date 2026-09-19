# DIFFERENCE RELAY

Design document for game five of the suite and the second game authored on the v3
contract, charter Phase 13. It answers every item of ARCHITECTURE2.md section 44
and is the authority for `src/games/difference-relay/`. Where it and the code
disagree the code is a defect, except where section 20 records a measurement that
replaced a provisional value here.

Written 2026-09-19. No committed `DIFFERENCE-RELAY.md` existed in the working tree
when this was authored, so it is written fresh from ARCHITECTURE2.md sections 27,
35 and 46, ROTATE-LOCK.md as the v3 precedent, and the registry row. Section 8 is
a prototype expectation and section 20 is the placeholder the generation
deliverable fills from `data/difference-relay/study.json` and the pipeline run.
Values marked provisional are estimates, not measurements, and are replaced, never
trusted, before the game goes live.

The section 4.1 open design decision of HANDOFF.md is settled here in section 10.5:
**imperfect information**. It is the only choice under which the section 46 stress
test, deduction fairness kept stricter than mere uniqueness, has any content, and
the only one consistent with the registry's `hasWinLoss: true` and the attempt
ladder share of section 46.

---

## 1. Identity and the rule

| Field | Value |
|---|---|
| id | `difference-relay` |
| Display name | DIFFERENCE RELAY |
| Path | `/difference-relay/` |
| Epoch | 2026-01-05, the first Monday of the epoch year |
| Accent hue | 68 |
| Board font | `ui-monospace, monospace` |
| hasWinLoss | true, unchanged from the registry |
| Buckets | 7, corrected from the registry's provisional 4 |
| stateVersion | 1 |

**One sentence rule** (item 1), the hub listing:

> Order the numbers so every neighbouring pair differs by the amount marked between
> them, and read the hidden gaps from how far the relay runs.

**Rules text**, the whole of what a player is told:

1. Six numbered tokens sit in a row of six stations. Between each pair of
   neighbouring stations is a gap.
2. A gap is either marked with a number, the difference the two neighbours must
   have, or shown as a question mark, a hidden difference you cannot read.
3. Swap any two tokens to reorder them. Reordering is free.
4. Run the relay to test the current order. The baton leaves the first station and
   crosses each gap in turn, stopping at the first gap whose two neighbours do not
   differ by that gap's amount. It tells you which station it reached.
5. A run that crosses every gap opens the line and wins. You have six runs. Reading
   where the baton stops is how you learn the hidden gaps.
6. Solve it in as few runs as you can.

---

## 2. Cognitive mode (item 2)

Deduction from feedback, over an ordering. The player fixes what the visible marks
allow, then submits orders whose only purpose is to learn the hidden gaps from the
station the baton reaches, and narrows the one order that crosses them all.

This is the same family as CIPHER, as ARCHITECTURE2.md section 27 concedes: both
break a hidden target from run feedback in a bounded number of attempts. The
distinction to defend, named in HANDOFF.md section 4.1, is the shape of the
feedback. CIPHER's feedback is a **count** over a code, two integers that say how
many symbols are right and how many are misplaced with no location. DIFFERENCE
RELAY's feedback is a **position**, the depth the relay reached, over an ordering.
A count is read all at once and located nowhere. A position is located exactly, at
one gap, and says nothing about the gaps beyond it. The two feedbacks reward
different reasoning: CIPHER is arithmetic over a whole guess, DIFFERENCE RELAY is a
prefix search that commits to a left to right structure and probes its frontier.

The suite still has no categorization or memory game after this, which composition
A accepted as a deviation in BACKLOG.md, and this document does not reopen it.

---

## 3. Substrate and its hardest gate (item 3)

Substrate: a permutation of six distinct integers over a line of six stations,
under five adjacency constraints on the absolute difference of neighbours, some
visible and some hidden. Only small integers and their differences, so licensing
exposure is zero, requirement 7.1.5.

Hardest substrate gate: **keeping the game deduction and not trial**, the section 35
ordering family risk of brute force feeling difficulty and the section 46 stress
test. Six runs over a 720 order space is enough attempts that a player could stumble
in by trying orders at random and reading the baton, which would make the ladder
measure luck rather than reasoning. Resolved by the fairness screen of section 10.5,
which ships only boards a declared no guess model solves inside the budget, and by
the difficulty measure of section 14, which bands boards by how much deduction the
forced line actually costs, so an easy board is easy because little is hidden and a
hard board is hard because the forced line is long, never because the space is big.

---

## 4. Session length (item 4)

One to three minutes. Monday is under a minute when the visible marks nearly pin the
order and one run confirms it. Sunday takes three, with two hidden gaps to read from
the baton and several orders alive after the first run. In the registry this sits
after ROTATE LOCK and before the two shortest ordering games, and the registry
comment about provisional order now has a stated session length to sort by.

---

## 5. Input model (item 5)

`custom`, pointer `tap`. The row of stations is the ORDER adapter of ARCHITECTURE2
section 21, `src/ui/listCursor.ts`, and the Run button is the one extra verb.

| Semantic action | Pointer | Keyboard |
|---|---|---|
| Focus a token | none, focus follows the tap | ArrowLeft, ArrowRight, Home, End move focus in station order |
| Select a token | tap it | Enter or Space on the focused token |
| Swap two tokens, `{ kind: "swap", a, b }` | with one selected, tap another | with one selected, Enter or Space on another |
| Clear the selection | tap the selected token again | Escape |
| Run the relay, `{ kind: "run" }` | the Run button | Enter on the Run button, or the `r` verb on any token |

Selection is renderer state and never an action, so it costs nothing and is never
saved. `swap` names tokens by their number identity, not by slot, so a replayed log
means the same thing whatever order the slots were in at the time, which is the
list cursor's identity rule. `run` names nothing; it submits the current order.

Orientation is `horizontal`, so the vertical arrows are left for the page and the
Run button is reached by Tab. Declared keys: `ArrowLeft`, `ArrowRight`, `Home`,
`End`, `Enter`, ` `, `Escape`, `r`, `R`.

---

## 6. Rules, precisely

### 6.1 Stations, gaps, and the puzzle

Stations are indexed 0 to 5, left to right. Gap `i` lies between station `i` and
station `i + 1`, for `i` in 0 to 4. A puzzle is `{ numbers, target, marks }`:

- `numbers`: six distinct integers, the tokens, drawn from 1 to 9.
- `target`: the winning order, a permutation of `numbers` over the six stations.
  Stored so the verifier and the difficulty measure can be checked against it, and
  obfuscated in the manifest payload, section 8.4 of Section 8 quality rules.
- `marks`: for each of the five gaps, either the required absolute difference, an
  integer, when the gap is visible, or `null` when it is hidden.

The true constraint at gap `i` is always `|order[i] - order[i + 1]| == d_i`, where
`d_i` is the absolute difference of the two neighbours in `target`. A visible mark
publishes `d_i`; a hidden mark keeps `d_i` off the board while the constraint still
holds. At least one gap is hidden, or the game is perfect information and section
10.5 does not apply, and at least one gap is visible, or the first run carries no
anchor to reason from.

### 6.2 The relay

The relay walks the current order from station 0. For gap `i` in 0 to 4:

1. If `|order[i] - order[i + 1]|` equals `d_i`, the baton crosses to station
   `i + 1` and continues.
2. Otherwise the baton stops at station `i`. The run's **depth** is `i`, the count
   of gaps it crossed.

A run that crosses all five gaps has depth 5 and **opens** the line. The relay never
throws and reads no hidden state beyond `d_i`, which the player does not see but the
rules do. Depth is the entire feedback channel: it is a position, station `i`, and
it says that gaps 0 to `i - 1` hold for this order and gap `i` does not, and nothing
about gaps beyond `i`.

### 6.3 Actions and refusals (item 17)

| Code | When | Announcement |
|---|---|---|
| `game-over` | any action once the line is open or the six runs are spent | "The relay is already finished for today." |
| `unknown-token` | a token identity that is not one of the six numbers | "That number is not in the row." |
| `same-token` | a swap naming one number twice | "Choose two different numbers to swap." |
| `repeat-run` | a run of an order already run this game | "You already ran that order; change it first." |

`repeat-run` keeps every spent run informative, so the ladder measures reasoning and
not indecision, which is the section 3 gate in the rules themselves. A swap that
leaves the order wrong is never refused, because reordering is free and only a run
has a price. Every code is reachable and each has a test.

### 6.4 Terminal conditions and score

The day ends when a run opens the line, a win, or when the sixth run does not, a
loss. The start order is scrambled by the generator so it never opens on zero runs,
screen S6, and the identical order refusal means the sixth run always tests
something the player has not tested.

`par` is the **forced depth** of section 14, the number of runs the declared no
guess model of section 10.5 needs to make the winning order certain. The score is
the run count, lower is better, following VECTOR, CIPHER and ROTATE LOCK.
`over = runs - par`. On a loss the score is 6 and `over` is not defined.

### 6.5 Tier and buckets (item 18)

Tier names are the suite wide names of `src/engine/tiers.ts`, the five ROTATE LOCK
used. The tier compares runs to par:

| Result | Tier | Bucket label |
|---|---|---|
| Won at or below par | 0 Excellent | Solved in 1 |
| Won 1 over par | 1 Great | Solved in 2 |
| Won 2 over par | 2 Good | Solved in 3 |
| Won 3 or more over par, within six | 3 Fair | Solved in 4 |
| | | Solved in 5 |
| | | Solved in 6 |
| Not opened in six | 4 Rough | Failed |

Distribution has seven buckets keyed on the run count, `Solved in 1` through
`Solved in 6` then `Failed`, distinguished bucket 0. The tier and the bucket are
different axes on purpose: the bucket is the raw run count every daily game shares,
and the tier is the run count against this board's par, so a board solved in four
runs is Excellent when its par is four and Fair when its par is one. Both come from
`inspect`, which grades once, and par is recomputed from the puzzle on every device
by the same model that measures difficulty, so it is never read from the manifest
and never null, including past the horizon where only the band is unrated.

---

## 7. Generator strategy (item 6)

Direct construction, ARCHITECTURE2.md section 10.1, the preferred strategy for
DIFFERENCE RELAY: build the winning order first, derive the differences, then hide
some and scramble.

1. **Numbers.** Draw six distinct integers from 1 to 9. The `range` lever is
   `range-tight`, all six inside a span of five, or `range-wide`, the full one to
   nine, which changes how many differences collide and so how much a visible mark
   pins.
2. **Target.** Draw a permutation of the six numbers, the winning order.
3. **Differences.** Read the five adjacent absolute differences of the target.
4. **Hide.** Draw `h` gaps to hide, `h` from the `hidden-1` or `hidden-2` lever, and
   mark the rest visible. Hidden gaps are chosen so that no run of consecutive
   hidden gaps is longer than the budget can read, screen S-fair enforces the real
   bound.
5. **Screens**, cheapest first, section 7.1.
6. **Scramble.** Draw a start order, up to `SCRAMBLE_TRIES` times, until it does not
   open and its first forced run under the model does not already reveal the target,
   so par is at least 1.

Randomness is the engine's integer rng through a `Draw` seam, as VECTOR and ROTATE
LOCK do it, one stream per puzzle, and the manifest records how many attempts the
day consumed so the verifier can replay it. Levers recorded per day: `range-tight`
or `range-wide`, and `hidden-1` or `hidden-2`.

### 7.1 Screens

| Order | Screen | Rejects |
|---|---|---|
| S0 | structure | numbers not distinct, no hidden gap, or no visible gap |
| S1 | uniqueness, 6! enumeration | more or fewer than one order satisfying visible plus hidden |
| S2 | decomposition, section 11 | a board the visible marks alone already pin, so no hidden gap is read |
| S3 | symmetry, section 12 | a board whose reverse is broken only by a hidden gap |
| S-fair | fairness, section 10.5 | a board the no guess model cannot open within six runs |
| S-band | band | a forced depth outside the day's weekday band |
| S-dup | duplicate | a board already used earlier in the horizon |

S2 and S3 both sit ahead of the fairness screen because they name concrete unfair
shapes cheaply, and the fairness search is the expensive screen that carries the
real claim.

---

## 8. Measured acceptance rate (item 7)

**Provisional, not measured.** No pipeline has run; these are the expectations the
generation deliverable tests against and replaces with the committed study of
section 20. They are written so a wrong guess is caught, not shipped.

Expected shape, by the section 10.2 accounting fields:

| Field | Expectation and why |
|---|---|
| candidates | drawn target plus a hide choice |
| structural rejects | near zero, distinctness is drawn distinct |
| uniqueness rejects | the largest reject class at `hidden-2`, because two hidden gaps often leave a second order that satisfies the visible marks |
| decomposition rejects | moderate, boards where the visible marks alone already pin the order |
| symmetry rejects | small, reverse broken only by a hidden gap |
| fairness rejects | moderate at `hidden-2`, the boards that need a seventh run |
| difficulty rejects | band dependent |
| duplicate rejects | negligible over 365 days against 720 orders times the hide choices |

Prototype expectation: acceptance well above the section 10.2 danger zone at
`hidden-1`, roughly one board in three to one in six, falling at `hidden-2` where
uniqueness and fairness both bite. A construction that accepts below a few percent
at either lever is a design fault to report, not a value to record, because the
horizon needs about 52 boards per band and the fallback of section 18 must stay
under a second. The real rates, with band and scramble, are section 20.

---

## 9. State space census (item 8)

Per day the player's order space is `6! = 720` orders. Equal differences make some
orders indistinguishable under the visible marks but not as orders, and the run
count is over orders, so the census is stated at 720.

The in game solver and the difficulty measure both enumerate the 720 orders once
per board, filtering by the visible marks and then by run feedback, which is a few
thousand integer comparisons and well under a millisecond. The CI verifier
enumerates the same 720 by its own walker and counts satisfying orders exactly,
**EXACT**, with a fixed finite bound of 720 per board, meeting the section 36
requirement of a known finite search bound.

---

## 10. Verification (item 9)

### 10.1 In the game: the order solver

`src/games/difference-relay/solver.ts`. It enumerates the 720 orders, keeps those
that satisfy the visible marks, and exposes two queries used by the module and the
difficulty measure: the set of orders satisfying visible plus hidden, which must
have size one, and the forced line of section 10.5 over the visible consistent set.
It carries no table and ships in the browser, as VECTOR's propagator and ROTATE
LOCK's route solver do.

### 10.2 In CI: the independent verifier

`tools/difference-relay-verify.ts`, a separate program that imports the rules and
the generator but never the solver. For every day it:

1. decodes the entry and checks structure: six distinct numbers in 1 to 9, five
   marks each null or a valid absolute difference, a target that is a permutation of
   the numbers whose adjacent differences equal the visible marks where present;
2. replays the recorded attempt count from the seed and requires a byte identical
   board;
3. enumerates all 720 orders by its own walker and requires exactly one to satisfy
   visible plus hidden, **EXACT**;
4. runs the decomposition and symmetry checkers of sections 11 and 12;
5. reruns the fairness model of section 10.5 and requires it to open the line within
   six runs, and recomputes forced depth and requires it to equal the module's
   measure and the stored band to match the weekday;
6. requires no board to repeat across the horizon.

### 10.3 The declared deduction model

The model is a no guess player. Its state is the candidate set `C`, initially every
order that satisfies the visible marks. On each run it submits a member of `C`,
never an order already eliminated and never one that violates a visible mark, and
reads the depth. A depth `d` less than 5 means the submitted order's gap `d` fails
under the true constraints, so every candidate that agrees with the submission on
the pair at gap `d`, and on all pairs at gaps 0 to `d - 1`, is filtered the same way
the run filtered the submission: candidates keep only if they cross the same prefix
and also fail, or differ earlier. Concretely `C` keeps every order consistent with
every past `(submission, depth)` pair under the rule that depth is the first failing
gap. The model chooses, among the members of `C`, the submission that minimises the
size of the largest candidate subset its possible depths could leave, the standard
minimax information choice, tie broken by the lexicographically smallest order.

The model **never submits an order outside `C`**. The fairness claim of section 10.5
is exactly that this candidate only strategy suffices within six runs, which is
strictly stronger than uniqueness: uniqueness says one order satisfies everything,
fairness says the player reaches it deductively, from what they can see plus the
baton, without a probe known to be wrong.

### 10.4 Uniqueness claim (item 10)

Exactly one order over the six stations satisfies the visible and the hidden marks
together. Proved by full enumeration of the 720 orders in both the solver and the
independent verifier, so it is EXACT with no beam anywhere. The reverse of any order
has the same five absolute differences in reverse order, so reversal is the one
transformation that can produce a second solution; it is a distinct permutation and
is therefore counted in the 720, so the uniqueness count already rejects any board
whose reverse also satisfies. Section 12 records why the screen is kept even so.

### 10.5 Fairness claim (item 11)

Declared model: **imperfect information**, section 10.3. The visible marks are the
only constraints the player can read, the hidden marks are real constraints learned
only through the depth the baton reaches, and the declared no guess model reaches
the unique order within six runs. A board the model cannot open in six runs without
a guess is rejected by screen S-fair, so every shipped board is fair by construction.

DIFFERENCE RELAY does **not** claim that a hurried player wins in par. Par is what a
perfect deducer needs; a player who submits an order not forced by the feedback
spends a run for nothing, and the run count is the score, so a guess is a price and
never a trap, the same posture ROTATE LOCK took in its section 10.5. It also does
not claim the feedback is a count; it is a position, and the whole game is built on
that being enough, which is the section 46 stress test met head on.

---

## 11. Decomposition (item 12)

The constraint graph of a relay is a chain, so it never splits into independent
components in the section 12.1 sense. The decomposition risk here is the other one,
the one that makes an imperfect information board secretly a perfect information
board: **the visible marks alone already pin the order.** If exactly one order
satisfies the visible marks by themselves, the hidden gaps are decoration, the baton
teaches nothing, and the game is section 46's rejected perfect information shape.

The checker rejects a candidate when the count of orders satisfying the visible
marks alone is one. A fair board has at least two visible consistent orders, so the
player must run the relay to tell them apart, which is the whole game. The verifier
reruns the checker on every committed day.

Result: **provisional, pending the study of section 20.** Expected to reject a
meaningful share at `hidden-1`, where one hidden gap is often redundant with the
visible marks, and little at `hidden-2`.

---

## 12. Symmetry (item 13)

Transformations considered, section 12.2:

1. **Reversal.** The absolute difference is symmetric, so the reverse of the target
   has the same five differences in reverse order. When the visible mark sequence is
   a palindrome, the reverse satisfies the same visible marks, and then only a hidden
   gap can break it. Such a board can be unique yet unfair: from the visible marks
   the player cannot separate the order from its reverse and must spend runs to do
   it, which the fairness screen may still pass but which reads as the board fighting
   its own mirror. The symmetry checker rejects a candidate whose reverse satisfies
   all visible marks, before the fairness search, so the search never carries the
   mirror alone. This is the explicit symmetry breaking ARCHITECTURE2 section 46
   names as RING BALANCE's stress test and section 35 names as the ordering family
   risk; DIFFERENCE RELAY meets it here rather than by anchoring a station, which is
   why the census stays at the full 6! and not 5!.
2. **Relabeling.** Adding a constant to every number preserves every difference, so
   the drawn number set is one representative of a relabel class. It is not a within
   board symmetry, because the tokens carry their drawn values, and two different days
   with relabel equivalent sets are distinct boards a player sees differently.
3. **Rotation and reflection of a lattice.** There is no lattice; the board is a
   line. Reflection of the line is reversal, item 1.

Result: **provisional, pending section 20.** Expected small, since a palindromic
visible mark sequence is uncommon, and the screen is kept because its cost is one
comparison and section 10.2 forbids leaning the uniqueness claim on a screen that
rejects almost nothing, which this one is not offered as.

---

## 13. Presentation

### 13.1 Layout at 360 pixels

Top to bottom inside the 344 pixel content width: a relay status line, the row of
six stations as 48 pixel tokens with the five gap markers between them at 8 pixel
gaps, the run counter as six pips, the Run button at 44 pixels tall, and a compact
ladder of the runs already spent. The row plus gaps is `6 * 48 + 5 * 24 = 408`,
wider than 344, so the row is centred in a horizontally scrollable strip that never
scrolls the page, or the tokens step to 44 pixels and the gap markers to 20, which
fits at `6 * 44 + 5 * 20 = 364`; the manual mobile check decides which, section 20
records it. No hover state carries meaning and `touch-action: manipulation` prevents
double tap zoom.

### 13.2 What a station and a gap show

Text first, so nothing rests on colour:

| Element | Glyph |
|---|---|
| a station | its number, `1` to `9` |
| a selected station | its number with a heavy border |
| the station the baton reached on the last run | its number in the accent with an underline |
| a visible gap | the required difference, a small number between the stations |
| a hidden gap | `?` |
| the gap where the last run's baton stopped | `?` or the number with a break glyph over it |

### 13.3 Relay status sentences

One line, announced through the live region whenever it changes:

| Run | Sentence |
|---|---|
| opened | "The relay is open. Solved in N runs." |
| stopped at gap `d`, `d < 5` | "The baton reached station D of 6, run R of 6." |
| loss on the sixth | "The relay did not open. Out of runs." |

A token's label is "Number V at station S", with "selected" appended when selected.
Each swap announces "Number V and number W swapped", each run announces the station
the baton reached and the run number.

---

## 14. Difficulty (item 14)

**Forced deduction work**: the total candidate mass the no guess model of section
10.3 must resolve, `sum over the forced runs of the size of the candidate set before
that run`, where the last term is 1. One integer, emergent, measured by the same
solver that proves fairness.

It is the section 27 forced depth candidate made countable and given resolution.
Run count alone takes only a handful of values and cannot fill seven bands; the
candidate mass ranges from a few, when the visible marks leave two or three orders
and one run settles it, to several hundred, when two hidden gaps leave a wide
consistent set that the baton whittles slowly. Hidden gaps raise it, difference
collisions raise it, and a visible mark that pins a pair lowers it.

`difficulty(puzzle)` recomputes it from the puzzle and never reads the manifest.

---

## 15. Seven band calibration (item 15)

**Method, edges provisional pending section 20.** `BAND_EDGES` are the septiles of
forced deduction work over screened candidates drawn across both hidden levers,
measured by `tools/difference-relay-calibrate.ts` and committed in
`data/difference-relay/study.json`. The weekday map is VECTOR's and ROTATE LOCK's,
`[0, 1, 2, 3, 5, 6, 4]` from Monday: gentle Monday, hard Saturday, Sunday between
Thursday and Friday.

The calibration must show each band holds well above the yearly need of about 52
boards, or a lever weight is retuned before the horizon is generated, the same bar
ROTATE LOCK's section 20 met at eight times supply.

---

## 16. Monday against Sunday (item 16)

**Provisional feel statement, confirmed against the study in section 20.**

**Monday.** Band 0 boards hide one gap and draw a `range-wide` set, so the five
visible marks leave only two or three orders alive and the difference at the hidden
gap is nearly forced by the numbers left. One run confirms the order the marks
already suggest, and the player is done in under a minute.

**Saturday and Sunday.** Band 6 and band 4 boards hide two gaps, often adjacent, on
a `range-tight` set where several differences collide, so the visible marks leave a
wide consistent set and the baton stops early on the first run. The player reads the
stopping station, learns one hidden gap is violated by a specific pair, reorders to
respect it, runs again, and repeats. The relay tells them where they stand one
station at a time, and the tier tells them what the reading cost.

---

## 17. Social telemetry (items 19 to 25)

### 17.1 Patterns (item 19)

Three, declared in `shareCapabilities`:

1. `micro-replay-path`: the rows are the depth the baton reached on each run, in
   order.
2. `comparative-friction`: a run is marked as friction when its depth did not exceed
   the best depth of every earlier run, a stall.
3. `emergent-fingerprint`: section 17.6.

Grammar `A`, attempt ladder. `maxRows` 6.

### 17.2 Run log record (item 20)

```text
RunLog { v: 1, entries: RelayRunEntry[] }

RelayRunEntry {
    index:   integer, zero based run number
    depth:   integer 0 to 5, gaps the baton crossed this run
    won:     boolean, true only on the run that reached depth 5
    stalled: boolean, true when this run's depth did not exceed every earlier depth
}
```

No number, station, mark, or order. The log is the player's own runs, held on the
device, and never sent anywhere. `stalled` is derived from the depth sequence alone
and stored so the mapper stays pure over the log.

### 17.3 Mapping function (item 21)

Pure, over the run log alone:

1. Token per run: a meter of `depth` `barFull` tokens followed by `barEmpty` to
   width 5. Every row is exactly 5 tokens, so no row is padded and the `unused`
   glyph never appears.
2. Rows are the runs in order, up to 6.
3. The title is `DIFFERENCE RELAY #<n> <tier name>, <r>/6`, or
   `DIFFERENCE RELAY #<n> Rough, X/6` on a loss, followed by `, streak <k>` when the
   streak is at least 2.

A won game's last row is five `barFull`. The height is at most 6 rows plus title and
URL, 8 lines, under the nine line cap, so the cap is never reached.

### 17.4 Clipboard artifact (item 22)

Won in 3, par 2, streak 4:

```text
DIFFERENCE RELAY #12 Great, 3/6, streak 4
🟦🟦⬜⬜⬜
🟦🟦🟦🟦⬜
🟦🟦🟦🟦🟦
dailykit.providentia.games
```

Won in 1, par 1:

```text
DIFFERENCE RELAY #40 Excellent, 1/6
🟦🟦🟦🟦🟦
dailykit.providentia.games
```

Lost, six runs, best depth 4:

```text
DIFFERENCE RELAY #12 Rough, X/6
🟦⬜⬜⬜⬜
🟦🟦⬜⬜⬜
🟦🟦🟦⬜⬜
🟦🟦⬜⬜⬜
🟦🟦🟦🟦⬜
🟦🟦🟦⬜⬜
dailykit.providentia.games
```

### 17.5 Graphic card (item 23)

1200 by 900, from the same `ArtifactModel` and no other input:

1. Title band, 120 pixels: game name and puzzle number, left; tier name and run
   count, right.
2. Fingerprint field, 1100 by 560: a single lane. One mark per run at `x = index`
   spaced evenly across the field and `y` proportional to the depth reached. A run
   that improved on the best depth so far is a filled square, a stall is a hollow
   ring, and the opening run is a filled star. Shape carries the meaning, so
   grayscale and high contrast lose nothing.
3. Footer, 120 pixels: the suite URL.

The card renderer is suite work and not built by any game yet; this is the
specification DIFFERENCE RELAY hands it.

### 17.6 Fingerprint (item 25)

One point per run: `x` the run index, `y` the depth reached, `shape` `accepted` for
a run that improved on the best depth so far, `correction` for a stall, and the
opening run flagged. Two players who win in the same number of runs differ whenever
their batons advanced in a different rhythm or stalled at different runs.

### 17.7 Leak test result (item 24)

Four probes in `telemetry.ts`, each with a positive control test that feeds it a
deliberately leaking artifact and requires it to fire.

| Question | Probe | Why DIFFERENCE RELAY passes |
|---|---|---|
| Position | every token is `barFull` or `barEmpty`, in a run of full then empty | no token names a number, station, mark, or order |
| Answer property | the rows equal the rows rebuilt from the run's depth sequence alone | nothing about the target or the marks enters the rows |
| Ordering | within a row all `barFull` precede all `barEmpty`, and rows are in run order | the order is run chronology and per row is depth, never gap identity |
| Shape | every row is exactly five tokens and rows never exceed six | the silhouette is depth per run only, never the board width beyond the fixed five gaps |

Title: carries the tier and the run count. It contains no number, difference, or
station.

**Accepted residue.** The depth a baton reaches is where the player's order first
disagreed with a hidden or visible constraint, which is a fact about the player's
submitted order and the board, not about the target. A co-player of the same day
learns only how far this player's chosen orders got, never which numbers go where,
because the same depth is reached by many orders. Par is not published; only the run
count is, and run count bounds par for everyone the way ROTATE LOCK's move count
bounds its par, which was accepted there. Result: pass, for the generated matrix of
won, average, near miss and lost runs in the telemetry tests.

---

## 18. Browser fallback budget (item 26)

Past the horizon the module generates the day in the browser with the band screen
removed, so any board that is unique, fair, and survives decomposition and symmetry
is accepted. Each construction is a target draw, a hide draw, one enumeration of 720
orders for uniqueness, and one fairness run, a few thousand comparisons, so an
accepted board costs well under a millisecond and the fallback is expected under a
tenth of a second even at a low acceptance rate. The ceiling is `FALLBACK_ATTEMPTS`,
and a day that exhausts it reports a puzzle failure rather than looping. The day is
unrated: no band, and the tier is still real because par is recomputed. The measured
time is section 20.

---

## 19. The contract (item 27)

`GameModuleV3<DifferenceRelayState, DifferenceRelayAction, DifferenceRelayPuzzle>`.

| Member | DIFFERENCE RELAY |
|---|---|
| identity | section 1 |
| input | `custom`, tap, orientation horizontal, the keys of section 5 |
| manifest | `/data/difference-relay/manifest.index.json`, lookahead 7 |
| archiveEnabled | true |
| hasWinLoss | true: opened or out of runs |
| stateVersion | 1 |
| distribution | the seven labels of section 6.5, distinguished 0 |
| shareCapabilities | grammar A, the three patterns of 17.1, maxRows 6 |
| parsePuzzle | decodes the obfuscated board and refuses anything section 10.2 step 1 would |
| generatePuzzle | the fallback of section 18 |
| firstSessionPuzzle | a fixed board: `range-wide`, one hidden gap, visible marks that leave three orders, par 1 |
| initialState | the scrambled start order, no runs |
| serialize | `{ v: 1, data: { s: "<six station digits>", r: ["<order>", ...] } }`, the current order and each order run |
| deserialize | replays each run through the rules against the puzzle and refuses any order a real game could not have reached |
| migrateState | refuses every older version, there is none |
| apply | section 6.3 |
| inspect | section 6.4 and 6.5 |
| difficulty | forced deduction work, section 14 |
| telemetry | section 17.2, derived from the run depths |
| shareArtifact | section 17.3 |
| mount | section 13 |
| help | the headline rule, five steps, and a worked example of a four station relay read from two runs, in text |

The ten contract pieces of the original Section 5 map onto these: identity, puzzle
production (`parsePuzzle`, `generatePuzzle`), state (`initialState`, `serialize`,
`deserialize`), rules (`apply`), terminal conditions (`inspect`), share rendering
(`shareArtifact`), stats shape (`distribution`), rendering (`mount`), input
(`input`) and help (`help`).

**Serialized runs.** Each run is the six station order as six digits, one number per
station. The current order is the same six digits. At most six runs, so the payload
is a fixed 6 plus at most 36 digits.

---

## 20. Measured values

**Placeholder.** Filled by the generation deliverable from
`npm run difference-relay:calibrate`, `npm run difference-relay:generate` and
`npm run difference-relay:verify`, on the pattern of ROTATE-LOCK.md section 20.
Until then the sections above marked provisional carry expectations, not
measurements, and the game does not go live. To record here: the calibration study
size and screened count and acceptance percent, the rejection counts per screen, the
forced deduction work `BAND_EDGES` and the per band supply, the par distribution and
the floor and ceiling, the horizon acceptance rate with the band screen and the
manifest chunk size, the verification wall clock over 365 days, and the browser
fallback time for days past the horizon.

---

## 21. Risks (item 28)

1. **The six run budget is generous over 720 orders.** A player could stumble into
   the answer by trying orders and reading the baton, which would make the ladder
   measure luck. Mitigated by the fairness screen shipping only deducible boards, the
   difficulty measure banding by forced deduction work not run count, and the repeat
   run refusal keeping every run informative. If prototype play shows the median run
   count sits far below par, the budget drops from six before the horizon is
   generated.
2. **Same family as CIPHER.** Conceded at lineup level. Section 2 records why the two
   do not play the same way: a count over a code versus a position over an ordering.
   If playtest reads them as the same, the lever is toward `hidden-2` and adjacency,
   which pushes DIFFERENCE RELAY toward prefix search and away from CIPHER's
   whole guess arithmetic.
3. **Reversal is a live symmetry.** Absolute difference is symmetric, so every board
   fights its own mirror. Handled by the symmetry screen of section 12 and by
   uniqueness counting the reverse as a distinct order, but it is the section 35
   ordering family risk and the first thing the verifier must be shown to catch.
4. **Row width at 360 pixels.** Six tokens and five gap markers on one portrait line
   is tight, section 13.1. Mitigated by a step down in token size or a non scrolling
   strip; not proven until the manual mobile check runs on real devices.
5. **Par leaks as run count.** Accepted in section 17.7, the same residue POKER GRID
   and ROTATE LOCK carry.
6. **The manual mobile check cannot be run by an agent.** The gate refuses a new game
   without it and no exemption covers one, so DIFFERENCE RELAY cannot go live until
   the owner runs MANUAL-CHECKS.md for it on devices.
7. **Every measured value here is provisional.** Sections 7, 8, 11, 12, 15 and 16
   carry expectations, and section 20 is empty. A design decision that turns on a
   number, above all the six run budget and the band edges, is not settled until the
   study and the pipeline replace it.
