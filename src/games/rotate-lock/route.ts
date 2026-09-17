/**
 * Layer 4. ROTATE LOCK geometry and the trace. ROTATE-LOCK.md section 6.
 *
 * Pure and table free. The trace is the whole rule: every other file asks it
 * whether an arrangement opens the lock, and nothing re-states a rule of its own
 * except the independent verifier, which is not allowed to import this file's
 * search partner, solver.ts.
 */

export const SIZE = 6;
export const CELLS = SIZE * SIZE;
export const PIECES = 7;
export const MIN_LENGTH = 1;
export const MAX_LENGTH = 3;
/** Corners a route can have: segments run from 4 to 6. */
export const MAX_MARKS = 5;

/** 0 up, 1 right, 2 down, 3 left. A clockwise quarter turn adds one. */
export type Direction = 0 | 1 | 2 | 3;
export const DIRECTIONS: readonly Direction[] = [0, 1, 2, 3];

const DR: readonly number[] = [-1, 0, 1, 0];
const DC: readonly number[] = [0, 1, 0, -1];

export function rowOf(cell: number): number {
  return Math.floor(cell / SIZE);
}

export function colOf(cell: number): number {
  return cell % SIZE;
}

/** The neighbouring cell, or -1 off the board. */
export function stepFrom(cell: number, dir: Direction): number {
  const row = rowOf(cell) + (DR[dir] as number);
  const col = colOf(cell) + (DC[dir] as number);
  return row < 0 || row >= SIZE || col < 0 || col >= SIZE ? -1 : row * SIZE + col;
}

export function turnClockwise(dir: Direction): Direction {
  return ((dir + 1) % 4) as Direction;
}

export function isDirection(value: unknown): value is Direction {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/** What the board shows every player: fixed for the day. */
export interface Layout {
  readonly start: number;
  readonly lock: number;
  /** Ascending. */
  readonly marks: readonly number[];
  /** `lengths[id]` for piece `id`. */
  readonly lengths: readonly number[];
}

/** An arrangement: the tray order by slot, and each piece's facing by id. */
export interface Arrangement {
  readonly order: readonly number[];
  readonly facing: readonly Direction[];
}

export type TraceFailure =
  | "off-board"
  | "crossing"
  | "through-mark"
  | "early-lock"
  | "short-of-lock"
  | "missed-marks";

/** One cell the route entered, and the direction it entered moving. */
export interface RouteStep {
  readonly cell: number;
  readonly dir: Direction;
  /** Tray slot of the piece that entered it. */
  readonly slot: number;
}

export interface Trace {
  readonly steps: readonly RouteStep[];
  readonly open: boolean;
  readonly failure: TraceFailure | null;
  /** Slot of the piece where the trace failed, or null when it walked every piece. */
  readonly failedSlot: number | null;
  /** The cell the failing step tried to enter, or -1 off the board or none. */
  readonly failedCell: number;
  /** Marks the route turned at. */
  readonly turned: readonly number[];
}

/**
 * ROTATE-LOCK.md 6.2, rule by rule. Never throws on any arrangement of the right
 * shape; a structurally bad arrangement is the parser's business, not this one.
 */
export function trace(layout: Layout, arrangement: Arrangement): Trace {
  const markSet = new Set(layout.marks);
  const visited = new Set<number>([layout.start]);
  const steps: RouteStep[] = [];
  const turned: number[] = [];
  const slots = arrangement.order.length;
  let pos = layout.start;
  let prev: Direction | null = null;

  const fail = (failure: TraceFailure, slot: number | null, cell: number): Trace => ({
    steps,
    open: false,
    failure,
    failedSlot: slot,
    failedCell: cell,
    turned,
  });

  for (let slot = 0; slot < slots; slot += 1) {
    const id = arrangement.order[slot] as number;
    const dir = arrangement.facing[id] as Direction;
    const length = layout.lengths[id] as number;
    if (prev !== null) {
      if (dir === prev) {
        if (markSet.has(pos)) return fail("through-mark", slot, pos);
      } else if (markSet.has(pos)) {
        turned.push(pos);
      }
    }
    for (let i = 0; i < length; i += 1) {
      const next = stepFrom(pos, dir);
      if (next < 0) return fail("off-board", slot, -1);
      if (visited.has(next)) return fail("crossing", slot, next);
      const lastOfPiece = i === length - 1;
      if (markSet.has(next) && !lastOfPiece) return fail("through-mark", slot, next);
      if (next === layout.lock && !(lastOfPiece && slot === slots - 1)) return fail("early-lock", slot, next);
      visited.add(next);
      steps.push({ cell: next, dir, slot });
      pos = next;
    }
    prev = dir;
  }
  if (pos !== layout.lock) return fail("short-of-lock", null, -1);
  if (turned.length !== layout.marks.length) return fail("missed-marks", null, -1);
  return { steps, open: true, failure: null, failedSlot: null, failedCell: -1, turned };
}

/** Stable text key of an arrangement, for revisit detection and duplicates. */
export function arrangementKey(arrangement: Arrangement): string {
  return `${arrangement.order.join("")}:${arrangement.facing.join("")}`;
}
