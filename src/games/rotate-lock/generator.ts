/**
 * Layer 4. ROTATE LOCK generation. ROTATE-LOCK.md sections 7, 11, 12 and 18.
 *
 * Direct construction: draw a route, cut it into pieces, mark its corners, hide
 * some, then scramble the tray. Randomness arrives as a Draw so the tools and
 * the module each name the engine's rng once, the seam VECTOR uses.
 */

import {
  CELLS,
  DIRECTIONS,
  MAX_LENGTH,
  PIECES,
  SIZE,
  colOf,
  rowOf,
  stepFrom,
  trace,
  type Arrangement,
  type Direction,
  type Layout,
} from "./route.js";
import { makePuzzle, type RotateLockPuzzle } from "./rules.js";
import { solve, type Leg } from "./solver.js";

/** The only randomness this file consumes. Matches core/rng's integer helper. */
export interface Draw {
  intBelow(bound: number): number;
}

export const MIN_SEGMENTS = 4;
export const MAX_SEGMENTS = 6;
export const MAX_SEGMENT_LENGTH = 5;
export const MIN_MARKS = 2;
/** Hidden turn lever values. Three leaves one route in a hundred unique. */
export const HIDDEN_TURNS: readonly number[] = [0, 1, 2];

export const PAR_FLOOR = 8;
export const PAR_CEILING = 14;
export const SCRAMBLE_TRIES = 40;

/** Attempts one manifest day may consume before it is reported unfillable. */
export const ATTEMPT_CEILING = 40000;
/** Attempts the browser spends past the horizon. ROTATE-LOCK.md 18. */
export const FALLBACK_ATTEMPTS = 4000;

/**
 * Upper edges of bands 0 to 5 over dead turns; band 6 is everything above.
 * The septiles of the screened sample in data/rotate-lock/study.json, written
 * by tools/rotate-lock-calibrate.ts. Changing an edge invalidates every stored
 * band, so it is a manifest regeneration and not a tweak.
 */
export const BAND_EDGES: readonly number[] = [168, 263, 365, 495, 691, 1013];

/** Band per weekday, 0 Monday through 6 Sunday, the suite's weekly curve. */
export const WEEKDAY_BAND: readonly number[] = [0, 1, 2, 3, 5, 6, 4];

export type RejectReason =
  | "route"
  | "piece-count"
  | "marks"
  | "decomposition"
  | "symmetry"
  | "uniqueness"
  | "scramble"
  | "band";

/** Section 10.2 accounting. Counted by reason, in screen order. */
export type Tally = Record<RejectReason | "accepted", number>;

export function emptyTally(): Tally {
  return {
    route: 0,
    "piece-count": 0,
    marks: 0,
    decomposition: 0,
    symmetry: 0,
    uniqueness: 0,
    scramble: 0,
    band: 0,
    accepted: 0,
  };
}

export interface Candidate {
  readonly layout: Layout;
  readonly legs: readonly Leg[];
  readonly hidden: number;
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

/** Steps 1 to 3 of ROTATE-LOCK.md 7. Null with the reason it was dropped. */
export function drawCandidate(draw: Draw): Candidate | RejectReason {
  const start = draw.intBelow(CELLS);
  const segments = MIN_SEGMENTS + draw.intBelow(MAX_SEGMENTS - MIN_SEGMENTS + 1);
  const visited = new Set<number>([start]);
  const legs: Leg[] = [];
  const corners: number[] = [];
  let pos = start;
  let prev: Direction | null = null;

  for (let s = 0; s < segments; s += 1) {
    const options = DIRECTIONS.filter((dir) => prev === null || (dir !== prev && dir !== (prev + 2) % 4));
    const dir = options[draw.intBelow(options.length)] as Direction;
    let run = 0;
    for (let at = stepFrom(pos, dir); at >= 0 && !visited.has(at); at = stepFrom(at, dir)) run += 1;
    if (run === 0) return "route";
    const length = 1 + draw.intBelow(Math.min(run, MAX_SEGMENT_LENGTH));
    if (s > 0) corners.push(pos);
    for (let i = 0; i < length; i += 1) {
      pos = stepFrom(pos, dir);
      visited.add(pos);
    }
    legs.push({ dir, length });
    prev = dir;
  }

  const lengths: number[] = [];
  for (const leg of legs) {
    let left = leg.length;
    while (left > 0) {
      const piece = 1 + draw.intBelow(Math.min(MAX_LENGTH, left));
      lengths.push(piece);
      left -= piece;
    }
  }
  if (lengths.length !== PIECES) return "piece-count";

  const hidden = HIDDEN_TURNS[draw.intBelow(HIDDEN_TURNS.length)] as number;
  const marks = corners.slice();
  for (let h = 0; h < hidden; h += 1) marks.splice(draw.intBelow(marks.length), 1);
  if (marks.length < MIN_MARKS) return "marks";
  marks.sort((a, b) => a - b);

  return { layout: { start, lock: pos, marks, lengths }, legs, hidden };
}

/**
 * ROTATE-LOCK.md 11. False when the seven piece problem falls apart into one
 * piece problems: one piece per leg, or no leg length that two different sub
 * multisets of the lengths can make.
 */
export function passesDecomposition(lengths: readonly number[], legs: readonly Leg[]): boolean {
  if (lengths.length <= legs.length) return false;
  const ways = new Map<number, Set<string>>();
  for (let mask = 1; mask < 1 << lengths.length; mask += 1) {
    const picked: number[] = [];
    let sum = 0;
    for (let i = 0; i < lengths.length; i += 1) {
      if (((mask >> i) & 1) === 1) {
        picked.push(lengths[i] as number);
        sum += lengths[i] as number;
      }
    }
    picked.sort((a, b) => a - b);
    const seen = ways.get(sum) ?? new Set<string>();
    seen.add(picked.join(""));
    ways.set(sum, seen);
  }
  return legs.some((leg) => (ways.get(leg.length)?.size ?? 0) >= 2);
}

/** The eight maps of the square, identity first. */
export function dihedral(cell: number, map: number): number {
  const r = rowOf(cell);
  const c = colOf(cell);
  const n = SIZE - 1;
  const coords: readonly (readonly [number, number])[] = [
    [r, c],
    [c, n - r],
    [n - r, n - c],
    [n - c, r],
    [r, n - c],
    [n - r, c],
    [c, r],
    [n - c, n - r],
  ];
  const [row, col] = coords[map] as readonly [number, number];
  return row * SIZE + col;
}

/** ROTATE-LOCK.md 12.3. False when a non identity map fixes start, lock and marks. */
export function passesSymmetry(layout: Layout): boolean {
  const marks = new Set(layout.marks);
  for (let map = 1; map < 8; map += 1) {
    if (dihedral(layout.start, map) !== layout.start || dihedral(layout.lock, map) !== layout.lock) continue;
    if (layout.marks.every((mark) => marks.has(dihedral(mark, map)))) return false;
  }
  return true;
}

export function leversFor(candidate: Candidate): readonly string[] {
  return [`hidden-${String(candidate.hidden)}`, `segments-${String(candidate.legs.length)}`];
}

/** Step 5: a tray order and facings with par in range. */
function scramble(
  draw: Draw,
  puzzleNumber: number,
  candidate: Candidate,
): RotateLockPuzzle | null {
  for (let tries = 0; tries < SCRAMBLE_TRIES; tries += 1) {
    const order = [0, 1, 2, 3, 4, 5, 6];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = draw.intBelow(i + 1);
      const swap = order[i] as number;
      order[i] = order[j] as number;
      order[j] = swap;
    }
    const facing = order.map(() => draw.intBelow(4) as Direction);
    const start: Arrangement = { order, facing };
    if (trace(candidate.layout, start).open) continue;
    const made = makePuzzle(puzzleNumber, candidate.layout, start, leversFor(candidate));
    if (!made.ok) return null;
    if (made.value.par >= PAR_FLOOR && made.value.par <= PAR_CEILING) return made.value;
  }
  return null;
}

/** One attempt through every screen but the band. */
export function attempt(draw: Draw, puzzleNumber: number, tally: Tally): RotateLockPuzzle | null {
  const candidate = drawCandidate(draw);
  if (typeof candidate === "string") {
    tally[candidate] += 1;
    return null;
  }
  if (!passesDecomposition(candidate.layout.lengths, candidate.legs)) {
    tally.decomposition += 1;
    return null;
  }
  if (!passesSymmetry(candidate.layout)) {
    tally.symmetry += 1;
    return null;
  }
  /* Two routes are enough to refuse, so this search stops early; the full one
     that measures difficulty runs once, inside makePuzzle, on a survivor. */
  if (solve(candidate.layout, 2).routes.length !== 1) {
    tally.uniqueness += 1;
    return null;
  }
  const puzzle = scramble(draw, puzzleNumber, candidate);
  if (puzzle === null) {
    tally.scramble += 1;
    return null;
  }
  return puzzle;
}

export interface GeneratedDay {
  readonly puzzle: RotateLockPuzzle;
  /** Attempts consumed from this puzzle's stream before the accepted one. */
  readonly attempt: number;
}

/** A manifest day: one stream per puzzle, no salts, the attempt count recorded. */
export function generateForPuzzle(puzzleNumber: number, draw: Draw, tally: Tally = emptyTally()): GeneratedDay | null {
  const wanted = bandForPuzzle(puzzleNumber);
  for (let index = 0; index < ATTEMPT_CEILING; index += 1) {
    const puzzle = attempt(draw, puzzleNumber, tally);
    if (puzzle === null) continue;
    if (bandOf(puzzle.difficulty) !== wanted) {
      tally.band += 1;
      continue;
    }
    tally.accepted += 1;
    return { puzzle, attempt: index };
  }
  return null;
}

/** Past the horizon: every screen but the band, so an unlucky stream cannot loop. */
export function generateUnrated(puzzleNumber: number, draw: Draw, ceiling = FALLBACK_ATTEMPTS): RotateLockPuzzle | null {
  const tally = emptyTally();
  for (let index = 0; index < ceiling; index += 1) {
    const puzzle = attempt(draw, puzzleNumber, tally);
    if (puzzle !== null) return puzzle;
  }
  return null;
}

/**
 * The tutorial board, fixed. Every corner marked, four legs, par 3, and the
 * gentlest dead turn count found in 200,000 draws of that shape; the generator
 * tests assert it sits inside the Monday band rather than trust this comment.
 */
export const FIRST_SESSION: { readonly layout: Layout; readonly start: Arrangement } = {
  layout: { start: 0, lock: 1, marks: [4, 6, 10], lengths: [1, 3, 1, 1, 1, 1, 1] },
  start: { order: [1, 0, 2, 3, 4, 5, 6], facing: [2, 1, 1, 3, 3, 2, 3] },
};

export function firstSessionPuzzle(): RotateLockPuzzle {
  const made = makePuzzle(0, FIRST_SESSION.layout, FIRST_SESSION.start, ["first-session"]);
  if (!made.ok) throw new Error(`the first session board is not a puzzle: ${made.error.detail}`);
  return made.value;
}
