/**
 * Layer 4. The order solver, the fairness model, par and the difficulty measure.
 * DIFFERENCE-RELAY.md sections 10.1, 10.3 and 14.
 *
 * The search enumerates all 720 orders once, EXACT, so uniqueness carries no
 * beam. The declared no guess deduction model of section 10.3 plays real runs
 * against the true order, always submitting a member of the candidate set, and
 * its run count is par while the candidate mass it resolves is the difficulty.
 * No table, so this ships in the browser and runs past the horizon, the call
 * VECTOR and ROTATE LOCK made for their solvers. The independent check is
 * tools/difference-relay-verify.ts, which never imports this file.
 */

import { GAPS, MAX_RUNS, diffsOf, permutations, relayDepth, sameDiffs, satisfiesVisible } from "./relay.js";

/** Guard so a pathological board reports unfair rather than looping. Well above
 *  MAX_RUNS: any board needing this many runs is refused by the fairness screen. */
const FAIRNESS_CAP = 12;

export interface SolveResult {
  /** Orders whose every neighbour difference equals the target's. EXACT. */
  readonly solutions: number;
  /** Orders that satisfy the visible marks alone. At least two on a fair board. */
  readonly visibleCount: number;
  /** Runs the no guess model needs to win, DIFFERENCE-RELAY.md 10.3. */
  readonly par: number;
  /** Candidate mass the forced line resolves, the section 14 difficulty. */
  readonly difficulty: number;
  /** True when par is within the six run budget, the section 10.5 fairness claim. */
  readonly fair: boolean;
}

/**
 * The minimax candidate the model submits next: from `candidates`, the order
 * whose worst case remaining candidate count is smallest, broken by the
 * lexicographically smallest order so the line is deterministic. It is always a
 * member of the set, never a probe known to be wrong.
 */
function minimaxPick(candidates: readonly number[][], diffs: readonly (readonly number[])[]): number {
  let bestIndex = 0;
  let bestWorst = Number.POSITIVE_INFINITY;
  for (let g = 0; g < candidates.length; g += 1) {
    const guessDiffs = diffs[g] as readonly number[];
    const buckets = new Array<number>(GAPS + 1).fill(0);
    for (let c = 0; c < candidates.length; c += 1) {
      const hypothesis = diffs[c] as readonly number[];
      let depth = GAPS;
      for (let i = 0; i < GAPS; i += 1) {
        if ((guessDiffs[i] as number) !== (hypothesis[i] as number)) {
          depth = i;
          break;
        }
      }
      buckets[depth] = (buckets[depth] as number) + 1;
    }
    let worst = 0;
    for (const size of buckets) if (size > worst) worst = size;
    if (worst < bestWorst) {
      bestWorst = worst;
      bestIndex = g;
    }
    /* Ties keep the earlier order, and permutations() emits in lexicographic
       order, so the first equal worst case is the smallest order. */
  }
  return bestIndex;
}

export function solve(target: readonly number[], marks: readonly (number | null)[]): SolveResult {
  const numbers = [...target].sort((a, b) => a - b);
  const orders = permutations(numbers);
  const targetDiffs = diffsOf(target);

  let solutions = 0;
  const visible: number[][] = [];
  const visibleDiffs: number[][] = [];
  for (const order of orders) {
    const d = diffsOf(order);
    if (sameDiffs(d, targetDiffs)) solutions += 1;
    if (satisfiesVisible(order, marks)) {
      visible.push(order);
      visibleDiffs.push(d);
    }
  }

  /* The deduction plays against the true order, which is always in the visible
     consistent set because the target satisfies every visible mark. */
  let live = visible.map((_, index) => index);
  let par = 0;
  let mass = 0;
  let fair = true;
  while (true) {
    mass += live.length;
    par += 1;
    const liveOrders = live.map((index) => visible[index] as number[]);
    const liveDiffs = live.map((index) => visibleDiffs[index] as number[]);
    const pick = minimaxPick(liveOrders, liveDiffs);
    const guessDiffs = liveDiffs[pick] as number[];
    const realDepth = relayDepth(liveOrders[pick] as number[], targetDiffs);
    if (realDepth === GAPS) break;
    const next: number[] = [];
    for (let k = 0; k < live.length; k += 1) {
      const hypothesis = liveDiffs[k] as number[];
      let depth = GAPS;
      for (let i = 0; i < GAPS; i += 1) {
        if ((guessDiffs[i] as number) !== (hypothesis[i] as number)) {
          depth = i;
          break;
        }
      }
      if (depth === realDepth) next.push(live[k] as number);
    }
    live = next;
    if (par >= FAIRNESS_CAP) {
      fair = false;
      break;
    }
  }

  return { solutions, visibleCount: visible.length, par, difficulty: mass, fair: fair && par <= MAX_RUNS };
}

/** The section 14 integer, recomputed from the puzzle and never read from a
 *  manifest. Zero when the board is not solvable or not unique, which a real
 *  puzzle never is because makePuzzle refuses those. */
export function difficultyOf(target: readonly number[], marks: readonly (number | null)[]): number {
  return solve(target, marks).difficulty;
}
