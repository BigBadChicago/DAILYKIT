# DAILYKIT Candidate Games

This document captures 12 daily puzzle concepts, rankings, recommendations, risks, and comparison notes in agent-readable Markdown.

## Final Ranking
1. Mirror Marks (28)
2. Sumline (27)
3. Echo (27)
4. Triad (25, strategically valuable)
5. Fold (26)
6. Glyph Lock (26)
7. Weave (26)
8. Vector (26)
9. Orbit (25)
10. Balance (25)
11. Fraction (25)
12. Chain Order (25)

---

# CONCEPT 1: SUMLINE
- Rule: Draw a single path through adjacent numbers so the running total hits every target marker in order and finishes exactly on the goal.
- Cognitive Mode: Arithmetic / sequence reasoning
- Session: 1-3 minutes
- Input: Drag path
- Generation: SAT-guided path construction.
- Verification: Exhaustive path search; require exactly one solution and target difficulty band.
- Difficulty Knob: Branching factor.
- Failure Model: Attempts until solved.
- Total Score: 27/30.

# CONCEPT 2: ORBIT
- Rule: Rotate rings of symbols until every line matches its target count pattern.
- Cognitive Mode: Constraint satisfaction
- Session: 2-5 minutes
- Input: Ring rotation
- Generation: Construct solved state then rotate.
- Verification: Exact-cover solver.
- Difficulty Knob: Ambiguous intermediate states.
- Total Score: 25/30.

# CONCEPT 3: MIRROR MARKS
- Rule: Place mirrors so every beam reaches its matching target exactly once.
- Cognitive Mode: Deduction
- Session: 2-4 minutes
- Input: Tap cells
- Generation: Construct solved mirror layout.
- Verification: Constraint solver proving uniqueness.
- Difficulty Knob: Initial deduction density.
- Total Score: 28/30.

# CONCEPT 4: CHAIN ORDER
- Rule: Reorder scrambled number tiles into a sequence where every neighboring pair satisfies the displayed relation.
- Cognitive Mode: Sequence reasoning
- Session: 30-90 seconds
- Input: Drag reorder
- Generation: Generate valid sequence and shuffle.
- Verification: Enumerate permutations.
- Difficulty Knob: Sequence length.
- Total Score: 25/30.

# CONCEPT 5: GLYPH LOCK
- Rule: Assign symbols to empty slots so every row and column satisfies its visible pattern rule.
- Cognitive Mode: Constraint satisfaction
- Session: 3-6 minutes
- Input: Tap-to-place
- Generation: Latin-like grid generation.
- Verification: SAT solver.
- Difficulty Knob: Symbol count.
- Total Score: 26/30.

# CONCEPT 6: TRIAD
- Rule: Select three shapes at a time to remove the board until no pieces remain.
- Cognitive Mode: Categorization
- Session: 1-4 minutes
- Input: Tap selections
- Generation: Solvable finite symbol system.
- Verification: Enumerate legal removal paths.
- Difficulty Knob: Overlapping candidate triples.
- Total Score: 25/30.

# CONCEPT 7: VECTOR
- Rule: Place directional arrows so every numbered cell receives exactly that many incoming arrows.
- Cognitive Mode: Deduction
- Session: 2-5 minutes
- Input: Tap cycle arrow
- Generation: Solved arrow field.
- Verification: Exact solver.
- Difficulty Knob: Grid density.
- Total Score: 26/30.

# CONCEPT 8: BALANCE
- Rule: Move weights between pans until every scale balances simultaneously.
- Cognitive Mode: Constraint satisfaction
- Session: 2-5 minutes
- Input: Drag pieces
- Generation: Solved network then scramble.
- Verification: Linear-system solver.
- Difficulty Knob: Number of scales.
- Total Score: 25/30.

# CONCEPT 9: WEAVE
- Rule: Reconnect broken strands so every endpoint belongs to exactly one continuous loop.
- Cognitive Mode: Spatial deduction
- Session: 2-4 minutes
- Input: Tap connectors
- Generation: Generate loop then rotate pieces.
- Verification: Exact solver.
- Difficulty Knob: Loop complexity.
- Total Score: 26/30.

# CONCEPT 10: FRACTION
- Rule: Merge neighboring numbered tiles until the board becomes a single target value.
- Cognitive Mode: Arithmetic planning
- Session: 1-4 minutes
- Input: Drag merge
- Generation: Reverse solution tree.
- Verification: Search all merge sequences.
- Difficulty Knob: Tree branching factor.
- Total Score: 25/30.

# CONCEPT 11: ECHO
- Rule: Recreate a hidden sequence of moves using only deterministic feedback.
- Cognitive Mode: Deduction from feedback
- Session: 1-3 minutes
- Input: Taps
- Generation: Seeded symbol sequence.
- Verification: Solve-space analyzer.
- Difficulty Knob: Alphabet size.
- Total Score: 27/30.

# CONCEPT 12: FOLD
- Rule: Choose the order of folds that allows all marked points to overlap exactly at the end.
- Cognitive Mode: Spatial reasoning
- Session: 2-5 minutes
- Input: Tap fold order
- Generation: Construct solved folded state then unfold.
- Verification: Enumerate fold orders.
- Difficulty Knob: Number of folds.
- Total Score: 26/30.

---

# Recommended Suite Alongside Poker Grid
1. Mirror Marks
2. Sumline
3. Triad
4. Echo

Rationale:
- Mirror Marks = pure deduction.
- Sumline = arithmetic reasoning.
- Triad = categorization plus continuous scoring.
- Echo = limited-attempt feedback deduction.
- Poker Grid already covers spatial planning.

Together they maximize cognitive diversity, verification strength, and shareability.

# Riskiest Recommended Concept
Triad.
Reason: differentiation from SET may be insufficient despite strong generation and verification properties.

# Discarded but Viable
Orbit, Chain Order, Glyph Lock, Vector, Balance, Weave, Fraction, Fold.
