/**
 * Fixtures for the VECTOR tests. Every number here was measured by running the
 * propagator, not asserted from a design document.
 *
 * FIXTURE_LAYOUT is a carved board, ten clues, twenty six blanks, and the clue
 * values sum to twenty six as the closed system requires.
 */

import { makePuzzle, type VectorPuzzle } from "../../../src/games/vector/rules.js";
import type { ArrowBoard, ClueLayout, Direction } from "../../../src/games/vector/propagate.js";

export const FIXTURE_LAYOUT: ClueLayout = [
  null, null, null, 6, null, null,
  null, null, 5, null, null, null,
  1, 0, null, 4, 3, null,
  null, null, null, null, null, 2,
  null, 0, 2, null, null, null,
  null, null, null, null, 3, null,
];

/** Measured: depth six, six cells assigned in round one. */
export const FIXTURE_DEPTH = 6;
export const FIXTURE_OPENING = 6;
export const FIXTURE_BLANKS = 26;
export const FIXTURE_CLUES = 10;

/** The unique solution, as the propagator resolves it. */
export const FIXTURE_SOLUTION: ArrowBoard = [
  1, 1, 1, null, 3, 3,
  1, 1, null, 0, 3, 3,
  null, null, 1, null, null, 3,
  1, 1, 0, 0, 0, null,
  0, null, null, 0, 0, 3,
  1, 1, 0, 0, null, 3,
] as readonly (Direction | null)[];

/** The same layout with one clue value that no assignment can meet. */
export const CONTRADICTORY_LAYOUT: ClueLayout = FIXTURE_LAYOUT.map((value, cell) =>
  cell === 3 ? 1 : value,
);

/** Two clue values exchanged. Consistent enough to start, not enough to finish. */
export const STALLING_LAYOUT: ClueLayout = FIXTURE_LAYOUT.map((value, cell) => {
  if (cell === 3) return 5;
  if (cell === 8) return 6;
  return value;
});

export function fixturePuzzle(layout: ClueLayout = FIXTURE_LAYOUT): VectorPuzzle {
  return makePuzzle(1, layout, { difficulty: FIXTURE_DEPTH, opening: FIXTURE_OPENING }, ["none"]);
}
