/**
 * Layer 4. Par, the fairness model and the difficulty measure. WORD-LADDER.md
 * sections 9, 11 and 14.
 *
 * Par is the EXACT shortest path over the one accepted list, so no beam and no
 * "best known" label anywhere. Fairness is the section 11 claim, proved here by
 * a second breadth first search over the familiar subgraph: at least one
 * shortest path uses familiar words alone. The independent check is
 * tools/word-ladder-verify.ts, which never imports this file.
 */

import { ballSize, buildGraph, distance, distancesFrom, type WordGraph } from "./ladder.js";

export interface SolveResult {
  /** Exact shortest path length from start to goal over the accepted graph. */
  readonly par: number;
  /** True when a shortest path of length par uses only familiar words. */
  readonly familiarFair: boolean;
  /** Accepted words within par minus one of the start, the section 14 integer. */
  readonly difficulty: number;
  /** True when start reaches goal at all. */
  readonly solvable: boolean;
}

/**
 * Whether a shortest path from start to goal, of length exactly par, exists using
 * only familiar words. Both endpoints must be familiar (the generator draws them
 * so). Computed as the familiar only distance equalling the accepted par: if the
 * familiar subgraph reaches goal in par steps, that path is a shortest accepted
 * path made of familiar words.
 */
export function hasFamiliarShortestPath(
  familiarGraph: WordGraph,
  start: string,
  goal: string,
  par: number,
): boolean {
  if (!familiarGraph.has(start) || !familiarGraph.has(goal)) return false;
  const familiarDistance = distance(familiarGraph, start, goal);
  return familiarDistance !== null && familiarDistance === par;
}

/**
 * Solves a day from prebuilt graphs. The accepted graph gives par and the
 * difficulty ball; the familiar graph gives the fairness claim. Both graphs are
 * built once per generation run and passed in, so a 365 day run builds them twice
 * (accepted and familiar), never per day.
 */
export function solveWith(
  acceptedGraph: WordGraph,
  familiarGraph: WordGraph,
  start: string,
  goal: string,
): SolveResult {
  const par = distance(acceptedGraph, start, goal);
  if (par === null || par === 0) {
    return { par: par ?? 0, familiarFair: false, difficulty: 0, solvable: false };
  }
  return {
    par,
    familiarFair: hasFamiliarShortestPath(familiarGraph, start, goal, par),
    difficulty: ballSize(acceptedGraph, start, par - 1),
    solvable: true,
  };
}

/**
 * Convenience for callers holding word lists rather than graphs, used by tests.
 * The generator and the module hold graphs, so they call solveWith.
 */
export function solve(
  accepted: readonly string[],
  familiar: readonly string[],
  start: string,
  goal: string,
): SolveResult {
  return solveWith(buildGraph(accepted), buildGraph(familiar), start, goal);
}

/** The section 14 integer, recomputed from the graph and never read from a
 *  manifest. Zero when the pair is not solvable, which a real puzzle never is
 *  because makePuzzle refuses it. */
export function difficultyOf(acceptedGraph: WordGraph, start: string, goal: string): number {
  const par = distance(acceptedGraph, start, goal);
  return par === null || par === 0 ? 0 : ballSize(acceptedGraph, start, par - 1);
}

/** Re-export so the verifier's cross check can name the same ball helper. */
export { distancesFrom };
