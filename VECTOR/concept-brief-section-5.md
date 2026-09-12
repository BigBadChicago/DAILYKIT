## 5. PUZZLE SUBSTRATES

### 5.1 The substrate is a separate axis from the mode

A concept has a **cognitive mode**, what the player's mind does, and a **substrate**, what the puzzle is made of. Numbers, letters, words, arithmetic, playing cards, abstract shapes, positions on a lattice, and relations in a graph are all substrates, and the same mode can run on any of them. Constraint satisfaction on numbers and constraint satisfaction on shapes are the same game wearing different clothes.

Abstract shapes are the default because they carry no licensing debt, no translation debt, and no prior knowledge gate. They are also the reason a suite of these games tends to look like one game on a hub page. Numbers and letters open a much wider space, and they cost something specific. This section says what each costs so you can choose deliberately rather than defaulting.

Some well known puzzle types are published commercially under proprietary genre names. Mechanics are not protectable, but this document describes those structures rather than naming them, and a concept should do the same and flag the resemblance in its risks.

### 5.2 The four gates every substrate must pass

Before proposing anything in a substrate, check it against these. They are where substrate choices fail, and they fail at different gates.

**Gate 1, a decomposable result.** The share block needs parts. A puzzle with one monolithic answer produces a block that says only "solved" or "not solved", which is a dead block whatever the glyphs. Games in this genre solve it three ways: multiple attempts, so the block shows the history; multiple named parts, so the block shows a per part outcome; or a continuum score, so the block shows a meter. If your substrate produces a single indivisible answer and you cannot supply one of those three, the concept is dead at section 9 regardless of how good the puzzle is.

**Gate 2, an emergent measure that bands.** Section 7 applies without exception. A substrate that makes puzzles easy to generate often makes them hard to grade, and vice versa.

**Gate 3, verification that proves fairness and not merely uniqueness.** Section 6, V1. Some substrates hand you this for free and some make it nearly impossible. It is the single strongest reason to prefer one substrate over another.

**Gate 4, content debt.** Three kinds, all of which fall due later rather than at concept time:

- **Translation debt.** A game built on English words is an obligation the day anyone outside English opens the site. Localization is deferred on this platform, which means a word game is a promise to either translate or exclude.
- **Prior knowledge debt.** If a player must already know something the one sentence rule cannot carry, the rule sentence is a lie. Chess piece movement, logic gate behaviour, and musical interval names all fail here. Vocabulary is the interesting edge case: it is a knowledge gate, but it is one the genre has normalised, so a word game may take it where a chess game may not.
- **Input debt.** The platform supplies a keyboard cursor for a rectangular grid and nothing else. A game whose input is typing letters must build its own on screen keyboard, which is a substantial piece of UI, must handle it at 360 pixels alongside the board, and must make it work for screen readers. Budget for it explicitly.

### 5.3 Numeric substrates

Numbers are the strongest substrate on this platform, because arithmetic is universal, needs no translation, has no licence, and because numeric constraints are exactly what constraint propagation is good at, which is what makes gate 3 cheap.

**A. Constraint grids.** A lattice where each cell takes a value, and rules relate cells: values unique along a line, groups of cells summing to a stated total, ordering relations between neighbours, counts of what is visible along a sightline, parity or divisibility conditions on a region.

- *Generation.* Build a valid filled grid first, then remove or weaken clues while the puzzle still solves. Carving, not sampling, and the yield is good.
- *Verification.* A solver forbidden from guessing either resolves the grid or fails. This is the best position in section 6: uniqueness and fairness proved in one pass.
- *Difficulty.* Not the number of clues, which is a chosen parameter and fails D2. Use something the solving pass measures: the cumulative depth at which cells resolve, or which classes of deduction the pass had to use.
- *Share.* A per row or per region outcome, or a meter of cells resolved unaided.
- *Risk.* This is the most crowded structure in the genre and section 11 rejects a reskin of it outright. The core decision the player makes must be genuinely new, not the same deduction with a different relation printed on it.

**B. Expression building against a target.** Given a handful of numbers, combine them with arithmetic to reach a stated total.

- *Measured.* Over 400 random four number, one target puzzles with values 1 to 9 and targets 10 to 60: 34 percent have no solution at all and are rejected outright; of the rest, the count of distinct solutions runs from 1 to over 40, with 47 having exactly one.
- *Generation.* Sample and reject, at roughly two in three. Cheap and honest.
- *Verification.* Exhaustive enumeration of every expression tree over the given numbers. Small, complete, no heuristic anywhere, which is the strongest verification claim any substrate offers.
- *Difficulty.* The count of distinct solutions, fewer being harder. Emergent, measured by the same enumeration, and the measured spread supports seven bands. A one solution day is genuinely hard and a forty solution day is a warm up.
- *Share.* Needs several targets in a day to decompose, one row per target, or a count of targets reached.
- *Risk.* Trial and error rather than reasoning, unless the day's structure rewards a plan. And a player who finds one solution stops, so the interesting fact, that there was exactly one, never reaches them.

**C. Alignment and search over a small state space.** Sliding, rotating, or offsetting a small number of components until several stated conditions hold at once. The whole state space is enumerable, often in the low thousands.

- *Verification.* Enumerate every state, assert exactly one satisfies all conditions. No solver, no heuristic, no tolerance.
- *Difficulty.* The count of near misses, states satisfying all but one condition. Emergent and free from the same enumeration. **Warning, and this is the trap in this family:** the near miss count collapses toward zero when the numbers involved range widely, because collisions become rare. The numeric range is part of the difficulty design, not a matter of flavour, and a concept in this family must say what range it uses and why.
- *Share.* A meter on moves above the minimum, or a per condition profile.

**D. Digit substitution.** Symbols stand for digits in an arithmetic statement, and the player recovers the mapping.

- *Verification.* Constraint propagation over the digit assignment, or exhaustive search over a small factorial space. Proves both gates cheaply.
- *Difficulty.* Propagation depth, or the number of symbols forced before a choice is needed.
- *Note.* The symbols do not have to be letters spelling words. Using abstract symbols removes the translation debt entirely and loses only a flourish.

**E. Modular and positional arithmetic.** Base conversion, clock arithmetic, digit sum rules, place value manipulation. Verification is trivial, generation is trivial, and the risk is that the game is a drill rather than a puzzle. Needs a genuine decision on top of the arithmetic.

**F. Sequence extrapolation, and why to be careful.** Continue the pattern is a classic and it fails gate 3 badly: infinitely many rules fit any finite prefix, so a verifier cannot prove that the intended rule is the only reasonable one, and a player who finds a different consistent rule is right and is marked wrong. Only propose this with a mechanism that makes the intended rule provably forced, and if you have one, lead with it.

### 5.4 Letter and word substrates

Pay the three debts in section 5.2 gate 4 up front, then read on. Word games are viable here and they are not free.

The key move that makes a word game work on this platform is to use the dictionary as a **membership test only**. Is this string a word, yes or no. That is machine checkable, needs no meanings, needs no hand written associations, and satisfies C1 with a public domain frequency ranked list. The moment a concept needs to know what a word means, or that two words are related, it needs a hand built table and section 11 rejects it.

**A. Graph distance over a word list.** Words are vertices, an edge joins two words differing in one letter, and the puzzle is a transformation from one word to another.

- *Measured, on a public domain list.* Four letter words: 3,755 entries, mean degree 8.9, 153 isolated. Shortest path lengths between random connected pairs: 2 in 2 percent of pairs, 3 in 7, 4 in 17, 5 in 24, 6 in 22, 7 in 14, 8 in 8, 9 in 4, longer in the tail. Five letter words are sparser, mean degree 2.9, with paths running out to 33 steps, which is too long to play.
- *Why this is a strong candidate.* The verification is a breadth first search, which is exhaustive, exact, and fast. It proves solvability and gives the exact optimal length in the same pass, which is gate 3 satisfied completely. The difficulty measure is the optimal path length, which is emergent, is an integer from the verifying pass, and the measured distribution over four letter words spreads smoothly across the playable range of three to nine. Every gate passes on measured evidence rather than on hope.
- *Share.* A meter on steps above the optimum, or one row per step taken.
- *Risk.* Vocabulary gate, so a player with a smaller vocabulary hits a wall the puzzle cannot see. And the dictionary's edges are invisible, so a player can be stuck without knowing whether they are stuck at a dead end or at their own recall.

**B. Construction from a fixed letter set.** Given a small set of letters, build as many valid words as possible under a stated rule.

- *Verification.* Enumerate every subset or arrangement against the list. Complete.
- *Difficulty.* The count of valid words available, which is emergent and spreads widely.
- *Risk.* Close to a well known commercial daily product, so flag the resemblance. Also a long tail problem: the last few words are found by grinding, which fights C11.

**C. Meaning free letter manipulation.** Anagram distance, letter position arithmetic, rearrangement under constraints. The letters are tokens and the dictionary is the only semantic input. Cheap to verify, and it sidesteps the vocabulary gate to the degree that the puzzle is about the letters rather than about knowing words.

**D. Deduction against a hidden word with deterministic feedback.** The Wordle structure. Permitted by C4 and thoroughly explored, so a concept here must bring a new core decision rather than a new feedback colour.

**E. Fitting words into a shape.** Placing words into a grid so that crossings agree, with no clues and no meanings, just membership and geometry. Verification is a constraint search. Difficulty is the count of valid completions or the propagation depth. Watch C6: a grid of letters at 360 pixels is tight, and watch gate 1, since the result may be monolithic.

**F. Semantic association.** Rejected by C1. Not a judgment on the format, which is excellent, but on the fact that it needs an editor every day.

### 5.5 Substrates that are neither numbers nor letters

- **Ordering and ranking.** Arrange items to satisfy stated relations. Verification is topological, difficulty is the count of consistent orderings, input is reordering, which is a gesture most suites lack. Watch C1: the items must be orderable by something computable, not by a curated fact.
- **Graph and network structure.** Connect nodes under degree, crossing, or loop constraints. Rich, propagation friendly, and heavily represented in published catalogues under proprietary names, so check the resemblance.
- **Geometry with numbers.** Areas, tilings, reflections, sightlines. Verification depends entirely on the rule set. Watch C6 hard: geometric puzzles are where 360 pixels stops being enough.
- **Cards.** Ranks and suits are licence free and carry a ready made ordering most players already know, which is a rare free lunch on gate 4.
- **Colours alone.** Rejected by C8 unless shape or symbol carries the same information, which usually means the colour was decorative.

### 5.6 Mixing substrates

Two substrates in one game usually means two rule sentences, which fails C10. The exception is when one substrate is the board and the other is the value, numbers placed on a lattice being the obvious case, where the player experiences one rule and not two. If your concept mixes, state which substrate the rule sentence is about and confirm the other is invisible in it.

### 5.7 What to state in the concept

Add a SUBSTRATE line naming the material and, in the same line, which of the four gates in 5.2 it makes hardest. That is usually the honest summary of the concept's main risk.
