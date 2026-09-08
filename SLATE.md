# DAILYKIT SLATE

Phase 9 deliverable, revised. Section 7.2. The pool is now three candidate
lists pooled and screened together: the ten in the first pass of this document,
twelve from Gemini, and twelve from CoPilot. Thirty four entries, which reduce
to roughly two dozen distinct concepts once the duplicates are collapsed.

Awaiting approval. Nothing beyond POKER GRID may be built until it is given.

## 1. What the pooled review changed

One swap, and one question that has to go back to you.

**The swap.** TALLY DROP replaces LADDER in the arithmetic slot. LADDER scored a
player on how close they got to three targets. TALLY DROP has a **unique
solution provable by exhaustive search over 7,776 states**, which is a better
daily property than a closeness score by a wide margin: every player is chasing
the same single answer, the verifier is twenty lines and cannot be wrong, and
the difficulty knob is a real measurement rather than a proxy. It is also the
best verification story of any candidate in the pool, POKER GRID included,
whose stored scores are a beam result labelled best known.

**The question.** Both external lists independently drifted to **constraint
satisfaction** as a fifth mode and both dropped **pattern and memory recall**,
Gemini explicitly ("pure memory recall games perform poorly in daily web
formats"). That is not a preference, it is a reading of 7.1.1. See Section 4.
It is the only open decision in this document.

Twenty four fresh concepts produced one upgrade. That is the honest result and
I am not going to manufacture more churn to make the review look productive.

## 2. Screening

Every candidate from all three lists was run against Section 7.1 before
ranking. Four rules did the work.

**7.1.4, zero daily content cost.** A game qualifies only if a Node script
produces the day's puzzle from a seed and a second script proves it good
without a human reading it. Proves means a checkable property: unique solution,
reachable target, solvable inside the attempt limit, inside a difficulty band.

**7.1.1, distinct cognitive mode.** POKER GRID holds spatial planning. Every
remaining slot admits exactly one game, so the strongest candidate in an
occupied mode loses to a weaker candidate in an empty one. This rule alone
removes eight otherwise good concepts, listed in Section 5.

**7.1.5, zero licensing exposure.** Playing card ranks, numerals, geometric
shapes, public domain word lists.

**7.1.6, one rule sentence**, and 8.2, a 360 pixel portrait viewport. Several
strong concepts fail here rather than on logic, and both external documents
flagged the same ones.

## 3. The recommended slate

| Slot | Game | Mode | Session | Failure | Source |
|---|---|---|---|---|---|
| 1 | POKER GRID | Spatial planning | 3 to 5 min | Continuum | Built |
| 2 | RULE OF FOUR | Categorization | 2 to 3 min | Pass or fail, 4 mistakes | This document |
| 3 | CIPHER | Deduction from feedback | 90 s to 2 min | Pass or fail, 6 guesses | This document |
| 4 | TALLY DROP | Arithmetic and sequence | 60 to 90 s | Continuum, shift count | Gemini, concept 2 |
| 5 | RECALL | Pattern and memory recall | 40 to 60 s | Continuum, cells recalled | This document, renamed |

Section 7.1 conformance:

1. **Distinct mode.** Five modes, five games, one each.
2. **Distinct session length.** A clean ladder from forty seconds to five
   minutes with no two games in the same band. TALLY DROP at sixty to ninety
   seconds is a tighter fit than LADDER was, which lets RECALL hold the sub
   minute slot without the two crowding each other.
3. **Distinct failure feel.** Three continuum, two pass or fail.
4. **Zero daily content cost.** Every one generates from a seed and verifies by
   a checkable property, named per game below.
5. **Zero licensing exposure.** Card ranks, six geometric shapes, and integers.
   No word list, no image, no audio, no proper noun, no third party game whose
   trade dress a court would recognise.
6. **One rule sentence.** Stated per game below, each fitting a hub card.

### Slot 4, TALLY DROP, new

- **Rule sentence.** Slide the five number strips until every row adds up to
  the totals in the margins.
- **Mode.** Arithmetic and sequence reasoning.
- **Session.** Sixty to ninety seconds. The suite's second fastest game.
- **Input.** Vertical drag per column, one gesture, no typing and no menus.
- **Generation.** Five column strips of six digits each. The generator sets the
  strips to a secret alignment, reads the four row sums off it to use as the
  margin targets, then shifts each column between one and five steps away.
- **Verification.** Exhaustive. Six offsets per column across five columns is
  7,776 states, and checking four row sums per state is about thirty one
  thousand additions, so the verifier enumerates every state and asserts that
  **exactly one** produces all four targets. There is no beam, no heuristic and
  no tolerance anywhere in it. This is the strongest verification claim in the
  suite.
- **Difficulty.** Not total shift distance, which measures how far the strips
  were moved rather than how hard the puzzle is. The measure is the **count of
  states satisfying three of the four rows**: near misses are what a player
  actually fights, a board with many of them teases and a board with none is
  mechanical. It is an integer produced by the same enumeration, so
  verification reproduces it exactly, the same property generation decision 12
  gives POKER GRID.
- **Failure.** Continuum. Unlimited shifts, scored on shifts taken above the
  minimum. No failure state, so this and POKER GRID are the two games a bad day
  cannot take from you.
- **Share block.** Title carries the tier, then one five cell meter row filled
  with that tier's token. Four lines including the URL, the shortest block in
  the suite. Gemini's proposed block used loose emoji outside the vocabulary,
  which contract decision 4 does not allow; games emit tokens and the engine
  owns the glyphs. A row per column showing how near each ended to its target
  offset was considered and rejected: it tells a reader which columns were
  already correct, which narrows their own search.

### Slots 1, 2, 3 and 5, unchanged in substance

- **POKER GRID.** Clear the board with connected five card poker hands. Spatial
  planning, three to five minutes, continuum with no failure state, precomputed
  365 day manifest verified by solver replay. Built and shipping.
- **RULE OF FOUR.** Sort sixteen numbers into the four groups that each follow
  a hidden rule. Categorization, two to three minutes, four mistakes allowed.
  Four rules drawn from a fixed library of formal integer predicates with
  overlap traps planted deliberately; verification is exhaustive search over
  the 2,627,625 partitions of sixteen items into four groups of four, asserting
  exactly one is valid. Difficulty is the count of planted overlaps. Chosen over
  Gemini's ORBITAL CLUSTERS, which is the same idea at eight items and two
  groups, where identifying one group leaves the other forced and the day
  therefore contains a single decision.
- **CIPHER.** Break a four symbol code in six guesses from the counts of exact
  and misplaced matches. Deduction from feedback, ninety seconds to two minutes,
  pass or fail. Six geometric shapes, repeats allowed, 1,296 codes. Verified by
  a Knuth style minimax solver asserting the code is deducible in six, that the
  optimal line needs at least four so the day is not trivial, and that the
  count of codes still consistent after a fixed opening falls in a weekday band.
  One row per guess, four cells, sorted so position never leaks.
- **RECALL**, formerly ECHO. Study a pattern of lit cells, then reproduce it
  from memory, three times, with the pattern growing denser each round. Pattern
  and memory recall, forty to sixty seconds, continuum on cells recalled.
  Verified structurally rather than solved: a pattern symmetric under any
  reflection or rotation, or a pure row or column fill, or one whose lit cells
  are all contiguous, is rejected, because each collapses the memory task into
  a one word description. Difficulty is total lit cells across the rounds.
  Renamed because all three lists contained something called Echo and they were
  three different games.

## 4. The one open decision

**Is the list of five modes in 7.1.1 exhaustive or illustrative?**

The sentence is: "Spatial planning, deduction from feedback, categorization,
arithmetic or sequence reasoning, and pattern or memory recall are five separate
modes. Pick five." It can be read as naming the five, or as offering five
examples of what separate means.

This document has been reading it as exhaustive. Both external lists read it as
illustrative, and both then reached for **constraint satisfaction**, a sixth
mode neither the document nor I had on the list, and both dropped memory recall
to make room. Gemini's stated reason is that memory games play badly daily.
CoPilot's recommended four contain two deduction variants and no memory game at
all.

I think their instinct about memory is right and their arithmetic is wrong.
Memory recall is the weakest of the five modes for a daily format, for exactly
the reason Gemini gives, and RECALL is the slate's weakest entry. But it is
also the only mode that naturally produces a forty second game, and 7.1.2
requires one. Dropping it means the sub minute slot has to be filled by
speeding another mode up rather than by a game that is genuinely that size.

**If you read 7.1.1 as illustrative**, the swap is RECALL out, **VECTOR** in:

- **Rule sentence.** Place arrows so every numbered cell has exactly that many
  arrows pointing at it.
- **Mode.** Deduction from static constraints, the nonogram family.
- **Session.** Three to five minutes, pass or fail.
- **Why it is the pick from the constraint satisfaction field.** No prior
  knowledge, unlike CHESS RECTIFY, which needs piece movement, and CIRCUIT
  MESH, which needs logic gates. Numerals and arrows only, so it renders at 360
  pixels, unlike MIRROR MARKS and QUANTUM PATH, whose ray overlap readability
  both source documents flag as a risk. Exact uniqueness verification from a
  solved arrow field. Tap to cycle, one gesture.
- **What it costs.** The suite loses its sub minute game and gains a second
  three to five minute game, so 7.1.2 fails unless TALLY DROP is tuned down to
  under sixty seconds. That is plausible, since a five strip slide with a
  unique answer is fast once a player knows the shape, but it is a design
  commitment made now rather than a property the slate has for free.

My recommendation is the strict reading and RECALL. The exhaustive reading is
what the document says, the mode ladder is what 7.1.2 asks for, and RECALL
being the weakest of five is a smaller problem than a suite whose two longest
games are both grid deduction. But two independent reviews landing on the other
side is worth your five minutes, so it is Question 1.

## 5. Rejected, with the reason

Grouped by why, not by source. Nothing here is a bad game.

**Mode already held by POKER GRID, spatial planning.** TAXI GRID, FIT, SYMBOL
REDUCE, FRACTION, QUANTUM PATH, MIRROR MARKS, SUMLINE, FOLD, WEAVE. Rule 7.1.1
does not care how good they are. SUMLINE is the sharpest loss: it is arithmetic
and spatial at once, and its drag a path gesture is POKER GRID's gesture, so it
would read as a reskin on the hub. MIRROR MARKS is CoPilot's top ranked concept
and loses on this rule plus small screen readability.

**Mode already held by CIPHER, deduction from feedback.** ECHO SEQUENCE,
CoPilot's ECHO, PINPOINT WORD, WORDLINE. PINPOINT WORD is Gemini's highest
scored concept and the closest call in the document: replacing Wordle's colour
feedback with a single summed alphabetical distance is genuinely novel. It
loses on three counts. It carries a word list, and Section 11.7 has deferred
localization, so an English word game is an obligation the day anyone outside
English opens it. Its actual play is letter index arithmetic, which blurs it
into TALLY DROP's mode rather than sitting cleanly in deduction. And it asks a
player to know that E is the fifth letter, which is a different game from the
one the rule sentence promises.

**Mode already held by RULE OF FOUR, categorization.** ORBITAL CLUSTERS, TRIAD.
ORBITAL CLUSTERS is thin, see Section 3. TRIAD is a SET variant, and SET is a
live commercial product with a recognisable trade dress; the mechanic is not
protectable but the resemblance is exposure 7.1.5 asks us not to take, and
CoPilot flagged the differentiation risk itself.

**Mode already held by TALLY DROP, arithmetic.** LADDER, CHAIN ORDER, DUAL
BALANCE, BALANCE. LADDER is this document's own earlier pick and loses on the
unique solution argument in Section 1. DUAL BALANCE asks for simultaneous mass
and torque balance, which is two rules in one sentence and a multiplication
step in the player's head.

**Sixth mode, held only if 7.1.1 is illustrative.** VECTOR, CHESS RECTIFY,
CIRCUIT MESH, GLYPH LOCK, ORBIT, DOMINO BOUND, GRIDLOCK. VECTOR is the pick of
this field, see Section 4. CHESS RECTIFY is second and loses on the prior
knowledge gate. DOMINO BOUND and CIRCUIT MESH both fail 8.2 on drag targets and
symbol clutter at 360 pixels, which both source documents note.

**Fails 7.1.4.** SPECTRUM, ordering quantities, which needs a curated fact
source however it is dressed. LEXICON SHIFT, whose row anagram overlaps break
solution uniqueness, a risk Gemini names itself.

## 6. Why CIPHER is game two

Unchanged from the first pass, and the pooled review strengthens it. Section
7.4 makes game two the architecture's trial, so the right game two is the one
least like game one. CIPHER differs from POKER GRID on every axis the contract
touches: a small fixed palette rather than a lattice, which is the first real
use of the `custom` branch of `InputDescriptor`; a genuine failure state, so
`hasWinLoss` is true for the first time and the win rate row of requirement 3.4
renders for the first time; guess count buckets rather than a remainder ladder;
a puzzle of a few bytes rather than a 35 cell board, which is the case that
reveals whether the manifest machinery assumes POKER GRID's size; and no board
mutation at all, so `apply` is nearly append only.

TALLY DROP would be the wrong game two despite being the cleanest to build.
Five columns of digits on a grid, scored on a continuum with no failure state,
is close enough to POKER GRID's shape that passing the abstraction test would
prove very little.

## 7. What approval decides

1. The four game names and their ids, which become storage key namespaces and
   RNG stream names and are therefore expensive to change after launch. The
   current ids are `cipher`, `rule-of-four`, `tally-drop`, `recall`.
2. Which game is Phase 11's abstraction test. Recommended: CIPHER.
3. The order of the remaining three in Phase 13. Recommended: RULE OF FOUR,
   TALLY DROP, RECALL, easiest verification last.
4. The five hub entries, which Phase 10 already ships as data in
   `src/shell/registry.ts` with the four unbuilt games marked `planned`.

Nothing here commits to a rule detail beyond the one sentence rule. Each game
gets its own design document at its own phase, as POKER GRID got `POKER-GRID.md`
at Phase 2.
