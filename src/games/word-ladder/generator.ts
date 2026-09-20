/**
 * Layer 4. WORD LADDER generation. WORD-LADDER.md sections 6, 7, 11, 14 and 15.
 *
 * Seeded draw, one stream per puzzle, no salts, the seam VECTOR, ROTATE LOCK and
 * DIFFERENCE RELAY use. The generator holds both graphs (accepted and familiar),
 * built once per run, so a 365 day run builds each graph once, never per day.
 *
 * Past the horizon the browser holds only the accepted list (words.ts), never the
 * familiar list, so the fairness screen cannot be proved there. The horizon
 * fallback therefore drops the familiar screen and returns an ungraded, still
 * solvable, par 4 to 7 board, the same degrade DIFFERENCE RELAY makes past its
 * horizon. Inside the horizon, generateForPuzzle runs every screen including
 * fairness, because the tools have the familiar list.
 */

import { buildGraph, differingPositions, distancesFrom, type WordGraph } from "./ladder.js";
import { makePuzzle, type WordLadderPuzzle } from "./rules.js";
import { hasFamiliarShortestPath } from "./solver.js";

/** The only randomness this file consumes. Matches core/rng's integer helper. */
export interface Draw {
  intBelow(bound: number): number;
}

/** Attempts one manifest day may consume before it is reported unfillable. */
export const ATTEMPT_CEILING = 60000;
/** Attempts the browser spends past the horizon. WORD-LADDER.md 6. */
export const FALLBACK_ATTEMPTS = 4000;
export const PAR_MIN = 4;
export const PAR_MAX = 7;

/**
 * Upper edges of bands 0 to 5 over the search ball; band 6 is everything above.
 * Septiles of the screened sample in data/word-ladder/study.json, written by
 * tools/word-ladder-calibrate.ts. Changing an edge invalidates every stored
 * band, so it is a manifest regeneration and not a tweak. The reproduced
 * septiles (WORD-LADDER.md 30) seed these; the build's study commits the exact
 * edges from the shipped list.
 */
export const BAND_EDGES: readonly number[] = [278, 436, 641, 878, 1122, 1505];

/** Band per weekday, 0 Monday through 6 Sunday, the suite's weekly curve. */
export const WEEKDAY_BAND: readonly number[] = [0, 1, 2, 3, 5, 6, 4];

export type RejectReason = "par" | "fairness" | "reused" | "band";
export type Tally = Record<RejectReason | "accepted", number>;

export function emptyTally(): Tally {
  return { par: 0, fairness: 0, reused: 0, band: 0, accepted: 0 };
}

/** Epoch 2026-01-05 is a Monday, so puzzle 1 is a Monday. */
export function weekdayOf(puzzleNumber: number): number {
  return (puzzleNumber - 1) % 7;
}

export function bandOf(difficulty: number): number {
  let band = 0;
  while (band < BAND_EDGES.length && difficulty > (BAND_EDGES[band] as number)) band += 1;
  return band;
}

export function bandForPuzzle(puzzleNumber: number): number {
  return WEEKDAY_BAND[weekdayOf(puzzleNumber)] as number;
}

/** Par lever per weekday: early week short, late week long. WORD-LADDER.md 6a. */
export function parWindowFor(puzzleNumber: number): { readonly lo: number; readonly hi: number } {
  const weekday = weekdayOf(puzzleNumber);
  if (weekday <= 1) return { lo: 4, hi: 5 };
  if (weekday >= 4) return { lo: 6, hi: 7 };
  return { lo: 4, hi: 7 };
}

/** Detour lever per weekday: early week direct, late week forced to step away. */
export function detourFloorFor(puzzleNumber: number): number {
  return weekdayOf(puzzleNumber) >= 4 ? 2 : 0;
}

/**
 * The generation context, built once per run. `familiarList` is empty in the
 * browser fallback, which flips off the fairness screen; the tools always pass a
 * real familiar list.
 */
export interface GenContext {
  readonly acceptedGraph: WordGraph;
  readonly accepted: ReadonlySet<string>;
  readonly familiarGraph: WordGraph;
  readonly familiarWords: readonly string[];
  /** The words a start or goal may be drawn from: familiar inside the horizon,
   *  or the accepted largest component in the browser fallback. */
  readonly drawPool: readonly string[];
  /** False in the browser fallback, where the familiar list is absent. */
  readonly fairnessAvailable: boolean;
}

export function contextFromLists(accepted: readonly string[], familiar: readonly string[]): GenContext {
  const acceptedGraph = buildGraph(accepted);
  const familiarGraph = buildGraph(familiar);
  return {
    acceptedGraph,
    accepted: new Set(accepted),
    familiarGraph,
    familiarWords: familiar,
    drawPool: familiar,
    fairnessAvailable: familiar.length > 0,
  };
}

/** The accepted largest component, for the browser fallback draw pool. */
export function largestComponent(graph: WordGraph): string[] {
  const seen = new Set<string>();
  let best: string[] = [];
  for (const start of graph.keys()) {
    if (seen.has(start)) continue;
    const stack = [start];
    const component: string[] = [];
    while (stack.length > 0) {
      const word = stack.pop() as string;
      if (seen.has(word)) continue;
      seen.add(word);
      component.push(word);
      for (const next of graph.get(word) ?? []) stack.push(next);
    }
    if (component.length > best.length) best = component;
  }
  return best;
}

export function fallbackContext(accepted: readonly string[]): GenContext {
  const acceptedGraph = buildGraph(accepted);
  const pool = largestComponent(acceptedGraph).sort();
  return {
    acceptedGraph,
    accepted: new Set(accepted),
    familiarGraph: acceptedGraph,
    familiarWords: [],
    drawPool: pool,
    fairnessAvailable: false,
  };
}

function pick<T>(draw: Draw, items: readonly T[]): T {
  return items[draw.intBelow(items.length)] as T;
}

/**
 * One attempt: draw a start from the pool, breadth first to its distances,
 * collect goals in the par window with the detour floor, draw one, and run the
 * screens. Null with the reason it was dropped, or the finished puzzle carrying
 * its par and difficulty. The draw is threaded in, no closure, so the stream is
 * owned by the caller.
 */
export function attempt(context: GenContext, puzzleNumber: number, draw: Draw, tally: Tally): WordLadderPuzzle | null {
  const start = pick(draw, context.drawPool);
  return attemptFrom(context, puzzleNumber, start, draw, tally);
}

export function attemptFrom(
  context: GenContext,
  puzzleNumber: number,
  start: string,
  draw: Draw,
  tally: Tally,
): WordLadderPuzzle | null {
  const parWindow = parWindowFor(puzzleNumber);
  const detourFloor = detourFloorFor(puzzleNumber);
  const dist = distancesFrom(context.acceptedGraph, start);
  const inPool = new Set(context.drawPool);

  const goals: string[] = [];
  for (const [word, d] of dist) {
    if (word === start) continue;
    if (d < parWindow.lo || d > parWindow.hi) continue;
    if (!inPool.has(word)) continue;
    if (d - differingPositions(start, word) < detourFloor) continue;
    goals.push(word);
  }
  if (goals.length === 0) {
    tally.par += 1;
    return null;
  }
  const goal = pick(draw, goals.sort());
  const par = dist.get(goal) as number;

  if (context.fairnessAvailable && !hasFamiliarShortestPath(context.familiarGraph, start, goal, par)) {
    tally.fairness += 1;
    return null;
  }

  const levers = [`par-${String(par)}`, `detour-${String(par - differingPositions(start, goal))}`];
  const made = makePuzzle(
    puzzleNumber,
    start,
    goal,
    context.acceptedGraph,
    context.fairnessAvailable ? context.familiarGraph : context.acceptedGraph,
    context.accepted,
    levers,
  );
  if (!made.ok) {
    /* makePuzzle refuses par band or fairness; both are already screened above,
       so a refusal here is a real construction fault, counted as par. */
    tally.par += 1;
    return null;
  }
  return made.value;
}

export interface GeneratedDay {
  readonly puzzle: WordLadderPuzzle;
  /** Attempts consumed from this puzzle's stream before the accepted one. */
  readonly attempt: number;
}

/** A manifest day: one stream per puzzle, no salts, the attempt count recorded. */
export function generateForPuzzle(
  context: GenContext,
  puzzleNumber: number,
  draw: Draw,
  tally: Tally = emptyTally(),
  usedPairs: ReadonlySet<string> = new Set(),
): GeneratedDay | null {
  const wanted = bandForPuzzle(puzzleNumber);
  for (let index = 0; index < ATTEMPT_CEILING; index += 1) {
    const puzzle = attempt(context, puzzleNumber, draw, tally);
    if (puzzle === null) continue;
    if (usedPairs.has(pairKey(puzzle.start, puzzle.goal))) {
      tally.reused += 1;
      continue;
    }
    if (bandOf(puzzle.difficulty) !== wanted) {
      tally.band += 1;
      continue;
    }
    tally.accepted += 1;
    return { puzzle, attempt: index };
  }
  return null;
}

/** Reverse pair is the same puzzle (WORD-LADDER.md 13a), so the key is order
 *  independent: the two words sorted. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Past the horizon: every screen but fairness and band, so an unlucky stream
 *  cannot loop and no familiar list is needed. WORD-LADDER.md 6. */
export function generateUnrated(
  context: GenContext,
  puzzleNumber: number,
  draw: Draw,
  ceiling = FALLBACK_ATTEMPTS,
): WordLadderPuzzle | null {
  const tally = emptyTally();
  for (let index = 0; index < ceiling; index += 1) {
    const puzzle = attempt(context, puzzleNumber, draw, tally);
    if (puzzle !== null) return puzzle;
  }
  return null;
}

/**
 * The tutorial board, fixed. A short par with no forced detour; the generator
 * test asserts it is solvable with par in band rather than trust this comment.
 * COLD to WARM is the canonical four rung ladder and every rung is a common word.
 */
export const FIRST_SESSION: { readonly start: string; readonly goal: string } = {
  start: "cold",
  goal: "warm",
};
