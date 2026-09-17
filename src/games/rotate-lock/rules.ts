/**
 * Layer 4. ROTATE LOCK rules. ROTATE-LOCK.md sections 6.3 to 6.5.
 *
 * Pure: no DOM, no clock and no randomness. Every refused action is a value.
 * The route rule itself is route.ts; this file is the tray, the move count, the
 * end of the day and its grade.
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
  CELLS,
  MAX_LENGTH,
  MAX_MARKS,
  MIN_LENGTH,
  PIECES,
  arrangementKey,
  isDirection,
  trace,
  turnClockwise,
  type Arrangement,
  type Direction,
  type Layout,
  type Trace,
} from "./route.js";
import { arrangementsFor, parOf, solve } from "./solver.js";

/** Seven full share rows of eight. ROTATE-LOCK.md 17.3. */
export const MOVE_CAP = 56;

/** Upper bounds of `moves - par` for tiers 0 to 3. A jam is tier 4. */
export const TIER_OVER: readonly number[] = [0, 4, 10];

export interface RotateLockPuzzle extends Layout {
  readonly number: PuzzleNumber;
  /** The tray as the day starts. */
  readonly startOrder: readonly number[];
  readonly startFacing: readonly Direction[];
  /** Derived when the puzzle is made, never read from a manifest. */
  readonly par: number;
  /** Dead turns, ROTATE-LOCK.md 14. */
  readonly difficulty: number;
  readonly levers: readonly string[];
}

export type RotateLockAction =
  | { readonly kind: "swap"; readonly a: number; readonly b: number }
  | { readonly kind: "rotate"; readonly piece: number };

export type MoveRecord =
  | { readonly kind: "swap"; readonly a: number; readonly b: number; readonly revisit: boolean }
  | { readonly kind: "rotate"; readonly piece: number; readonly revisit: boolean };

export interface RotateLockState extends Arrangement {
  readonly puzzle: RotateLockPuzzle;
  readonly moves: readonly MoveRecord[];
  /** Keys of every arrangement this run has been in, the start first. */
  readonly history: readonly string[];
  readonly open: boolean;
}

export interface MakeFailure {
  readonly detail: string;
}

/** Shape checks shared by the parser, the generator and the verifier. */
export function layoutProblem(layout: Layout, start: Arrangement): string | null {
  const cellOk = (cell: number): boolean => Number.isInteger(cell) && cell >= 0 && cell < CELLS;
  if (!cellOk(layout.start) || !cellOk(layout.lock) || layout.start === layout.lock) {
    return "start and lock must be two distinct cells";
  }
  if (layout.marks.length > MAX_MARKS) return "too many marks";
  const special = new Set([layout.start, layout.lock]);
  let previous = -1;
  for (const mark of layout.marks) {
    if (!cellOk(mark) || special.has(mark) || mark <= previous) {
      return "marks must be ascending distinct cells apart from start and lock";
    }
    previous = mark;
  }
  if (layout.lengths.length !== PIECES) return `there must be ${String(PIECES)} pieces`;
  for (const length of layout.lengths) {
    if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) return "a piece length is out of range";
  }
  if (start.order.length !== PIECES || new Set(start.order).size !== PIECES) return "the order is not a permutation";
  for (const id of start.order) {
    if (!Number.isInteger(id) || id < 0 || id >= PIECES) return "the order is not a permutation";
  }
  if (start.facing.length !== PIECES || !start.facing.every(isDirection)) return "a facing is not a direction";
  return null;
}

/**
 * Builds a puzzle and proves it on the way: exactly one route, and a par. A
 * layout that fails either is refused, so a malformed manifest entry becomes a
 * readable failure rather than a day nobody can finish.
 */
export function makePuzzle(
  number: PuzzleNumber,
  layout: Layout,
  start: Arrangement,
  levers: readonly string[],
): Result<RotateLockPuzzle, MakeFailure> {
  const problem = layoutProblem(layout, start);
  if (problem !== null) return err({ detail: problem });
  const solved = solve(layout);
  if (solved.routes.length !== 1) {
    return err({ detail: `${String(solved.routes.length)} routes open the lock, not one` });
  }
  const route = solved.routes[0] ?? [];
  const par = parOf(start, arrangementsFor(layout, route));
  if (par === null) return err({ detail: "no arrangement draws the route" });
  if (par === 0) return err({ detail: "the tray already opens the lock" });
  return ok({
    number,
    start: layout.start,
    lock: layout.lock,
    marks: layout.marks.slice(),
    lengths: layout.lengths.slice(),
    startOrder: start.order.slice(),
    startFacing: start.facing.slice(),
    par,
    difficulty: solved.deadTurns,
    levers: levers.slice(),
  });
}

export function initialState(puzzle: RotateLockPuzzle): RotateLockState {
  const arrangement = { order: puzzle.startOrder, facing: puzzle.startFacing };
  return {
    puzzle,
    order: puzzle.startOrder,
    facing: puzzle.startFacing,
    moves: [],
    history: [arrangementKey(arrangement)],
    open: trace(puzzle, arrangement).open,
  };
}

export function traceOf(state: RotateLockState): Trace {
  return trace(state.puzzle, state);
}

export function isTerminal(state: RotateLockState): boolean {
  return state.open || state.moves.length >= MOVE_CAP;
}

const GAME_OVER: Rejection = { code: "game-over", announce: "The lock is already finished for today." };
const UNKNOWN_PIECE: Rejection = { code: "unknown-piece", announce: "That piece is not in the tray." };
const SAME_PIECE: Rejection = { code: "same-piece", announce: "Choose two different pieces to swap." };

function isPiece(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < PIECES;
}

export function applyAction(state: RotateLockState, action: RotateLockAction): Result<RotateLockState, Rejection> {
  if (isTerminal(state)) return err(GAME_OVER);

  let order = state.order;
  let facing = state.facing;
  if (action.kind === "swap") {
    if (!isPiece(action.a) || !isPiece(action.b)) return err(UNKNOWN_PIECE);
    if (action.a === action.b) return err(SAME_PIECE);
    const next = order.slice();
    const slotA = next.indexOf(action.a);
    const slotB = next.indexOf(action.b);
    next[slotA] = action.b;
    next[slotB] = action.a;
    order = next;
  } else {
    if (!isPiece(action.piece)) return err(UNKNOWN_PIECE);
    const next = facing.slice();
    next[action.piece] = turnClockwise(next[action.piece] as Direction);
    facing = next;
  }

  const arrangement = { order, facing };
  const key = arrangementKey(arrangement);
  const revisit = state.history.includes(key);
  const record: MoveRecord =
    action.kind === "swap"
      ? { kind: "swap", a: action.a, b: action.b, revisit }
      : { kind: "rotate", piece: action.piece, revisit };
  return ok({
    puzzle: state.puzzle,
    order,
    facing,
    moves: [...state.moves, record],
    history: [...state.history, key],
    open: trace(state.puzzle, arrangement).open,
  });
}

/** ROTATE-LOCK.md 6.5. Never null: par is exact on every day. */
export function tierFor(state: RotateLockState): TierOrdinal {
  if (!state.open) return 4;
  const over = state.moves.length - state.puzzle.par;
  let tier = 0;
  while (tier < TIER_OVER.length && over > (TIER_OVER[tier] as number)) tier += 1;
  return tier as TierOrdinal;
}

/** Buckets and tiers coincide, one to one. */
export function bucketFor(state: RotateLockState): BucketId {
  return tierFor(state);
}

export function finishedOutcomeFor(state: RotateLockState): FinishedOutcomeV3 {
  const moves = state.moves.length;
  return {
    kind: "finished",
    score: moves,
    won: state.open,
    detail: state.open
      ? `Opened in ${String(moves)} ${moves === 1 ? "move" : "moves"}, par ${String(state.puzzle.par)}`
      : `Jammed after ${String(moves)} moves, par ${String(state.puzzle.par)}`,
    tier: tierFor(state),
    bucket: bucketFor(state),
    difficulty: state.puzzle.difficulty,
  };
}

export function inspect(state: RotateLockState): OutcomeV3 {
  return isTerminal(state) ? finishedOutcomeFor(state) : { kind: "ongoing" };
}

/* Two characters per move: two piece digits for a swap, `r` and a digit for a
   rotation. ROTATE-LOCK.md 19. */
export function encodeMoves(moves: readonly MoveRecord[]): string {
  return moves.map((move) => (move.kind === "swap" ? `${String(move.a)}${String(move.b)}` : `r${String(move.piece)}`)).join("");
}

export function decodeMoves(text: string): RotateLockAction[] | null {
  if (text.length % 2 !== 0 || text.length > MOVE_CAP * 2) return null;
  const actions: RotateLockAction[] = [];
  for (let at = 0; at < text.length; at += 2) {
    const head = text[at] as string;
    const tail = Number(text[at + 1]);
    if (!/^[0-9]$/.test(text[at + 1] as string)) return null;
    if (head === "r") actions.push({ kind: "rotate", piece: tail });
    else if (/^[0-9]$/.test(head)) actions.push({ kind: "swap", a: Number(head), b: tail });
    else return null;
  }
  return actions;
}

/** Replays a move list from the start. Null when any move is refused. */
export function replay(puzzle: RotateLockPuzzle, actions: readonly RotateLockAction[]): RotateLockState | null {
  let state = initialState(puzzle);
  for (const action of actions) {
    const next = applyAction(state, action);
    if (!next.ok) return null;
    state = next.value;
  }
  return state;
}
