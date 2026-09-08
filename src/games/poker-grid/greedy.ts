import { intBelow, type Rng } from "../../core/rng.js";
import { classifyHand } from "./evaluator.js";
import { CLEAR_VALUE_PER_HAND, pointsFor } from "./scoring.js";
import { settle, visitSelections, type Grid } from "./rules.js";

export interface GreedyResult {
  readonly score: number;
  readonly hands: number;
}

export interface LegalMove {
  readonly cells: readonly number[];
  readonly points: number;
}

export function legalMoves(grid: Grid): readonly LegalMove[] {
  const moves: LegalMove[] = [];
  visitSelections(grid, (selection) => {
    const category = classifyHand(selection.map((cell) => grid[cell] as number));
    if (category !== "high-card") moves.push({ cells: selection, points: pointsFor(category) });
    return false;
  });
  return moves;
}

export function applyMove(grid: Grid, move: LegalMove): Grid {
  return settle(grid.map((card, cell) => move.cells.includes(cell) ? null : card));
}

/* The reference naive player of requirement 6.3.4: always take the best hand
   on the board, break ties at random, never look ahead. The difficulty of a
   board is how far this player falls short of best known play, so this
   function is a measuring instrument and must stay dumb. */
export function playGreedy(initial: Grid, rng: Rng): GreedyResult {
  let grid = initial;
  let score = 0;
  let hands = 0;
  for (;;) {
    const moves = legalMoves(grid);
    if (moves.length === 0) return { score, hands };
    let bestPoints = 0;
    for (const move of moves) if (move.points > bestPoints) bestPoints = move.points;
    const contenders = moves.filter((move) => move.points === bestPoints);
    const chosen = contenders[intBelow(rng, contenders.length)] as LegalMove;
    grid = applyMove(grid, chosen);
    score += chosen.points + CLEAR_VALUE_PER_HAND;
    hands += 1;
  }
}
