# DAILY PUZZLE GAME CONCEPT SPECIFICATION

**Instructions for the human using this document.**

Paste everything from "BEGIN PROMPT" to the end into a fresh conversation with any assistant. It carries every constraint needed to judge whether a game concept will actually run, so the assistant needs no access to a repository, a codebase, or any prior conversation.

Section 0 is the part that changes between commissions. Edit it before pasting. Do not move it above BEGIN PROMPT: it has to travel with the rest of the document, and the first round of this exercise failed partly because it did not.

---

BEGIN PROMPT

## 0. THIS COMMISSION

```
NUMBER OF CONCEPTS WANTED:       sixteen

NUMBER TO RECOMMEND:             five, ranked, each judged on its own merits

PLATFORM URL FOR SHARE DRAFTS:   dailykit.providentia.games
```

**There are no slots to fill.** Judge every concept on whether it is a good daily puzzle game that this platform can generate, verify, band, and share. Do not judge it on whether it fits a gap, complements something else, or balances a lineup. Which concepts eventually ship together is decided later, by someone holding the whole pool, and that decision is not yours to anticipate.

**What already exists on the platform, for context only.** One game where the player drags a path across a grid of playing cards under spatial consequence, three to five minutes, scored on a continuum. One where the player taps grid cells to cycle a value until every constraint on a static board is satisfied, two to four minutes, pass or fail. One where the player breaks a hidden code from deterministic feedback, ninety seconds to two minutes, pass or fail. Two more are designed but unbuilt, one on arithmetic search and one on pattern recall.

That list exists so you do not hand back something already built, not to fence off territory. **Overlap is allowed and sometimes wanted.** A concept in a mode already represented is welcome if it is better than what is there, and saying plainly that it is better, and why, is more useful than avoiding the area. The only thing genuinely unwelcome is re-deriving one of those games with cosmetic changes.

A concept that opens a mode nothing above touches is especially valuable, but not because a slot is empty. It is valuable because unexplored ground is where the good ones tend to be.

## 1. YOUR TASK

You are a game designer. Invent original **daily puzzle game concepts** for a platform described below.

Produce the number of concepts named in Section 0, then rank them and recommend as Section 0 directs. Do not write code. Do not write an implementation plan. Concepts and analysis only.

Do not ask clarifying questions. Every constraint you need is in this document. Where it is silent, make a choice, state the choice inside the concept, and move on.

Weight generation and verification heavily. They are where daily puzzle games actually die, and a concept whose verification step is hand waved is worth nothing because it cannot ship.

## 2. WHAT A DAILY PUZZLE GAME IS

The genre defined by Wordle, Connections, Strands, Waffle, Worldle, and the Mini Crossword. Its defining properties:

1. One puzzle per calendar day.
2. The identical puzzle for every player worldwide.
3. A short session, played once and then finished until tomorrow.
4. A permanent streak that a missed day breaks.
5. A result that compresses into a small block of symbols a player can paste into a group chat without spoiling the answer for anyone who has not played yet.

The fifth property is the one that matters most. The share block is the platform's only distribution: there is no advertising, no feed, and no recommendation engine. A game whose result cannot be encoded spoiler free is not a daily game, however good it is otherwise.

## 3. WHAT THE PLATFORM ALREADY PROVIDES

The engine handles all of the following, for every game, at no cost to you. **Do not propose any of it as a feature of your concept.** Proposing engine behaviour as game design is the single most common failure in this exercise.

1. Daily puzzle numbering, local midnight rollover, clock jump handling, and a countdown to tomorrow.
2. Save and resume of a game in progress, including migration of saved data across schema versions.
3. Streaks, both per game and across the whole suite, and a statistics panel with a result distribution histogram.
4. Share block assembly and delivery, including the native mobile share sheet, clipboard fallbacks, and padding every row to the same width.
5. An archive of past puzzles, played without affecting streaks or statistics.
6. Light, dark, and high contrast theming, and a reduced motion setting.
7. Onboarding panel, help panel, modals, toasts, page header, and all page chrome outside the play area.
8. Offline play after first load, and a service worker.
9. Keyboard navigation of a rectangular grid, including a cursor, focus management, and screen reader announcements, if your game declares itself as a grid game.
10. A precomputed manifest of at least a year of puzzles, generated and checked in continuous integration, plus a fallback path that generates a puzzle in the browser past that horizon.

Your job is to invent the thing in the middle of the screen: the board, the rules, and the day's puzzle.

## 4. HARD CONSTRAINTS

A concept that violates any of these is rejected outright. Check each before writing the concept down.

**C1. Zero daily content cost.** Every puzzle is produced by an algorithm from a single integer seed. No human authors, curates, selects, edits, or reviews anything on a daily basis, ever. This eliminates trivia, editorial word association, image identification, anything built on a curated feed, and anything requiring a hand written table of meanings, associations, or themes. A frequency ranked public domain word list is permitted. A hand written thesaurus of themed groups is not.

**C2. Machine verifiable fairness.** Before a puzzle ships, a program must prove three things: that it is solvable, that it sits in the right difficulty band, and, where uniqueness matters, that no unintended second solution exists. "A human would check it" is not an answer. Section 7 sets the standard in full.

**C3. No server, no accounts, no network.** The whole game is static files in a browser. No database, no login, no cloud save, no multiplayer, no leaderboard, no live data. Nothing may depend on other players or on anything that changes after the puzzle ships.

**C4. Perfect information, no hidden randomness during play.** Randomness generates the puzzle. It never intervenes once play begins. Nothing is revealed by chance mid game and no outcome depends on a roll. Hidden information given as deterministic feedback, in the Wordle or Mastermind style, is permitted, because the answer is fixed before play begins and the feedback is a function of the player's own move.

**C5. Discrete turns, no reflexes.** All input is discrete: taps, drags between cells, selections, reordering, text entry. No timing, no reaction speed, no continuous motion, no physics, and no animation that affects the rules. A timer may be displayed but must never change the outcome.

**C6. Mobile portrait first.** The play area is roughly 360 pixels wide by 520 tall. Everything essential fits without scrolling and without pinch zoom. Touch targets are at least 44 by 44 pixels, which caps a comfortable grid at about seven columns and makes anything smaller than a fingertip unreadable at arm's length.

**C7. No licensed or proprietary content.** Permitted: numerals, arithmetic, geometry, abstract shapes, letters, playing card ranks and suits, chess pieces, colours, musical intervals, arrows, and public domain word lists. Forbidden: real people, brands, films, music recordings, maps of disputed territory, and any copyrighted work. Also flag, in the concept's risks, any mechanic that closely resembles a commercial puzzle product sold under a proprietary genre name, even though mechanics are not protectable, because the resemblance is exposure the platform would rather not take.

**C8. Never colour alone.** Any information carried by colour is also carried by shape, position, or symbol.

**C9. A spoiler free share block.** At most nine lines including the title and the link, every row the same visual width, communicating how well the player did and revealing nothing about the solution. Section 10 sets the format.

**C10. One sentence rules.** If you cannot state how to play in one sentence a stranger understands, the concept is rejected. Length of explanation is the best single predictor of whether a daily game acquires players.

**C11. Session length between thirty seconds and six minutes.** Shorter feels like nothing happened. Longer will not be repeated three hundred days running.

**C12. Small state.** The complete saved state of a game in progress fits in a few kilobytes of plain JSON, and every field in it is something the rules need. State that could be recomputed from the rest should be recomputed rather than stored.

**C13. No dead first move.** No single wrong early action may make the rest of the day unplayable or unshareable. Every session must end in a result worth sharing, whether that is a win, a loss, or a score.

**C14. Cross platform determinism.** The same seed produces a byte identical puzzle in a browser and in a build script, on every device, forever. Concepts that lean on floating point arithmetic, hash functions with platform variation, or iteration over an unordered collection must say how they stay deterministic.

**C15. Both hands of the input must work.** Whatever the primary gesture is, the game must also be fully playable by keyboard, one discrete action at a time, with each action announceable in a short sentence. A concept whose core gesture cannot be decomposed into discrete keyboard actions is rejected.

**C16. The player must be able to check their own work.** Wherever a game withholds correctness feedback until the player commits, the information needed to verify an answer must be present on screen. It is acceptable to make a player count. It is not acceptable to make them guess.

## 5. PUZZLE SUBSTRATES

### 5.1 The substrate is a separate axis from the mode

A concept has a **cognitive mode**, what the player's mind does, and a **substrate**, what the puzzle is made of. Numbers, letters, words, arithmetic, playing cards, abstract shapes, positions on a lattice, and relations in a graph are all substrates, and the same mode can run on any of them. Constraint satisfaction on numbers and constraint satisfaction on shapes are the same game wearing different clothes.

Abstract shapes are the default because they carry no licensing debt, no translation debt, and no prior knowledge gate. They are also the reason a suite of these games tends to look like one game on a hub page. Numbers and letters open a much wider space, and they cost something specific. This section says what each costs so you can choose deliberately rather than defaulting.

Some well known puzzle types are published commercially under proprietary genre names. Mechanics are not protectable, but this document describes those structures rather than naming them, and a concept should do the same and flag the resemblance in its risks.

### 5.2 The four gates every substrate must pass

Before proposing anything in a substrate, check it against these. They are where substrate choices fail, and they fail at different gates.

**Gate 1, a decomposable result.** The share block needs parts. A puzzle with one monolithic answer produces a block that says only "solved" or "not solved", which is a dead block whatever the glyphs. Games in this genre solve it three ways: multiple attempts, so the block shows the history; multiple named parts, so the block shows a per part outcome; or a continuum score, so the block shows a meter. If your substrate produces a single indivisible answer and you cannot supply one of those three, the concept is dead at section 10 regardless of how good the puzzle is.

**Gate 2, an emergent measure that bands.** Section 8 applies without exception. A substrate that makes puzzles easy to generate often makes them hard to grade, and vice versa.

**Gate 3, verification that proves fairness and not merely uniqueness.** Section 7, V1. Some substrates hand you this for free and some make it nearly impossible. It is the single strongest reason to prefer one substrate over another.

**Gate 4, content debt.** Three kinds, all of which fall due later rather than at concept time:

- **Translation debt.** A game built on English words is an obligation the day anyone outside English opens the site. Localization is deferred on this platform, which means a word game is a promise to either translate or exclude.
- **Prior knowledge debt.** If a player must already know something the one sentence rule cannot carry, the rule sentence is a lie. Chess piece movement, logic gate behaviour, and musical interval names all fail here. Vocabulary is the interesting edge case: it is a knowledge gate, but it is one the genre has normalised, so a word game may take it where a chess game may not.
- **Input debt.** The platform supplies a keyboard cursor for a rectangular grid and nothing else. A game whose input is typing letters must build its own on screen keyboard, which is a substantial piece of UI, must handle it at 360 pixels alongside the board, and must make it work for screen readers. Budget for it explicitly.

### 5.3 Numeric substrates

Numbers are the strongest substrate on this platform, because arithmetic is universal, needs no translation, has no licence, and because numeric constraints are exactly what constraint propagation is good at, which is what makes gate 3 cheap.

**A. Constraint grids.** A lattice where each cell takes a value, and rules relate cells: values unique along a line, groups of cells summing to a stated total, ordering relations between neighbours, counts of what is visible along a sightline, parity or divisibility conditions on a region.

- *Generation.* Build a valid filled grid first, then remove or weaken clues while the puzzle still solves. Carving, not sampling, and the yield is good.
- *Verification.* A solver forbidden from guessing either resolves the grid or fails. This is the best position in section 7: uniqueness and fairness proved in one pass.
- *Difficulty.* Not the number of clues, which is a chosen parameter and fails D2. Use something the solving pass measures: the cumulative depth at which cells resolve, or which classes of deduction the pass had to use.
- *Share.* A per row or per region outcome, or a meter of cells resolved unaided.
- *Risk.* This is the most crowded structure in the genre and section 12 rejects a reskin of it outright. The core decision the player makes must be genuinely new, not the same deduction with a different relation printed on it.

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

The key move that makes a word game work on this platform is to use the dictionary as a **membership test only**. Is this string a word, yes or no. That is machine checkable, needs no meanings, needs no hand written associations, and satisfies C1 with a public domain frequency ranked list. The moment a concept needs to know what a word means, or that two words are related, it needs a hand built table and section 12 rejects it.

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

**F. Semantic association.** Rejected by C1. Not a judgement on the format, which is excellent, but on the fact that it needs an editor every day.

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

## 6. GENERATION REQUIREMENTS

Every concept states how a program builds the day's puzzle from a seed, and names the algorithm rather than gesturing at one.

**G1. Name the strategy, and be honest about its yield.** There are three broad approaches and they are not equally safe.

- **Direct construction.** Build a valid puzzle by construction, so every attempt succeeds. Safest and rarest.
- **Rejection sampling.** Generate at random, test, discard failures, repeat. Simple, and the most common way a concept dies quietly. Estimate the acceptance rate. If it is below roughly one in a thousand, the strategy does not work and you must say so.
- **Search or carving.** Start from something valid but crude, then transform it, keeping each transformation that preserves validity. Usually the answer when rejection sampling collapses, and usually more code.

**G2. Estimate the acceptance rate explicitly.** Say roughly what fraction of generated candidates you expect to survive verification, and on what reasoning. A concept that expects one in five is fine. One in fifty is fine. One in fifty thousand needs a different strategy, and noticing that at concept time rather than at build time is most of the value of this exercise.

**G3. The generator must be reproducible from the seed alone.** Whatever the search does, replaying the same seed replays the same decisions in the same order. Any parameter the generator chooses must come from the seed, never from a clock, a machine, or an environment variable.

**G4. The generator must be affordable twice.** Once in a build script producing a year of puzzles, which may take minutes. Once in the browser as a fallback past the horizon, which must complete in well under a second on a mid range phone. If your generation is too heavy for the second, say so, and say what the browser does instead.

**G5. Record the levers.** Whatever knobs the generator turns for a given day should be recordable as a short list of names, so a day's difficulty can be audited later. Name the vocabulary of levers your concept would use.

**G6. Census the state space.** Say how many distinct puzzles the game can ever produce, and divide by 365. A game whose mechanics permit only a few hundred genuinely different days repeats inside two years, and that number is often far smaller than the raw combinatorics suggest, because a restricted move set or a symmetry collapses most of the apparent space. Compute it from the mechanics rather than from the board size. If the answer is under about three thousand, say so plainly and say what widens it.

## 7. VERIFICATION REQUIREMENTS

This is the section most concepts fail. Read it twice.

**V1. Uniqueness and fairness are different claims.** A puzzle can be uniquely solvable and humanly impossible. Proving that exactly one answer exists says nothing about whether a person could ever find it by reasoning. State which of the two your verifier proves, and if it proves only uniqueness, say so plainly rather than letting the word "verified" cover the gap.

The strongest position a concept can be in is one where the two proofs are the same pass: a solver that is forbidden from guessing either resolves the puzzle, which proves both at once, or fails, which rejects the puzzle. If your concept can be arranged to have that property, arrange it, and say so.

**V2. Name the algorithm and its cost.** Exhaustive enumeration, constraint propagation, backtracking with pruning, beam search with a stated width. Give the size of the search space and a rough worst case. If a full search is impractical and a bounded search is used instead, every value it produces must be labelled "best known" rather than "optimal", in the data and in anything the player sees.

**V3. Prefer verification that is independent of the generator.** If the same code both makes the puzzle and certifies it, a bug in that code produces a confidently wrong certificate. Where an independent second check is cheap, describe it. Where it is not, say why.

**V4. Verify the boring properties too.** Structural invariants, not just the interesting claim. Board size, legal value ranges, no duplicate puzzle inside the year, every piece reachable, and so on. A verifier that only checks the clever property has nothing to say when a dull assumption breaks.

**V5. A verification that passes almost everything is not a verification.** If your screening rules reject two percent of candidates, they are decoration. State roughly what fraction you expect each rule to reject, and drop the rules that reject nothing.

**V6. Check that the puzzle does not decompose.** A puzzle whose constraints split into independent groups is not one puzzle, it is several tiny ones side by side, and the chaining that makes deduction satisfying never happens. The test: take a constraint at random, and ask whether solving it requires knowing anything outside itself. If most constraints are individually solvable, the concept has no chain, and its difficulty measure will show it by resolving almost everything in the first pass. State the result of this check.

**V7. Check the scoring for symmetries.** If a scoring function is invariant under some transformation of the answer, then a unique optimum is impossible and any structural check demanding one is unsatisfiable. Reversal is the usual culprit: a score summed over adjacent pairs of a symmetric relation gives an arrangement and its reverse the same total, forever. Rotation, reflection, and relabelling do the same thing in other shapes. Name any symmetry your scoring has, or state that you looked and found none.

## 8. DIFFICULTY REQUIREMENTS

Puzzles run on a weekly curve, gentler early in the week and harder later, which is the convention players already expect. That requires seven difficulty bands and about fifty two puzzles a year in each. Most concepts that die at build time die here, so this section is a hard gate.

**D1. Name one difficulty measure, and make it an integer.** One number, produced by the same pass that verifies the puzzle, so verification reproduces it exactly with no tolerance and no floating point comparison.

**D2. The measure must be emergent, not chosen.** It must be something the verifier **measures** about a finished puzzle, not a parameter the generator was **told** to hit. If the generator is instructed to use twelve pieces and the difficulty is "number of pieces", then the band is satisfied by construction, the verifier's band assertion is vacuous, and the number is testing the plumbing rather than the puzzle. A chosen parameter can be a lever under G5. It cannot be the difficulty measure.

**D3. The measure must pass the bandability test.** State, for your measure, your best estimate of each of these, and say which you are least sure of:

- **Distinct values.** How many different values does it take across a large sample? Fewer than about fifteen and seven bands are in trouble.
- **Spread.** Where do the six septile boundaries fall? If two of them are equal, two bands are empty and the curve is broken.
- **Mass per band.** Multiply the acceptance rate from G2 by roughly one seventh. Is that still enough to produce fifty two puzzles a year in a reasonable amount of compute?

Two failure shapes are common enough to name. A measure that counts rounds, steps, or passes of an algorithm often takes only three or four values in practice, because the algorithm converges in a similar number of passes on almost every puzzle; a cumulative version of the same quantity, such as the mean step at which each piece was resolved, usually spreads smoothly where the maximum does not. And a measure that counts near misses or collisions often collapses to zero on most puzzles when some unrelated parameter, such as the range of numbers in play, is set too wide; the fix is to recognise that the parameter is part of the difficulty design and not a matter of flavour.

**D4. Say what makes Monday easy.** In one sentence, in the player's terms rather than the algorithm's. If you cannot describe the difference a player would feel between the gentlest and the hardest band, the measure may be real and still be measuring the wrong thing.

**D5. Justify the estimate, do not assert it.** A range with no reasoning behind it is worth nothing, and in the previous round of this exercise the four concepts with the most confident bandability claims were the four that failed hardest when the distributions were actually computed. For each of the three quantities in D3, either give the arithmetic that produces it, or describe in two sentences the sampling experiment that would produce it and say what you expect it to show. "Roughly twenty to a hundred and fifty distinct values" is not an estimate, it is a shrug.

## 9. THE TECHNICAL CONTRACT

Any game must be expressible as the following ten pieces. For each concept, satisfy yourself that all ten are straightforward, and flag any that is awkward. This is the real feasibility test, and a flagged piece is useful information rather than a failure.

1. **Identity.** A name, an accent colour, and the result tokens the share block uses.
2. **Puzzle from seed.** A pure function from an integer to that day's puzzle definition. Same integer, same puzzle, forever, on every device.
3. **State.** An initial state, and conversion to and from plain JSON. Deserialization validates against the day's puzzle and rejects anything malformed rather than trusting it.
4. **Action.** A pure function taking a state and one player action, returning either a new state or a refusal carrying a reason. No randomness, no clock, no screen access. **Enumerate every refusal your game can issue and the sentence each one announces.** A concept with no refusals has usually not been thought through.
5. **Terminal check.** A pure function from state to won, lost, or ongoing, plus a score. Say whether your game has a win and loss at all, or only a score.
6. **Share encoding.** A pure function from a finished state to rows of tokens plus a one line summary.
7. **Distribution buckets.** The labelled buckets results fall into for the histogram, between three and eight of them, with one optionally distinguished as the best outcome.
8. **Rendering.** How the board is drawn from state and updated when state changes. The engine draws everything outside the play area.
9. **Input declaration.** Either a rectangular grid, in which case the platform supplies the keyboard cursor and each cell gets exactly one activation verb, or a custom layout, in which case you handle keys yourself and must list them. If your grid cells need two different verbs, say so, because that is a real constraint and not an oversight.
10. **Help content.** A worked micro example that teaches the game in one screen with almost no prose, plus a plain text equivalent of that example for screen readers.

If a concept needs anything outside these ten, say so explicitly and explain what is missing.

## 10. SHARE BLOCK REQUIREMENTS

The share block is the platform's only distribution, so it is the most constrained thing you will design and also the place where a good concept most often earns its life. The constraints below are narrow where they have to be and open where they do not. Read the distinction, because concepts routinely refuse themselves over a rule that is not actually there.

### 10.1 Three rules that are genuinely hard

Everything else in this section is guidance.

**H1. Nine lines, including the title and the URL.** Blocks taller than about eight rows get truncated in link previews and in chat clients, and a truncated block is a block nobody shares.

**H2. Nothing in the block may be worked backwards into the answer.** Section 10.6 gives the test.

**H3. Every glyph you use must render as a picture, at a single character width, everywhere.** Section 10.5 gives the rule that guarantees this and the reason it is not negotiable.

### 10.2 The token vocabulary

Every game draws from one shared vocabulary, so that three different games' blocks read as siblings in a group chat. Use these names in your drafts, and the glyphs shown so the draft looks right when you paste it.

**The result ladder.** Five tokens, ordered best to worst. The workhorse.

| Token | Glyph | Means |
|---|---|---|
| best | ⭐ | the best outcome |
| strong | 🔷 | close to it |
| partial | 🟩 | a middling outcome |
| weak | 🟠 | a poor one |
| miss | 🔻 | failure |

**The meter.** Two tokens, for a proportion drawn as a bar.

| Token | Glyph | Means |
|---|---|---|
| barFull | 🟦 | one filled unit |
| barEmpty | ⬜ | one empty unit |

**Direction.** Four tokens, for relational feedback that a quality ladder cannot express, such as higher and lower, or nearer along an axis.

| Token | Glyph | Means |
|---|---|---|
| up | 🔼 | above, higher, or north |
| down | 🔽 | below, lower, or south |
| left | ⏪ | left, earlier, or west |
| right | ⏩ | right, later, or east |

**Structure.** One token, for a slot that carries no result.

| Token | Glyph | Means |
|---|---|---|
| unused | ⬛ | not attempted, skipped, or out of play |

Thirteen tokens. You may use any subset, and you may use tokens from more than one family in one block. A token must be used for something close to what its name says: `up` may mean "aim higher", it may not mean "your second guess".

### 10.3 Asking for a token that does not exist

The vocabulary is closed to invention, not to extension. If your concept genuinely needs something these thirteen cannot say, propose up to two additions in the concept, in this form:

```
TOKEN REQUEST: [name] [glyph] U+XXXXX
MEANS:         [one line]
WHY EXISTING TOKENS CANNOT SAY IT: [one or two sentences]
```

A proposed token must satisfy section 10.5 and must be distinguishable from every token it appears beside by **shape**, not only by colour. Requests that fail either test will be refused, so check both before asking. A concept that needs six new tokens has not been designed against this platform; a concept that needs one is normal.

### 10.4 Block grammars

The old version of this document implied one shape, a stack of rows, and concepts kept contorting themselves into it. There are at least six workable grammars. Pick the one that fits, or combine two.

**A. Attempt ladder.** One row per attempt, in the order the player made them, each row a fixed number of cells. The Wordle grammar. Best when attempts are few and each has an internal structure worth showing.

```
GAME 214 solved in 4
🔻🔻🟩🔻
🟩🔻🔷🔻
🔷🔷🟩🔻
⭐⭐⭐⭐
example.test
```

**B. Sequence ladder.** One row per move or hand played, each row a single token for the quality of that move. Best when the interesting fact is the shape of a run rather than the internals of any one step.

```
GAME 214 Great, streak 12
🔷
🟩
⭐
🟩
🟠
example.test
```

**C. Meter.** One or two rows of bar tokens showing a proportion. Best for a continuum score with no natural steps, and the only grammar that reads at a glance without counting.

```
GAME 214 Good
🟦🟦🟦🟦🟦🟦⬜⬜
example.test
```

**D. Profile.** One row, one cell per element of a fixed set the player worked through, in a fixed order that is not the order they played. Best when a game has a small number of named parts. Check 9.6 carefully: a fixed order leaks more than a play order does.

```
GAME 214 4 of 5
⭐🟩⭐🔻⭐
example.test
```

**E. Board snapshot.** A small rectangle of tokens standing in for a board state, usually the final one, at most seven rows by seven columns and usually much smaller. Best when the spatial shape of a result is the interesting thing. The most dangerous grammar for leaks.

```
GAME 214 Cleared 18 of 25
⬛⬛🟦⬛⬛
⬛🟦🟦🟦⬛
🟦🟦⬛🟦🟦
⬛🟦🟦🟦⬛
example.test
```

**F. Composite.** Rows in one grammar, then a single summary row in another, usually a meter. Best when a game has both a sequence and a total, and worth the extra line only when the two say different things.

```
GAME 214 Great, streak 12
🔷🔷🟩
⭐⭐🟩
🟦🟦🟦🟦⬜
example.test
```

Two rules across all six. A row holds at most eight tokens. Rows within a block may differ in length, and the platform pads them to the widest, so a ragged block is acceptable as long as the natural maximum stays under eight; but a grammar whose rows vary between two cells and eight will read as a mess whatever the padding does.

### 10.5 Glyph rendering

Every glyph must be a **single codepoint that is emoji presentation by default**. No variation selectors, no zero width joiner sequences, no skin tone modifiers, no flags, no keycap digits, and no glyph that some platforms render as text and others as a picture.

This is not fussiness. A codepoint that needs a variation selector to appear as a picture renders as monochrome text on some clients and at a different width on others, which breaks column alignment in exactly the group chat the block was pasted into, and it silently doubles the byte length of every row. Keycap digits are the classic trap: they look fine in a browser and fall apart in three of the eight target clients.

The thirteen tokens above are all vetted. If you propose one under 9.3, say which property makes you confident it qualifies.

### 10.6 The leak test

Run this against your drafted block before you write anything else about the concept. A block leaks if a reader who has not played today can learn anything about the answer from it.

Ask, in order:

1. **Does a cell's position in the block correspond to a position in the puzzle?** If cell three of row one means "the third letter" or "the third column", the block is a partial answer key and a friend who sees three of them has most of the puzzle. Either drop the correspondence or sort each row so position carries no meaning.
2. **Does the block reveal a count that the answer determines?** A row showing two exact matches tells a reader that two of their own candidate answers are wrong in a way they can act on. Counts of the player's own performance are safe. Counts of the answer's properties are not.
3. **Does the ordering of rows leak?** Play order is almost always safe, because it is the player's history. A fixed order, as in grammar D, is a property of the puzzle, so each cell is a fact about a known slot. Grammar D is fine when the slots are not themselves the thing to be discovered, and dangerous when they are.
4. **Does the block's shape leak?** In grammar E, the silhouette of a final board can be the board. Ask whether someone could reconstruct the starting position from the ending one.
5. **Does the title line leak?** A title carrying a tier or a count is normally fine. A title carrying anything derived from the puzzle rather than from the play is not.

State the result of this test in the concept, in one sentence, naming which of the five you had to think about. "Positions are sorted so cell order carries no meaning" is a good answer. "Spoiler free" on its own is not an answer.

### 10.7 The title line and the URL

The title carries the game name, the puzzle number, and a short result, and optionally a streak when it is worth boasting about. Keep the whole line under about fifty characters so it survives a preview.

The result on a title line is normally one of a five step tier ladder, plainspoken rather than triumphant, or a compact count such as "solved in 4" or "18 of 25". The platform supplies the tier names. Do not invent a scale of your own with more than five steps: a player cannot feel the difference between the fourth and fifth step of an eight step ladder, and neither can a reader.

The last line is the platform URL, supplied by the platform, and nothing else goes on it.

### 10.8 What to write in the concept

Every concept includes **a real drafted block, with real glyphs, exactly as it would be pasted into a chat**, for a good day. Not a description of a block. Not a table explaining what the tokens would be. The actual text.

Include a second drafted block for a bad day whenever the two would differ in shape rather than only in tokens, because a grammar that produces a satisfying win and a humiliating loss is a grammar that gets shared only half the time.

Then answer three things in one line each:

- **Grammar.** Which of A to F, or which combination.
- **Leak test.** Which of the five questions in 9.6 you had to think about, and what you did about it.
- **Range.** What the block looks like across the whole outcome space, in particular whether the best and worst days are distinguishable at a glance. A block where every possible day looks broadly the same is a block that says nothing, and it is a mark against the concept even when every rule above is satisfied.

### 10.9 When a concept cannot be encoded

If your result genuinely cannot be expressed in this vocabulary and these grammars, say so explicitly and explain what shape it would need. That is real information and it is occasionally the right answer.

But treat it as a serious mark against the concept rather than a formatting inconvenience. A game whose result cannot be shared spoiler free has no distribution on this platform, and a great game nobody hears about loses to a decent game people paste into a group chat every morning.

## 11. WHAT MAKES A STRONG CONCEPT

These are qualities to report and to think about, not quotas to fill. Nothing here disqualifies a concept for resembling another concept.

1. **A clear cognitive mode.** Spatial planning, deduction from static constraints, deduction from interactive feedback, categorization, arithmetic or numeric search, constraint satisfaction, optimization, ordering, sequence transformation, and pattern or memory recall are all distinct. Name yours. If a concept is hard to place, say so, because a mode nobody has a name for is often the interesting one. Note that the two kinds of deduction are genuinely different skills: one has every fact on the board at the start and the work is chaining forced conclusions, the other has no facts at all until the player spends an attempt to buy one.
2. **A session length the game actually wants.** Not one imposed on it. A concept that is naturally forty seconds should be forty seconds, and a concept stretched to fill five minutes will be found out by day thirty.
3. **A failure feel that suits the puzzle.** A continuum with no way to lose, or pass or fail with a small attempt limit. Say which and say why the other would be worse.
4. **An input gesture that fits the thinking.** Dragging, tapping, cycling, typing, reordering, rotating. The gesture should be the shape of the decision, not a way to enter an answer already worked out in the player's head.
5. **A difficulty measure of its own** that passes Section 8. This is the one item on the list that is a gate rather than a quality.

## 12. AUTOMATIC REJECTIONS

Do not propose these, and do not spend words explaining why you did not.

1. Anything requiring daily human authorship, curation, or review.
2. Anything using licensed media, real photographs, real people, or current events.
3. Anything requiring a server, an account, other players, or live data.
4. Sudoku, crossword, nonogram, or Wordle with a cosmetic reskin. Derivative structure is acceptable only when the core decision the player makes is genuinely new.
5. Anything whose rules depend on animation, physics, or timing.
6. Anything requiring a large hand built dictionary of meanings, associations, or categories.
7. Anything where one wrong early move makes the rest of the day unplayable.
8. Anything whose difficulty knob is a parameter the generator is told to hit rather than a property the verifier measures.
9. Anything that needs a rules glossary a player must already know, such as chess piece movement or logic gate behaviour, since the rule sentence cannot carry it.

## 13. REQUIRED OUTPUT FORMAT

Use exactly this template for every concept. Be concrete. Vagueness in a field means the concept has not been designed yet.

```
CONCEPT [number]: [NAME]

ONE SENTENCE RULE:
COGNITIVE MODE:
SUBSTRATE:
[The material, and which of the four gates in 5.2 it makes hardest.]
SESSION LENGTH:
INPUT GESTURE:

HOW IT WORKS:
[Four to eight sentences. Enough that a developer could start.]

THE DAILY PUZZLE:
[What varies each day, and what stays fixed.]

GENERATION:
[How a program builds the day's puzzle from a seed. Name the algorithm, name the
strategy from G1, and give the expected acceptance rate from G2.]

STATE SPACE CENSUS:
[How many distinct puzzles the mechanics can ever produce, computed rather than
guessed, and how many years that is at one a day. Per G6.]

VERIFICATION:
[The check, the algorithm, and the search space size. State whether it proves
uniqueness, fairness, or both, per V1. Name the independent second check if
there is one, and the structural invariants from V4.]

DECOMPOSITION AND SYMMETRY:
[Whether the constraints chain or split into independent pieces, per V6, and any
symmetry in the scoring that would make a unique optimum impossible, per V7.]

DIFFICULTY MEASURE:
[The single emergent integer, per D1 and D2, and how the verifier computes it.]

BANDABILITY:
[Estimated distinct values, estimated spread across seven bands, and estimated
puzzles per band per year, each with the arithmetic or the sampling experiment
behind it, per D5. Say which estimate you are least sure of.]

WHAT MONDAY FEELS LIKE:
[One sentence, in the player's terms, on the difference between the gentlest and
the hardest band.]

FAILURE MODEL:
[Continuous score, or limited attempts, or something else. What a bad day looks
like, and whether there is a win and loss at all.]

REFUSALS:
[Every player action the rules must refuse, and the sentence each announces.]

DISTRIBUTION BUCKETS:
[Three to eight labelled histogram categories.]

SHARE BLOCK:
[An actual drafted block, real glyphs, title line and platform URL, exactly as it
would be pasted into a chat. A second block for a bad day if the two differ in
shape. Then one line each on grammar, leak test, and range, per 10.8.]

WHY THEY COME BACK TOMORROW:
[One or two sentences. The honest answer, not a slogan.]

CLOSEST PUBLICLY KNOWN GAME AND HOW THIS DIFFERS:

CONTRACT CHECK:
[Any of the ten pieces in section 9 that would be awkward, and why. Write "all
ten clean" if none.]

RISKS:
[The two most likely reasons this fails. Be blunt.]

SELF SCORE:
Originality        /5
Rule simplicity    /5
Generatability     /5
Verifiability      /5
Bandability        /5
Share block quality /5
Daily durability   /5
TOTAL              /35
```

## 14. AFTER THE CONCEPTS

1. A comparison table of all of them: cognitive mode, session length, failure model, difficulty measure, and total self score.
2. Your ranked recommendations, each justified on its own terms. Say what makes it good, not what it complements.
3. The cognitive modes your concepts span, listed plainly, so whoever assembles a lineup later can see the spread without your having designed for one.
4. The riskiest concept among your recommendations, and the single thing that would need to be prototyped first to retire that risk. Prefer a prototype that measures a distribution over one that builds a feature.
5. Every concept you considered and discarded, with a one line reason. Rejections are as informative as recommendations.
6. Any place where this document contradicted itself or left something genuinely undecidable, and what you assumed.

## 15. STANDARDS

Be blunt. If a concept is mediocre, say so in its risks rather than selling it.

Prioritise the boring virtues: a rule a stranger understands in five seconds, a puzzle a program can prove fair, a difficulty number that actually varies, and a share block someone would voluntarily paste into a group chat.

A concept that sounds exciting and cannot be generated, verified, or banded is worth less than a plain one that can, because the plain one ships.

END PROMPT
