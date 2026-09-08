# DAILYKIT SLATE

Phase 9 deliverable. Section 7.2. Ten candidates, five recommended, awaiting
approval. Nothing in Section 7 permits a game beyond POKER GRID to be built
before this document is approved, so this file is the gate.

## 1. Screening rules applied

Every candidate below was tested against Section 7.1 before it reached this
list. The three rules that did the most work:

**7.1.4, zero daily content cost.** This is the rule that killed the most
attractive ideas. A game qualifies only if a Node script can produce a day's
puzzle from a seed and a second script can prove that puzzle is good without a
human reading it. "Prove" means a real property, not a smoke test: unique
solution, reachable target, solvable within the attempt limit, inside a
difficulty band. Anything whose quality depends on taste rather than on a
checkable property is out, no matter how well it would play.

**7.1.1, distinct cognitive mode.** Five modes are named in the document:
spatial planning, deduction from feedback, categorization, arithmetic or
sequence reasoning, and pattern or memory recall. POKER GRID occupies spatial
planning. The other four slots each admit exactly one game, which means the
strongest candidate in an already occupied mode loses to a weaker candidate in
an empty one. Two candidates below are rejected on this rule alone and both are
better games than one of the five recommended.

**7.1.5, zero licensing exposure.** Playing card ranks, numerals, geometric
shapes, and public domain word lists. No images, no audio, no trivia, no
proper nouns.

## 2. The ten candidates

Columns are as Section 7.2 requires. Full detail for each follows the table.

| # | Name | Mode | Session | Failure model | Verdict |
|---|---|---|---|---|---|
| 1 | POKER GRID | Spatial planning | 3 to 5 min | Continuum, no fail state | **Recommended** |
| 2 | CIPHER | Deduction from feedback | 90 s to 2 min | Pass or fail, 6 guesses | **Recommended** |
| 3 | RULE OF FOUR | Categorization | 2 to 3 min | Pass or fail, 4 mistakes | **Recommended** |
| 4 | LADDER | Arithmetic and sequence | 60 to 90 s | Continuum, 3 targets | **Recommended** |
| 5 | ECHO | Pattern and memory recall | 40 to 60 s | Continuum, cells recalled | **Recommended** |
| 6 | DRIFT | Pattern and memory recall | 30 to 60 s | Sudden death run length | Rejected, mode taken by ECHO |
| 7 | GRIDLOCK | Deduction from constraints | 6 to 12 min | Pass or fail | Rejected, mode collision and length |
| 8 | FIT | Spatial packing | 3 to 5 min | Pass or fail | Rejected, mode collision with POKER GRID |
| 9 | WORDLINE | Deduction from feedback | 2 to 3 min | Pass or fail, 6 guesses | Rejected, mode collision and localization debt |
| 10 | SPECTRUM | Estimation and calibration | 60 s | Continuum | Rejected, violates 7.1.4 |

### Candidate 1, POKER GRID

- **Rule sentence.** Clear the board with connected five card poker hands.
- **Cognitive mode.** Spatial planning, with poker knowledge stacked on top.
- **Session length.** Three to five minutes. This is the suite's long game, and
  it satisfies the second half of 7.1.2 on its own.
- **Generation.** Seeded placement of 35 distinct cards from a 52 card deck,
  weekday lever schedule, precomputed 365 day manifest. Built and shipping.
- **Verification.** Solver replay of every manifest entry, difficulty banded on
  mean greedy shortfall, degenerate boards rejected and regenerated.
- **Failure model.** Continuum. No failure state, per locked decision 4. The
  streak is played, not won.
- **Share encoding.** One row per hand played, one tier glyph per row, up to
  seven rows. Title carries the tier name.

### Candidate 2, CIPHER

- **Rule sentence.** Break a four symbol code in six guesses, using only the
  count of symbols you got exactly right and the count you got right in the
  wrong place.
- **Cognitive mode.** Deduction from feedback. This is the mode Wordle occupies
  in the wider genre and the suite needs it, because it is the mode that
  produces the tightest share block in the whole category.
- **Session length.** Ninety seconds to two minutes. Fast, but not the sub
  minute game.
- **Generation.** Seeded draw of four symbols from a palette of six geometric
  shapes with repeats allowed, giving 1,296 codes. The seed picks a code and a
  difficulty lever, where a lever is a structural property of the code such as
  exactly one repeated symbol or no symbol shared with the previous day.
- **Verification.** A Knuth style minimax solver plays the code from a fixed
  opening and asserts three properties: the code is deducible within six
  guesses against a perfect solver, the optimal line needs at least four
  guesses so the day is not trivial, and the number of codes still consistent
  after the fixed opening falls inside a weekday band. That last figure is the
  difficulty measure, and it is an integer, so verification reproduces it
  exactly rather than within a tolerance.
- **Failure model.** Pass or fail. Six guesses, then the code is revealed. This
  is the suite's first genuine failure state and it is why 7.1.3 is satisfied.
- **Share encoding.** One row per guess. Each row is four cells: `best` for
  each exact match, `partial` for each misplaced match, `miss` for the rest,
  sorted so position never leaks. A solved puzzle's last row is four `best`.
  Maximum block height is eight lines including title and URL.

### Candidate 3, RULE OF FOUR

- **Rule sentence.** Sort sixteen numbers into the four groups of four that
  each follow a hidden rule.
- **Cognitive mode.** Categorization.
- **Session length.** Two to three minutes.
- **Generation.** Four rules are drawn from a fixed library of formal integer
  predicates: multiples of a given number, perfect squares, primes,
  palindromes, digit sum equal to a constant, and so on. Four members are drawn
  for each rule. The generator deliberately plants overlap traps, meaning
  numbers that satisfy a rule they are not assigned to, because a puzzle with
  no overlap is a sorting exercise rather than a deduction.
- **Verification.** Exhaustive search over all partitions of the sixteen
  numbers into four groups of four, checking that exactly one partition is
  valid under the rule library. That is 2,627,625 partitions, which is a
  fraction of a second per puzzle in Node and is the entire reason this
  candidate is admissible under 7.1.4 while a Connections style word game is
  not: uniqueness here is a computation, not an editor's judgment. Difficulty
  is the count of planted overlaps, banded by weekday.
- **Failure model.** Pass or fail with four mistakes allowed, which is the
  convention players already know from the genre.
- **Share encoding.** One row per guess made, in order. Each row is four cells
  carrying the tier token for the group that guess belonged to, or four `miss`
  tokens for a wrong guess. Groups are never named and the rules are never
  shown, so the block is spoiler free. Maximum eight guesses, which is four
  correct plus four mistakes, so the block fits inside the cap exactly.

### Candidate 4, LADDER

- **Rule sentence.** Reach each of three targets by combining six drawn numbers
  with plus, minus, times, and divide.
- **Cognitive mode.** Arithmetic and sequence reasoning.
- **Session length.** Sixty to ninety seconds. Together with ECHO this
  satisfies the first half of 7.1.2.
- **Generation.** Seeded draw of six numbers from a weighted pool of small
  numbers and a few large ones, plus three targets in the hundreds.
- **Verification.** Exhaustive expression search over all orderings and
  operator choices, which is a well bounded search for six operands. The
  verifier asserts every target is exactly reachable, records the shortest
  solution length, and counts distinct solutions. Difficulty is the count of
  distinct exact solutions for the hardest target, banded by weekday, so a
  Monday has many routes and a Saturday has few.
- **Failure model.** Continuum. Three targets, each scored on exactness and on
  how few of the six numbers were used, so a player who misses by two still
  scores. No failure state.
- **Share encoding.** Three rows, one per target, each a five cell meter filled
  with that target's tier token. Five lines total, the shortest block in the
  suite.

### Candidate 5, ECHO

- **Rule sentence.** Study a pattern of lit cells, then reproduce it from
  memory, three times, with the pattern growing denser each round.
- **Cognitive mode.** Pattern and memory recall.
- **Session length.** Forty to sixty seconds. This is the suite's sub minute
  game.
- **Generation.** Seeded selection of lit cells on a five by five grid across
  three rounds, at rising density.
- **Verification.** Patterns are checked against structural properties rather
  than solved, because there is nothing to solve. The verifier rejects a
  pattern that is symmetric under any reflection or rotation, that is a pure
  row or column fill, or whose lit cells are all contiguous, since each of
  those collapses the memory task into a one word description. Difficulty is
  the total lit cell count across the three rounds, banded by weekday.
- **Failure model.** Continuum, scored on cells recalled correctly across the
  three rounds. Chosen over sudden death deliberately, see candidate 6.
- **Share encoding.** Three rows, one per round, each a five cell meter filled
  with that round's tier token.
- **Accessibility note.** The study phase is a fixed duration with a visible
  countdown and a replay control that costs score rather than being forbidden.
  There is no reaction time component anywhere, which is what keeps this game
  playable under `prefers-reduced-motion` and with a screen reader.

### Candidate 6, DRIFT, rejected

- **Rule sentence.** Repeat a growing sequence of lit cells until you miss.
- **Why it loses to ECHO.** Same cognitive mode, so 7.1.1 admits only one of
  them. DRIFT is the more familiar shape and the more addictive one, and it is
  rejected anyway for two reasons. First, sudden death on a memory slip
  produces a share block that says nothing about the day's puzzle, only about
  the player's night, which weakens the one thing the suite is built to
  distribute. Second, a growing sequence is inherently a timing exercise, and a
  timing exercise cannot be made properly accessible without becoming a
  different game.

### Candidate 7, GRIDLOCK, rejected

- **Rule sentence.** Fill the grid so every row and column matches its number
  clues.
- **Why it is rejected.** A nonogram is a genuinely excellent daily puzzle and
  it verifies beautifully, since unique solvability by pure line logic is a
  standard checkable property. It loses on two counts. Its mode is deduction,
  which CIPHER holds, and while deduction from static constraints and deduction
  from interactive feedback are arguably distinct, they are not distinct enough
  to survive the "no two games exercise the same core skill" test in front of a
  player. Its session length is also six to twelve minutes, which collides with
  POKER GRID at the long end of 7.1.2 and would give the suite two games nobody
  opens on a weekday morning.
- **Reconsider it if** the slate ever drops POKER GRID's long session slot, or
  if the suite grows past five.

### Candidate 8, FIT, rejected

- **Rule sentence.** Pack the given polyomino pieces into the outlined shape.
- **Why it is rejected.** Pure spatial planning, which POKER GRID holds. It is
  the cleanest generation and verification story of any candidate here, since
  a tiling is produced by construction and verified by exact cover search, and
  none of that matters against 7.1.1.

### Candidate 9, WORDLINE, rejected

- **Rule sentence.** Guess the five letter word in six tries, with each guess
  telling you which letters are right and which are in the wrong place.
- **Why it is rejected.** Same mode as CIPHER, and CIPHER wins the slot for
  three reasons. It is not the thing everybody has already played. It carries
  no word list to curate, no offensive word screen to maintain, and no
  vocabulary fairness problem across dialects. And it is the only one of the
  two that survives Section 11.7 cleanly: a word game is a localization
  obligation the moment anyone outside English opens it, and the suite has
  explicitly deferred localization.
- **Note.** Public domain word lists are permitted by 7.1.5, so this rejection
  is a design choice and not a constraint. It is the candidate most likely to
  be raised again.

### Candidate 10, SPECTRUM, rejected

- **Rule sentence.** Put five quantities in order from smallest to largest.
- **Why it is rejected.** Violates 7.1.4 outright. Interesting quantities come
  from a curated fact source, which is daily content cost wearing a procedural
  costume. Generating quantities procedurally produces a puzzle that is either
  arithmetic, which LADDER already holds, or arbitrary.

## 3. The recommended slate

| Slot | Game | Mode | Session | Failure | Status |
|---|---|---|---|---|---|
| 1 | POKER GRID | Spatial planning | 3 to 5 min | Continuum | Built |
| 2 | CIPHER | Deduction from feedback | 90 s to 2 min | Pass or fail | Phase 11, the abstraction test |
| 3 | RULE OF FOUR | Categorization | 2 to 3 min | Pass or fail | Phase 13 |
| 4 | LADDER | Arithmetic and sequence | 60 to 90 s | Continuum | Phase 13 |
| 5 | ECHO | Pattern and memory recall | 40 to 60 s | Continuum | Phase 13 |

Section 7.1 conformance:

1. **Distinct cognitive mode.** Five modes, five games, one each, no overlap.
2. **Distinct session length.** Forty seconds at the short end, five minutes at
   the long end, with three games in between. Both halves of 7.1.2 are met.
3. **Distinct failure feel.** Three continuum games and two pass or fail games.
4. **Zero daily content cost.** Every one generates from a seed and verifies by
   a checkable property, and the verification for each is named above.
5. **Zero licensing exposure.** Playing card ranks, six geometric shapes, and
   integers. No word list, no image, no audio, no proper noun.
6. **One rule sentence.** Each is stated above and each fits a hub card.

### Why CIPHER is game two

Section 7.4 makes game two the architecture's trial, and the right game two is
the one least like game one, because a second game that resembles the first
proves nothing about the contract. CIPHER differs from POKER GRID on every axis
the contract touches:

- Its input is a small fixed palette rather than a lattice, so it exercises the
  `custom` branch of `InputDescriptor` that `toy-tap` only gestures at.
- It has a genuine failure state, so `hasWinLoss` is true for the first time and
  the win rate row of requirement 3.4 renders for the first time.
- Its distribution buckets are guess counts rather than a remainder ladder.
- Its puzzle is a few bytes rather than a 35 cell board, which is the case that
  will reveal whether the manifest and chunking machinery assumes POKER GRID's
  size anywhere.
- It has no gravity, no settling, and no board mutation, so `apply` returns a
  new state that is almost entirely append only.

If the engine survives that, the contract is real. If game two were FIT or
GRIDLOCK, both grid games with a heavy board state, the abstraction test would
pass without proving anything.

## 4. What approval decides

Approving this document sets four things and nothing else:

1. The four game names and their ids, which become storage key namespaces and
   RNG stream names and are therefore expensive to change after launch.
2. Which game is built in Phase 11 as the abstraction test.
3. The order of the remaining three in Phase 13.
4. The five hub entries, which Phase 10 ships as data in `src/shell/registry.ts`
   with the four unbuilt games marked `planned`. Changing the slate later is a
   one line edit to that file until a game is actually built.

Nothing in this document commits to a rule detail beyond the one sentence rule.
Each game gets its own design document at its own phase, in the way POKER GRID
got `POKER-GRID.md` at Phase 2.
