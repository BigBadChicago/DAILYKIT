/**
 * Layer 4. DIFFERENCE RELAY rules. DIFFERENCE-RELAY.md sections 6.3 to 6.5.
 *
 * Pure: no DOM, no clock and no randomness. Every refused action is a value.
 * relay.ts is the baton and the differences; solver.ts is uniqueness, par and
 * difficulty; this file is the row of stations, the runs, the end of the day
 * and its grade.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  BucketId,
  FinishedOutcomeV3,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  TierOrdinal,
} from "../../core/types.js";
import {
  GAPS,
  MAX_RUNS,
  STATIONS,
  VALUE_MAX,
  VALUE_MIN,
  diffsOf,
  isPermutationOf,
  numbersOf,
  orderKey,
  relayDepth,
  sameOrder,
} from "./relay.js";
import { solve } from "./solver.js";

/** Upper bounds of `runs - par` for tiers 0 to 2. A loss is tier 4 Rough. */
export const TIER_OVER: readonly number[] = [0, 1, 2];

export interface DifferenceRelayPuzzle {
  readonly number: PuzzleNumber;
  /** The distinct values, sorted, the tokens the player orders. */
  readonly numbers: readonly number[];
  /** The winning order. Obfuscated in the manifest, never shown. */
  readonly target: readonly number[];
  /** Per gap: the visible difference, or null when the gap is hidden. */
  readonly marks: readonly (number | null)[];
  /** The order the day starts in, never the target. */
  readonly startOrder: readonly number[];
  /** Forced runs, DIFFERENCE-RELAY.md 10.3. Derived, never read from a manifest. */
  readonly par: number;
  /** Forced deduction work, DIFFERENCE-RELAY.md 14. */
  readonly difficulty: number;
  readonly levers: readonly string[];
}

/** One submitted order and the station the baton reached. */
export interface RunRecord {
  readonly order: readonly number[];
  readonly depth: number;
}

export interface DifferenceRelayState {
  readonly puzzle: DifferenceRelayPuzzle;
  /** The current arrangement, changed for free by swaps. */
  readonly order: readonly number[];
  /** The runs spent, in play order. */
  readonly runs: readonly RunRecord[];
  readonly won: boolean;
}

export type DifferenceRelayAction =
  | { readonly kind: "swap"; readonly a: number; readonly b: number }
  | { readonly kind: "run" };

export interface MakeFailure {
  readonly detail: string;
}

/** Shape checks shared by the parser, the generator and the verifier. */
export function puzzleProblem(
  target: readonly number[],
  marks: readonly (number | null)[],
  startOrder: readonly number[],
): string | null {
  if (target.length !== STATIONS) return `there must be ${String(STATIONS)} numbers`;
  const seen = new Set<number>();
  for (const value of target) {
    if (!Number.isInteger(value) || value < VALUE_MIN || value > VALUE_MAX) return "a number is out of range";
    if (seen.has(value)) return "the numbers are not distinct";
    seen.add(value);
  }
  if (marks.length !== GAPS) return `there must be ${String(GAPS)} marks`;
  const trueDiffs = diffsOf(target);
  let visible = 0;
  let hidden = 0;
  for (let i = 0; i < GAPS; i += 1) {
    const mark = marks[i];
    if (mark === null) {
      hidden += 1;
      continue;
    }
    if (!Number.isInteger(mark) || mark !== (trueDiffs[i] as number)) return "a visible mark is not the true difference";
    visible += 1;
  }
  if (hidden < 1) return "at least one gap must be hidden";
  if (visible < 1) return "at least one gap must be visible";
  if (!isPermutationOf(startOrder, target)) return "the start order is not a permutation of the numbers";
  if (sameOrder(startOrder, target)) return "the start order must not be the target";
  return null;
}

/**
 * Builds a puzzle and proves it on the way: exactly one order satisfies every
 * mark, the visible marks alone leave more than one, and the no guess model
 * opens the line within the budget. A board failing any of these is refused, so
 * a malformed manifest entry becomes a readable failure rather than an unfair day.
 */
export function makePuzzle(
  number: PuzzleNumber,
  target: readonly number[],
  marks: readonly (number | null)[],
  startOrder: readonly number[],
  levers: readonly string[],
): Result<DifferenceRelayPuzzle, MakeFailure> {
  const problem = puzzleProblem(target, marks, startOrder);
  if (problem !== null) return err({ detail: problem });
  const solved = solve(target, marks);
  if (solved.solutions !== 1) return err({ detail: `${String(solved.solutions)} orders satisfy the marks, not one` });
  if (solved.visibleCount < 2) return err({ detail: "the visible marks alone already pin the order" });
  if (!solved.fair) return err({ detail: "the no guess model cannot open the line within the budget" });
  return ok({
    number,
    numbers: numbersOf(target),
    target: target.slice(),
    marks: marks.slice(),
    startOrder: startOrder.slice(),
    par: solved.par,
    difficulty: solved.difficulty,
    levers: levers.slice(),
  });
}

export function trueDiffsOf(puzzle: DifferenceRelayPuzzle): number[] {
  return diffsOf(puzzle.target);
}

export function initialState(puzzle: DifferenceRelayPuzzle): DifferenceRelayState {
  return { puzzle, order: puzzle.startOrder.slice(), runs: [], won: false };
}

export function isTerminal(state: DifferenceRelayState): boolean {
  return state.won || state.runs.length >= MAX_RUNS;
}

const GAME_OVER: Rejection = { code: "game-over", announce: "The relay is already finished for today." };
const UNKNOWN_TOKEN: Rejection = { code: "unknown-token", announce: "That number is not in the row." };
const SAME_TOKEN: Rejection = { code: "same-token", announce: "Choose two different numbers to swap." };
const REPEAT_RUN: Rejection = { code: "repeat-run", announce: "You already ran that order; change it first." };

export function applyAction(
  state: DifferenceRelayState,
  action: DifferenceRelayAction,
): Result<DifferenceRelayState, Rejection> {
  if (isTerminal(state)) return err(GAME_OVER);

  if (action.kind === "swap") {
    if (!state.puzzle.numbers.includes(action.a) || !state.puzzle.numbers.includes(action.b)) return err(UNKNOWN_TOKEN);
    if (action.a === action.b) return err(SAME_TOKEN);
    const order = state.order.slice();
    const slotA = order.indexOf(action.a);
    const slotB = order.indexOf(action.b);
    order[slotA] = action.b;
    order[slotB] = action.a;
    return ok({ ...state, order });
  }

  if (state.runs.some((run) => sameOrder(run.order, state.order))) return err(REPEAT_RUN);
  const depth = relayDepth(state.order, trueDiffsOf(state.puzzle));
  return ok({
    ...state,
    runs: [...state.runs, { order: state.order.slice(), depth }],
    won: depth === GAPS,
  });
}

/** DIFFERENCE-RELAY.md 6.5. Never null: par is derived on every day. */
export function tierFor(state: DifferenceRelayState): TierOrdinal {
  if (!state.won) return 4;
  const over = state.runs.length - state.puzzle.par;
  let tier = 0;
  while (tier < TIER_OVER.length && over > (TIER_OVER[tier] as number)) tier += 1;
  return tier as TierOrdinal;
}

/** Runs used, one based, into the seven distribution labels; the last is a loss. */
export function bucketFor(state: DifferenceRelayState): BucketId {
  return state.won ? state.runs.length - 1 : MAX_RUNS;
}

export function finishedOutcomeFor(state: DifferenceRelayState): FinishedOutcomeV3 {
  const runs = state.runs.length;
  return {
    kind: "finished",
    score: runs,
    won: state.won,
    detail: state.won
      ? `Opened in ${String(runs)} ${runs === 1 ? "run" : "runs"}, par ${String(state.puzzle.par)}`
      : `Not opened in ${String(runs)} runs, par ${String(state.puzzle.par)}`,
    tier: tierFor(state),
    bucket: bucketFor(state),
    difficulty: state.puzzle.difficulty,
  };
}

export function inspect(state: DifferenceRelayState): OutcomeV3 {
  return isTerminal(state) ? finishedOutcomeFor(state) : { kind: "ongoing" };
}

/**
 * Rebuilds a state from a stored current order and the orders run, validating
 * that no illegal game could reach it: permutations of the numbers, at most the
 * budget of distinct runs, and a win only on the last run. Null when any of that
 * fails, which the module turns into a StateFailure.
 */
export function buildState(
  puzzle: DifferenceRelayPuzzle,
  order: readonly number[],
  runOrders: readonly (readonly number[])[],
): DifferenceRelayState | null {
  if (!isPermutationOf(order, puzzle.numbers)) return null;
  if (runOrders.length > MAX_RUNS) return null;
  const trueDiffs = trueDiffsOf(puzzle);
  const seen = new Set<string>();
  const runs: RunRecord[] = [];
  let won = false;
  for (let i = 0; i < runOrders.length; i += 1) {
    const runOrder = runOrders[i] as readonly number[];
    if (!isPermutationOf(runOrder, puzzle.numbers)) return null;
    const key = orderKey(runOrder);
    if (seen.has(key)) return null;
    seen.add(key);
    const depth = relayDepth(runOrder, trueDiffs);
    if (depth === GAPS) {
      if (i !== runOrders.length - 1) return null;
      won = true;
    }
    runs.push({ order: runOrder.slice(), depth });
  }
  return { puzzle, order: order.slice(), runs, won };
}
