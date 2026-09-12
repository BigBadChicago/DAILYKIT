/**
 * Layer 4. VECTOR board generation. VECTOR.md section 9 as revised.
 *
 * Rejection sampling does not work here and the measurement is in the design
 * document: filling blanks at random and keeping the boards that resolve gives
 * one board in twenty thousand at the clue counts this game wants. Boards are
 * carved instead. Start dense, then remove clues one at a time and keep every
 * removal that still resolves.
 *
 * Randomness arrives as a Draw rather than as an rng from core, so the carve is
 * testable against a local generator and the one line that names the engine's
 * rng lives in module.ts and in the tools.
 */

import {
  CELLS,
  COLS,
  ROWS,
  buildGeometry,
  candidateList,
  propagate,
  rowOf,
  colOf,
  type ArrowBoard,
  type ClueLayout,
  type Direction,
} from "./propagate.js";

/** The only randomness this file consumes. Matches core/rng's integer helper. */
export interface Draw {
  intBelow(bound: number): number;
}

export const START_CLUES = 22;
export const CLUE_FLOOR = 8;
export const CLUE_CEILING = 12;

/** Measured over 996 carved boards. Depth below four occurred twice. */
export const DEPTH_FLOOR = 4;
/** Cells assigned in round one, as a percentage of blanks. Rejects five percent. */
export const OPENING_MAX_PERCENT = 40;

export const SKELETON_TRIES = 6;
export const DERIVE_TRIES = 10;
export const REMOVAL_STALL_LIMIT = 40;
/** Carve attempts one puzzle may consume before the day is reported unfillable. */
export const ATTEMPT_CEILING = 600;

/**
 * Intensity is the difficulty integer: the mean round in which a cell was
 * forced, in hundredths. Depth alone takes four values on this board size, which
 * cannot carry seven weekday bands, and the measurement is in VECTOR.md 9.2.
 * Edges are the septiles of 955 screened boards. Changing one invalidates every
 * stored band, the same warning CIPHER's OPENING_GUESS carries.
 */
export const BAND_EDGES: readonly number[] = [217, 232, 244, 257, 271, 292];

/** Band per weekday, 0 Monday through 6 Sunday. Gentle Monday to hard Saturday,
 *  Sunday between Thursday and Friday, matching POKER GRID and CIPHER. */
export const WEEKDAY_BAND: readonly number[] = [0, 1, 2, 3, 5, 6, 4];

export interface GeneratedBoard {
  readonly clues: ClueLayout;
  readonly solution: ArrowBoard;
  readonly depth: number;
  readonly opening: number;
  readonly blanks: number;
  readonly intensity: number;
  readonly levers: readonly string[];
}

export interface GeneratedDay {
  readonly board: GeneratedBoard;
  /** Carve attempts consumed from this puzzle's stream, counting from zero. */
  readonly attempt: number;
}

/** Epoch 2026-01-05 is a Monday, so puzzle 1 is a Monday and no calendar is
 *  needed to know which band a day wants. */
export function weekdayOf(puzzleNumber: number): number {
  return (puzzleNumber - 1) % 7;
}

export function bandOf(intensity: number): number {
  let band = 0;
  while (band < BAND_EDGES.length && intensity > (BAND_EDGES[band] as number)) band += 1;
  return band;
}

export function bandForPuzzle(puzzleNumber: number): number {
  return WEEKDAY_BAND[weekdayOf(puzzleNumber)] as number;
}

function coversEveryLine(positions: readonly number[]): boolean {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const cell of positions) {
    rows.add(rowOf(cell));
    cols.add(colOf(cell));
  }
  return rows.size === ROWS && cols.size === COLS;
}

interface Derived {
  readonly clues: ClueLayout;
  readonly positions: readonly number[];
  readonly arrows: ArrowBoard;
  readonly board: GeneratedBoard | null;
}

/**
 * Place arrows on a clue skeleton and read the counts back off them. Every arrow
 * keeps its previous direction where that direction still reaches a clue, which
 * is what makes a removal a small perturbation rather than a fresh board.
 */
function derive(
  positions: readonly number[],
  previous: ArrowBoard | null,
  draw: Draw,
): Derived | null {
  const skeleton: (number | null)[] = new Array<number | null>(CELLS).fill(null);
  for (const cell of positions) skeleton[cell] = 0;
  const rays = buildGeometry(skeleton);

  for (const cell of rays.blankCells) {
    if (candidateList(rays, cell).length === 0) return null;
  }
  for (const clue of rays.clueCells) {
    if ((rays.suppliers.get(clue) ?? []).length === 0) return null;
  }

  const arrows: (Direction | null)[] = new Array<Direction | null>(CELLS).fill(null);
  const counts: number[] = new Array<number>(CELLS).fill(0);
  for (const cell of rays.blankCells) {
    const options = candidateList(rays, cell);
    const carried = previous === null ? null : previous[cell];
    const dir =
      carried !== null && carried !== undefined && options.includes(carried)
        ? carried
        : (options[draw.intBelow(options.length)] as Direction);
    arrows[cell] = dir;
    counts[rays.targets[cell * 4 + dir] as number] += 1;
  }

  const clues: (number | null)[] = skeleton.slice();
  for (const clue of rays.clueCells) clues[clue] = counts[clue] as number;

  const geometry = buildGeometry(clues);
  const result = propagate(geometry);
  if (result.kind !== "resolved") {
    return { clues, positions, arrows, board: null };
  }

  const blanks = geometry.blankCells.length;
  let total = 0;
  for (const cell of geometry.blankCells) total += result.rounds[cell] as number;

  return {
    clues,
    positions,
    arrows,
    board: {
      clues,
      solution: result.arrows,
      depth: result.depth,
      opening: result.opening,
      blanks,
      intensity: Math.floor((total * 100) / blanks),
      levers: leversFor(clues, geometry.clueCells),
    },
  };
}

/** One carve. Dense skeleton, then removals until the clue floor or a stall. */
export function carve(draw: Draw): GeneratedBoard | null {
  let current: Derived | null = null;

  for (let attempt = 0; attempt < SKELETON_TRIES && current === null; attempt += 1) {
    const columns = [0, 1, 2, 3, 4, 5];
    for (let i = columns.length - 1; i > 0; i -= 1) {
      const j = draw.intBelow(i + 1);
      const swap = columns[i] as number;
      columns[i] = columns[j] as number;
      columns[j] = swap;
    }
    const positions = new Set<number>();
    for (let row = 0; row < ROWS; row += 1) positions.add(row * COLS + (columns[row] as number));
    let guard = 0;
    while (positions.size < START_CLUES && guard < 400) {
      positions.add(draw.intBelow(CELLS));
      guard += 1;
    }
    if (positions.size < START_CLUES) continue;

    const seeded = [...positions];
    for (let tries = 0; tries < DERIVE_TRIES && current === null; tries += 1) {
      const candidate = derive(seeded, null, draw);
      if (candidate !== null && candidate.board !== null) current = candidate;
    }
  }
  if (current === null) return null;

  let stalled = 0;
  while (current.positions.length > CLUE_FLOOR && stalled < REMOVAL_STALL_LIMIT) {
    const drop = current.positions[draw.intBelow(current.positions.length)] as number;
    const remaining = current.positions.filter((cell) => cell !== drop);
    if (!coversEveryLine(remaining)) {
      stalled += 1;
      continue;
    }
    let accepted: Derived | null = null;
    for (let tries = 0; tries < DERIVE_TRIES && accepted === null; tries += 1) {
      const candidate = derive(remaining, current.arrows, draw);
      if (candidate !== null && candidate.board !== null) accepted = candidate;
    }
    if (accepted === null) {
      stalled += 1;
      continue;
    }
    current = accepted;
    stalled = 0;
  }

  if (current.positions.length > CLUE_CEILING) return null;
  return current.board;
}

/** The screens that apply on every path, manifest and fallback alike. */
export function passesScreens(board: GeneratedBoard): boolean {
  if (board.depth < DEPTH_FLOOR) return false;
  return board.opening * 100 <= OPENING_MAX_PERCENT * board.blanks;
}

/**
 * A manifest day. One stream per puzzle and no salts: a carve consumes a
 * variable number of draws, so the stream position already distinguishes
 * attempts and a salt would only add a second way to say the same thing.
 * The recorded attempt is what verification replays.
 */
export function generateForPuzzle(puzzleNumber: number, draw: Draw): GeneratedDay | null {
  const wanted = bandForPuzzle(puzzleNumber);
  for (let attempt = 0; attempt < ATTEMPT_CEILING; attempt += 1) {
    const board = carve(draw);
    if (board === null) continue;
    if (!passesScreens(board)) continue;
    if (bandOf(board.intensity) !== wanted) continue;
    return { board, attempt };
  }
  return null;
}

/**
 * Past the horizon. Solvability and the screens, never the band, so an unlucky
 * stream cannot loop. VECTOR.md 9.3.
 */
export function generateUnrated(draw: Draw, ceiling = 60): GeneratedBoard | null {
  for (let attempt = 0; attempt < ceiling; attempt += 1) {
    const board = carve(draw);
    if (board !== null && passesScreens(board)) return board;
  }
  return null;
}

function leversFor(clues: ClueLayout, clueCells: readonly number[]): readonly string[] {
  const levers: string[] = [];
  if (clueCells.length <= 9) levers.push("clue-sparse");
  if (clueCells.length >= 11) levers.push("clue-dense");

  let zeros = 0;
  let edge = 0;
  let centre = 0;
  for (const cell of clueCells) {
    if (clues[cell] === 0) zeros += 1;
    const row = rowOf(cell);
    const col = colOf(cell);
    const onEdge = row === 0 || col === 0 || row === ROWS - 1 || col === COLS - 1;
    if (onEdge) edge += 1;
    else centre += 1;
  }
  if (zeros >= 3) levers.push("zero-heavy");
  if (edge * 10 >= clueCells.length * 7) levers.push("edge-weighted");
  if (centre * 2 >= clueCells.length) levers.push("centre-weighted");

  return levers.length === 0 ? ["none"] : levers;
}

/**
 * The tutorial board. Eleven clues, depth four, and an intensity below the
 * gentlest band's floor, so it cannot drift harder than the Monday it precedes.
 * Carved once and pasted here. Its numbers are recomputed rather than written
 * down, so this constant cannot disagree with the propagator.
 */
export const FIRST_SESSION_LAYOUT: ClueLayout = [
  null, null, 3, null, 0, null,
  null, null, null, null, 3, null,
  null, 5, null, 0, null, 2,
  null, null, 4, null, null, null,
  1, 2, null, null, 0, null,
  5, null, null, null, null, null,
];

export function firstSessionBoard(): GeneratedBoard {
  const geometry = buildGeometry(FIRST_SESSION_LAYOUT);
  const result = propagate(geometry);
  if (result.kind !== "resolved") {
    throw new Error("the first session layout does not resolve");
  }
  const blanks = geometry.blankCells.length;
  let total = 0;
  for (const cell of geometry.blankCells) total += result.rounds[cell] as number;
  return {
    clues: FIRST_SESSION_LAYOUT,
    solution: result.arrows,
    depth: result.depth,
    opening: result.opening,
    blanks,
    intensity: Math.floor((total * 100) / blanks),
    levers: leversFor(FIRST_SESSION_LAYOUT, geometry.clueCells),
  };
}
