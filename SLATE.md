# DAILYKIT SLATE

Phase 9 deliverable, second revision. Section 7.2.

Pool: the ten candidates from this document's first pass, twelve from Gemini,
twelve from CoPilot. Thirty four entries, roughly two dozen distinct concepts.

**Ruling applied in this revision: 7.1.1's list of five modes is illustrative,
not exhaustive.** The binding rule is "no two games may exercise the same core
skill." Which skills those are is now a design judgment rather than a quotation.

Awaiting approval. Nothing beyond POKER GRID may be built until it is given.

## 1. What the illustrative reading actually changes

Not what I expected, and not what either external list did with it.

Both external documents used the freedom to add **constraint satisfaction** and
delete **memory recall**. I now think the first half of that is right and the
second half is wrong, and that the freedom is better spent somewhere neither
list looked: **RULE OF FOUR should be the game that goes.**

The reason is 7.1.4. Every game must be machine verified, and there are two
different things that phrase can mean:

- **Uniqueness**, that exactly one answer exists. Every candidate here can
  prove this.
- **Fairness**, that a human can reach that answer by reasoning rather than by
  guessing. Only some candidates can prove this.

RULE OF FOUR proves the first and cannot prove the second. I can enumerate all
2,627,625 partitions and confirm one is valid, and I have no check at all for
whether a person could ever see that the four grouped numbers are the ones with
three prime factors. A puzzle can be uniquely solvable and humanly impossible,
and the generator would happily ship it every Tuesday. That is a hole in 7.1.4
dressed up as a passing verification.

**VECTOR closes it.** In its family, the fairness check and the uniqueness check
are the same pass: run constraint propagation, and if the board resolves without
the solver ever having to guess, the board is both unique and solvable by
reasoning. The measure of how deep that chain runs is the difficulty knob, and
it is an integer.

So the swap this ruling unlocks is not RECALL for VECTOR. It is **RULE OF FOUR
for VECTOR**, and categorization is the mode the suite gives up.

## 2. Why categorization is the right mode to lose

Categorization is the best proven mode in the pool. Connections is enormous.
That proof does not transfer, because the version that works is editorial word
association and 7.1.4 bans it by name. What is left is formal properties of
integers, which is the dry, unfair, unverifiable version. Gemini flagged the
dryness independently. The mode we can build is not the mode that is proven.

Both alternatives in the pool are worse, not better. ORBITAL CLUSTERS is eight
items in two groups, so identifying one group leaves the other forced and the
day contains one decision. TRIAD is a SET variant, and SET is a live commercial
product with recognisable trade dress; the mechanic is not protectable but the
resemblance is exposure 7.1.5 asks us not to take, which CoPilot flagged itself.

## 3. Why RECALL stays, against both external recommendations

Gemini deletes memory recall on the grounds that players dislike rote recall.
As a critique of a game it is fair. As a reason to have no forty second game it
is not, and it misses what the slot is for.

Requirement 7.3.4 makes the suite streak the prominent one, and defines it as
consecutive days completing **at least one** game. That mechanic only forgives
if there is something a distracted person can finish at a bus stop. RECALL is
not on the slate because it is the best game on the slate. It is there because
it is the one that saves a streak on a bad day, and a suite whose shortest game
is ninety seconds has a forgiveness feature with nothing to forgive with.

It also carries no fairness burden, because there is nothing to deduce. Its
verification is structural rejection of patterns that collapse into a one word
description, and that is honest rather than a weak version of a proof.

The suite can afford one light game precisely because VECTOR now carries the
rigour. Under the previous slate it could not.

## 4. The recommended slate

| Slot | Game | Core skill | Session | Failure | Status |
|---|---|---|---|---|---|
| 1 | POKER GRID | Spatial planning under consequence | 3 to 5 min | Continuum | Built |
| 2 | **VECTOR** | Deduction from static constraints | 2 to 4 min | Pass or fail, 3 submissions | New |
| 3 | CIPHER | Deduction from interactive feedback | 90 s to 2 min | Pass or fail, 6 guesses | Phase 11 |
| 4 | TALLY DROP | Arithmetic and numeric search | 60 to 90 s | Continuum, shift count | Phase 13 |
| 5 | RECALL | Pattern and memory recall | 40 to 60 s | Continuum, cells recalled | Phase 13 |

Conformance:

1. **Distinct core skill.** Five skills, five games. The pair worth defending is
   slots 2 and 3, both called deduction. They are different skills: VECTOR is
   constraint propagation, where every fact is on the board at the start and the
   work is finding the forced cell and chaining. CIPHER is information economy,
   where no facts exist until you spend an attempt to buy one. A person strong
   at Sudoku is not thereby strong at Wordle. The first revision of this
   document collapsed them, which was wrong under either reading of 7.1.1.
2. **Session length.** A clean ladder, forty seconds to five minutes, no two
   games in the same band, and the sub minute requirement met by a game that is
   naturally that size rather than by compressing one that is not.
3. **Failure feel.** Three continuum, two pass or fail. The previous slate's
   swap to VECTOR without dropping RULE OF FOUR would have made it three pass
   or fail, and three games where you either got it or you did not reads as a
   test rather than a suite.
4. **Zero daily content cost.** Named per game below. Four of the five prove
   fairness as well as uniqueness; the fifth has nothing to be fair about.
5. **Zero licensing exposure.** Card ranks, six geometric shapes, integers, and
   arrows. No word list, no image, no audio, no proper noun. See the naming
   caution in the VECTOR entry.
6. **One rule sentence.** Stated per game, each fitting a hub card.

### Slot 2, VECTOR, new

- **Rule sentence.** Point every arrow so each numbered cell is the first one
  that exactly that many arrows reach.
- **Core skill.** Deduction from static constraints.
- **Session.** Two to four minutes.
- **Input.** Tap a cell to cycle its arrow through the four directions. Grid
  input, so it reuses `ui/gridCursor.ts` for keyboard play unchanged.
- **The rule in full.** A grid holds numbered cells and blank cells. Every blank
  cell carries an arrow. An arrow travels in its direction until it reaches the
  first numbered cell in its path, or leaves the board. A numbered cell is
  satisfied when the count of arrows arriving at it equals its number.
- **Why rays and not neighbours.** The obvious formulation, where an arrow
  counts toward the adjacent cell it points into, decomposes: each numbered cell
  is then constrained only by its four neighbours and the board becomes a set of
  independent five cell puzzles with no chaining. Rays couple distant cells,
  which is what makes the deduction global and the propagation check meaningful.
- **Generation.** Fill every blank cell with a seeded random arrow, trace each
  ray to its first numbered cell, count arrivals, publish those counts as the
  numbers, then blank the arrows.
- **Verification, and this is the point of the game.** Run constraint
  propagation with no guessing permitted. A board passes only if it resolves
  completely, which proves uniqueness and human solvability in the same pass.
  Boards that stall are rejected and regenerated, and brute force over 4^n arrow
  assignments is never needed or attempted.
- **Difficulty.** The maximum propagation depth reached before the board
  resolves, meaning how long the chain of forced deductions runs. An integer
  produced by the verifying pass, so verification reproduces it exactly, the
  same property generation decision 12 gives POKER GRID. Banded by weekday.
- **Failure.** Pass or fail. Arrows are placed freely and cost nothing, and a
  completed board is submitted. A submission that is wrong says only that it is
  wrong and never which cells. Three submissions, then the day is over. This is
  the Connections convention players already know, and it deliberately gives no
  per attempt information, so it does not become a second information economy
  game beside CIPHER.
- **Share block.** One row per submission, up to three, five cells each: `best`
  across for a solve, `miss` across for a failed one. Five lines including title
  and URL.
- **Naming caution.** Arrow and ray counting puzzles exist in published
  catalogues under proprietary genre names. Mechanics are not protectable and
  ours is generated independently, but the game keeps its own name and its own
  rules text, and no published genre name appears anywhere in the product or
  the repository. Recorded in `ASSETS.md` at build time.

### Slots 1, 3, 4 and 5

- **POKER GRID.** Clear the board with connected five card poker hands. Spatial
  planning, three to five minutes, continuum with no failure state, 365 day
  manifest verified by solver replay. Built and shipping.
- **CIPHER.** Break a four symbol code in six guesses from the counts of exact
  and misplaced matches. Six geometric shapes, repeats allowed, 1,296 codes.
  Verified by a Knuth style minimax solver asserting the code is deducible in
  six, that the optimal line needs at least four so the day is not trivial, and
  that the count of codes still consistent after a fixed opening falls in a
  weekday band. That middle assertion is CIPHER's fairness proof. One row per
  guess, four cells, sorted so position never leaks.
- **TALLY DROP.** Slide the five number strips until every row adds up to the
  totals in the margins. Gemini's concept 2. Six offsets per column across five
  columns is 7,776 states, so the verifier enumerates every one and asserts
  exactly one satisfies all four targets. No beam, no heuristic, no tolerance,
  and the strongest verification claim in the suite, POKER GRID included, whose
  stored scores are a beam result labelled best known. Difficulty is the count
  of states satisfying three of the four rows, because near misses are what a
  player fights, and it is an integer from the same enumeration. Fairness is
  free: the whole state space is smaller than the number of moves a player can
  make. Continuum on shifts above the minimum. Title carries the tier, then one
  five cell meter row. Gemini's proposed block used loose emoji outside the
  vocabulary, which contract decision 4 does not permit.
- **RECALL.** Study a pattern of lit cells, then reproduce it from memory three
  times, growing denser each round. Verified structurally: a pattern symmetric
  under any reflection or rotation, or a pure row or column fill, or one whose
  lit cells are all contiguous, is rejected, because each collapses the memory
  task into a one word description. Difficulty is total lit cells. Continuum on
  cells recalled. The study phase is a fixed duration with a visible countdown
  and a replay that costs score rather than being forbidden, and there is no
  reaction time component anywhere, which is what keeps it playable under
  `prefers-reduced-motion` and with a screen reader. Renamed from ECHO because
  all three source lists contained a different game by that name.

## 5. Game two is still CIPHER

Section 7.4 makes game two the architecture's trial, so the right game two is
the one least like game one. CIPHER differs from POKER GRID on every axis the
contract touches: a small fixed palette rather than a lattice, which is the
first real use of the `custom` branch of `InputDescriptor`; a genuine failure
state, so `hasWinLoss` is true for the first time and the win rate row of
requirement 3.4 renders for the first time; guess count buckets rather than a
remainder ladder; a puzzle of a few bytes rather than a 35 cell board, which is
the case that reveals whether the manifest machinery assumes POKER GRID's size;
and no board mutation at all, so `apply` is nearly append only.

VECTOR would be the wrong game two despite being the most rigorous of the four.
It is a grid game with a grid cursor and a `grid` input descriptor, so it would
reuse the parts of the engine POKER GRID has already exercised and prove the
least. It is the right game three, once the contract has been corrected.

Phase 13 order: VECTOR, TALLY DROP, RECALL. Hardest generator first, while the
appetite for engine correction is still there.

## 6. Rejected, with the reason

**Skill held by POKER GRID.** TAXI GRID, FIT, SYMBOL REDUCE, FRACTION, QUANTUM
PATH, MIRROR MARKS, SUMLINE, FOLD, WEAVE. SUMLINE is the sharpest loss: it is
arithmetic and spatial at once, and its drag a path gesture is POKER GRID's
gesture, so it would read as a reskin on the hub. MIRROR MARKS is CoPilot's top
ranked concept and loses here plus on 8.2, ray overlap readability at 360
pixels, which both source documents flag.

**Skill held by VECTOR.** CHESS RECTIFY, CIRCUIT MESH, GLYPH LOCK, ORBIT,
DOMINO BOUND, GRIDLOCK. CHESS RECTIFY is the runner up and loses on the prior
knowledge gate: piece movement is a rule set the hub card cannot state. CIRCUIT
MESH has the same problem with logic gates and adds symbol clutter at 360
pixels. DOMINO BOUND fails 8.2 on drag targets for 2x1 tiles in portrait.

**Skill held by CIPHER.** ECHO SEQUENCE, CoPilot's ECHO, PINPOINT WORD,
WORDLINE. PINPOINT WORD is Gemini's highest scored concept and the closest call
in the pool: replacing colour feedback with a summed alphabetical distance is
genuinely novel. It loses on three counts. It carries a word list, and Section
11.7 defers localization, so an English word game is an obligation the day
anyone outside English opens it. Its actual play is letter index arithmetic,
which puts it in TALLY DROP's skill rather than CIPHER's. And it asks a player
to know that E is the fifth letter, which is not the game the rule sentence
promises.

**Skill held by TALLY DROP.** LADDER, CHAIN ORDER, DUAL BALANCE, BALANCE.
LADDER was this document's own first pick and lost to TALLY DROP on unique
solvability: it scored a player on closeness to three targets, where TALLY DROP
has one provable answer everyone is chasing. DUAL BALANCE asks for simultaneous
mass and torque balance, which is two rules in one sentence and a
multiplication in the player's head.

**Skill held by RECALL.** DRIFT, LEXICON SHIFT. DRIFT is sudden death on a
growing sequence, which is a timing exercise wearing a memory costume and cannot
be made accessible without becoming a different game. LEXICON SHIFT has row
anagram overlaps that break uniqueness, a risk Gemini names itself.

**Categorization, dropped as a mode.** RULE OF FOUR, ORBITAL CLUSTERS, TRIAD.
Section 2.

**Fails 7.1.4 outright.** SPECTRUM, ordering quantities, which needs a curated
fact source however it is dressed.

## 7. What approval decides

1. The four game ids, which become storage key namespaces and RNG stream names
   and are expensive to change after launch: `vector`, `cipher`, `tally-drop`,
   `recall`.
2. Game two for the abstraction test. Recommended: CIPHER.
3. Phase 13 order. Recommended: VECTOR, TALLY DROP, RECALL.
4. The five hub entries, already shipping as data in `src/shell/registry.ts`
   with the four unbuilt games marked `planned`.

Nothing here commits to a rule detail beyond the one sentence rule and the
verification strategy. Each game gets its own design document at its own phase,
as POKER GRID got `POKER-GRID.md` at Phase 2.
