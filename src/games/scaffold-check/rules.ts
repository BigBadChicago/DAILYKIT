import { err, ok, type Result } from "../../core/result.js";
import type { Outcome, Rejection, SerializedState } from "../../core/types.js";

export const GRID_SIZE = 9;

export interface Puzzle {
  readonly number: number;
  readonly target: number;
}

export interface State {
  readonly puzzleNumber: number;
  readonly target: number;
  readonly tapped: readonly number[];
  readonly misses: number;
}

export type Action = { readonly kind: "tap"; readonly cell: number };

export function initialState(puzzle: Puzzle): State {
  return { puzzleNumber: puzzle.number, target: puzzle.target, tapped: [], misses: 0 };
}

export function isTerminal(state: State): boolean {
  return state.tapped.includes(state.target) || state.misses >= 3;
}

export function applyAction(state: State, action: Action): Result<State, Rejection> {
  if (isTerminal(state)) {
    return err({ code: "gameOver", announce: "This puzzle is finished." });
  }
  if (action.cell < 0 || action.cell >= GRID_SIZE) {
    return err({ code: "outOfRange", announce: "That cell does not exist." });
  }
  if (state.tapped.includes(action.cell)) {
    return err({ code: "alreadyTapped", announce: "That cell is already tapped." });
  }
  if (action.cell === state.target) {
    return ok({ ...state, tapped: [...state.tapped, action.cell] });
  }
  return ok({ ...state, misses: state.misses + 1, tapped: [...state.tapped, action.cell] });
}

export function inspect(state: State): Outcome {
  if (!isTerminal(state)) {
    return { kind: "ongoing" };
  }
  const won = state.tapped.includes(state.target);
  return {
    kind: "finished",
    score: won ? Math.max(0, 100 + state.misses * -10) : 0,
    won,
    detail: `${state.misses} misses`,
    tier: won ? 0 : 4,
  };
}

export function bucketOf(state: State): number {
  return Math.min(3, state.misses);
}

export function serializeState(state: State): SerializedState {
  return { v: 1, data: { t: state.tapped, m: state.misses, target: state.target } };
}

export function deserializeState(raw: SerializedState): State {
  const data = raw.data as { t?: unknown; m?: unknown; target?: unknown } | null;
  if (raw.v !== 1 || data === null || !Array.isArray(data.t) || !Number.isInteger(data.m) || !Number.isInteger(data.target)) {
    throw new Error("invalid state");
  }
  return { puzzleNumber: 0, target: data.target as number, tapped: data.t as number[], misses: data.m as number };
}
