import { classifyHand } from "./evaluator.js";
import { settle, visitSelections, type Grid } from "./rules.js";
import { CARD_CLEAR_POINTS, pointsFor } from "./scoring.js";
import { HAND_SIZE } from "./evaluator.js";

export interface SolverResult {
  readonly score: number;
  readonly hands: number;
  readonly nodes: number;
  readonly method: "exact" | "beam";
  /* Present only on a beam result, so a stored score always carries the width
     that produced it and no reader has to guess. */
  readonly width?: number;
}

export interface SolverOptions {
  /* Distinct board states the exact search may expand before it gives up.
     Exceeding it is not an error, it is the switch to beam. */
  readonly exactCeiling?: number;
  readonly beamWidth?: number;
}

/* Measured, not guessed. A fresh 35 card board reaches far more than 400,000
   distinct states, and an attempt at that ceiling costs about ten seconds per
   board and never once completed across the horizon. The ceiling is therefore
   set where the attempt is still honest and still cheap: it completes on the
   small boards the tests use and on late game positions, and it bails in
   about half a second on a full board, which is then solved by beam. */
export const DEFAULT_EXACT_CEILING = 25_000;
export const DEFAULT_BEAM_WIDTH = 400;

const CLEAR_VALUE = CARD_CLEAR_POINTS * HAND_SIZE;

class CeilingExceeded extends Error {}

function keyFor(grid: Grid): string {
  let key = "";
  for (const card of grid) key += card === null ? "." : String.fromCharCode(48 + card);
  return key;
}

interface Reach {
  readonly score: number;
  readonly hands: number;
}

/* Every legal hand from this grid, as the settled grid it leaves behind. */
function successors(grid: Grid): { readonly grid: Grid; readonly points: number }[] {
  const out: { grid: Grid; points: number }[] = [];
  visitSelections(grid, (selection) => {
    const category = classifyHand(selection.map((cell) => grid[cell] as number));
    if (category === "high-card") return false;
    const cleared = settle(grid.map((card, cell) => selection.includes(cell) ? null : card));
    out.push({ grid: cleared, points: pointsFor(category) });
    return false;
  });
  return out;
}

/* Exhaustive over reachable boards, not over move orders. Two different move
   orders that leave the same board have the same future, so the memo collapses
   the transpositions that make the raw tree hopeless. */
function searchExact(initial: Grid, ceiling: number): { result: Reach; nodes: number } | null {
  const memo = new Map<string, Reach>();
  let nodes = 0;

  const reach = (grid: Grid): Reach => {
    const key = keyFor(grid);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    nodes += 1;
    if (nodes > ceiling) throw new CeilingExceeded();

    let best: Reach = { score: 0, hands: 0 };
    for (const move of successors(grid)) {
      const onward = reach(move.grid);
      const score = move.points + CLEAR_VALUE + onward.score;
      const hands = 1 + onward.hands;
      if (score > best.score || (score === best.score && hands > best.hands)) best = { score, hands };
    }
    memo.set(key, best);
    return best;
  };

  try {
    const result = reach(initial);
    return { result, nodes };
  } catch (error) {
    if (error instanceof CeilingExceeded) return null;
    throw error;
  }
}

/* Fallback only. Width is carried into the result because a beam score is a
   claim about a search, not about the board. */
function searchBeam(initial: Grid, width: number): { result: Reach; nodes: number } {
  let frontier: { grid: Grid; reach: Reach }[] = [{ grid: initial, reach: { score: 0, hands: 0 } }];
  let best: Reach = { score: 0, hands: 0 };
  let nodes = 0;

  while (frontier.length > 0) {
    const children = new Map<string, { grid: Grid; reach: Reach }>();
    for (const node of frontier) {
      nodes += 1;
      for (const move of successors(node.grid)) {
        const reach = { score: node.reach.score + move.points + CLEAR_VALUE, hands: node.reach.hands + 1 };
        if (reach.score > best.score || (reach.score === best.score && reach.hands > best.hands)) best = reach;
        const key = keyFor(move.grid);
        const seen = children.get(key);
        if (seen === undefined || reach.score > seen.reach.score) children.set(key, { grid: move.grid, reach });
      }
    }
    frontier = [...children.values()].sort((a, b) => b.reach.score - a.reach.score).slice(0, width);
  }

  return { result: best, nodes };
}

export function solve(initial: Grid, options: SolverOptions = {}): SolverResult {
  const ceiling = options.exactCeiling ?? DEFAULT_EXACT_CEILING;
  const width = options.beamWidth ?? DEFAULT_BEAM_WIDTH;
  const exact = searchExact(initial, ceiling);
  if (exact !== null) {
    return { score: exact.result.score, hands: exact.result.hands, nodes: exact.nodes, method: "exact" };
  }
  const beam = searchBeam(initial, width);
  return { score: beam.result.score, hands: beam.result.hands, nodes: beam.nodes, method: "beam", width };
}
