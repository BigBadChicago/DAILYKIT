/**
 * Layer 4. VECTOR geometry and the deduction engine. VECTOR.md sections 3 and 7.
 *
 * This file ships in the browser bundle, which inverts CIPHER's split. It
 * carries no table, and both the reveal on a loss and the past horizon fallback
 * are only trustworthy with it. PHASE-13-PLAN.md rule 6.
 *
 * No imports. Geometry is a pure function of a clue layout, and the propagator
 * is a pure function of geometry, so the generator, the verifier, the module and
 * the renderer all read the same answer from the same code.
 */

export const COLS = 6;
export const ROWS = 6;
export const CELLS = COLS * ROWS;

/** Clockwise from up. The order is also the tap cycle order. */
export type Direction = 0 | 1 | 2 | 3;
export const UP = 0 as Direction;
export const RIGHT = 1 as Direction;
export const DOWN = 2 as Direction;
export const LEFT = 3 as Direction;
export const DIRECTIONS: readonly Direction[] = [UP, RIGHT, DOWN, LEFT];

const STEP: readonly (readonly [number, number])[] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

/** Target of a direction that reaches no clue. */
export const NO_TARGET = -1;

/** One entry per cell. A number is a clue, null is a blank cell. */
export type ClueLayout = readonly (number | null)[];

/** One entry per cell. Null on clue cells and on unfilled blanks. */
export type ArrowBoard = readonly (Direction | null)[];

export interface Supplier {
  readonly cell: number;
  readonly dir: Direction;
}

export interface Geometry {
  readonly clues: ClueLayout;
  readonly clueCells: readonly number[];
  readonly blankCells: readonly number[];
  /** targets[cell * 4 + dir] is a clue cell index or NO_TARGET. */
  readonly targets: readonly number[];
  /** Bit d set means direction d reaches a clue. Zero on clue cells. */
  readonly candidates: readonly number[];
  /** Keyed by clue cell. The transpose of candidates. Section 3.3. */
  readonly suppliers: ReadonlyMap<number, readonly Supplier[]>;
}

export function rowOf(cell: number): number {
  return Math.floor(cell / COLS);
}

export function colOf(cell: number): number {
  return cell % COLS;
}

export function cellAt(row: number, col: number): number {
  return row * COLS + col;
}

export function isOnBoard(cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < CELLS;
}

/** First clue cell along the ray, or NO_TARGET. Only clues stop a ray. */
export function rayTarget(
  clues: ClueLayout,
  cell: number,
  dir: Direction,
): number {
  const step = STEP[dir];
  let row = rowOf(cell) + step[0];
  let col = colOf(cell) + step[1];
  while (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
    const at = cellAt(row, col);
    if (clues[at] !== null) return at;
    row += step[0];
    col += step[1];
  }
  return NO_TARGET;
}

export function buildGeometry(clues: ClueLayout): Geometry {
  const targets: number[] = new Array<number>(CELLS * 4).fill(NO_TARGET);
  const candidates: number[] = new Array<number>(CELLS).fill(0);
  const clueCells: number[] = [];
  const blankCells: number[] = [];
  const suppliers = new Map<number, Supplier[]>();

  for (let cell = 0; cell < CELLS; cell += 1) {
    if (clues[cell] !== null) {
      clueCells.push(cell);
      suppliers.set(cell, []);
      continue;
    }
    blankCells.push(cell);
  }

  for (const cell of blankCells) {
    for (const dir of DIRECTIONS) {
      const target = rayTarget(clues, cell, dir);
      targets[cell * 4 + dir] = target;
      if (target === NO_TARGET) continue;
      candidates[cell] |= 1 << dir;
      (suppliers.get(target) as Supplier[]).push({ cell, dir });
    }
  }

  return { clues, clueCells, blankCells, targets, candidates, suppliers };
}

export function candidateList(
  geometry: Geometry,
  cell: number,
): readonly Direction[] {
  const mask = geometry.candidates[cell];
  const out: Direction[] = [];
  for (const dir of DIRECTIONS) if (mask & (1 << dir)) out.push(dir);
  return out;
}

export function isCandidate(
  geometry: Geometry,
  cell: number,
  dir: Direction,
): boolean {
  return (geometry.candidates[cell] & (1 << dir)) !== 0;
}

/**
 * The tap. Advances to the next candidate in direction order and wraps past the
 * last one to empty, so four taps return a cell to where it started. There is no
 * backward cycle because a grid cell has one activation verb. VECTOR.md 14.4.
 */
export function nextCandidate(
  geometry: Geometry,
  cell: number,
  current: Direction | null,
): Direction | null {
  const list = candidateList(geometry, cell);
  if (list.length === 0) return null;
  if (current === null) return list[0];
  const at = list.indexOf(current);
  if (at < 0) return list[0];
  return at + 1 < list.length ? list[at + 1] : null;
}

/** Arrivals per cell. Non zero only on clue cells. */
export function arrivals(
  geometry: Geometry,
  arrows: ArrowBoard,
): readonly number[] {
  const counts: number[] = new Array<number>(CELLS).fill(0);
  for (const cell of geometry.blankCells) {
    const dir = arrows[cell];
    if (dir === null) continue;
    const target = geometry.targets[cell * 4 + dir];
    if (target !== NO_TARGET) counts[target] += 1;
  }
  return counts;
}

/**
 * The whole of correctness. No answer key is consulted, because uniqueness makes
 * satisfying every clue and being the solution the same statement. VECTOR.md 5.
 */
export function satisfies(geometry: Geometry, arrows: ArrowBoard): boolean {
  for (const cell of geometry.blankCells) if (arrows[cell] === null) return false;
  const counts = arrivals(geometry, arrows);
  for (const clue of geometry.clueCells) {
    if (counts[clue] !== geometry.clues[clue]) return false;
  }
  return true;
}

export type Propagation =
  | {
      readonly kind: "resolved";
      readonly arrows: ArrowBoard;
      /** Rounds taken. The difficulty measure. */
      readonly depth: number;
      /** Cells assigned in round one. The degeneracy screen. */
      readonly opening: number;
    }
  | { readonly kind: "stalled"; readonly depth: number; readonly assigned: number }
  | { readonly kind: "contradiction"; readonly depth: number; readonly reason: string };

/**
 * P1, P2 and P3 applied in rounds. A round reads the state as it stood when the
 * round began, so the depth does not depend on the order deductions happen to be
 * discovered in. A work queue would make the number unreproducible between the
 * generator and the verifier, which is the one thing this measure cannot afford.
 */
export function propagate(geometry: Geometry): Propagation {
  const domain = geometry.candidates.slice();
  const assigned: (Direction | null)[] = new Array<Direction | null>(CELLS).fill(null);
  const count = new Map<number, number>();
  for (const clue of geometry.clueCells) count.set(clue, 0);

  const live = (supplier: Supplier): boolean =>
    assigned[supplier.cell] === null &&
    (domain[supplier.cell] & (1 << supplier.dir)) !== 0;

  const needOf = (clue: number): number =>
    (geometry.clues[clue] as number) - (count.get(clue) as number);

  let remaining = geometry.blankCells.length;
  let depth = 0;
  let opening = 0;

  while (remaining > 0) {
    const assign = new Map<number, Direction>();
    const remove = new Set<number>();

    // P1, single.
    for (const cell of geometry.blankCells) {
      if (assigned[cell] !== null) continue;
      const mask = domain[cell];
      if (mask !== 0 && (mask & (mask - 1)) === 0) {
        for (const dir of DIRECTIONS) if (mask & (1 << dir)) assign.set(cell, dir);
      }
    }

    for (const clue of geometry.clueCells) {
      const need = needOf(clue);
      const possible = (geometry.suppliers.get(clue) as readonly Supplier[]).filter(live);
      // P2, full. A zero clue fires this in the first round.
      if (need === 0) {
        for (const supplier of possible) remove.add(supplier.cell * 4 + supplier.dir);
        continue;
      }
      // P3, forced.
      if (possible.length === need) {
        for (const supplier of possible) {
          const already = assign.get(supplier.cell);
          if (already !== undefined && already !== supplier.dir) {
            return { kind: "contradiction", depth, reason: "two directions forced on one cell" };
          }
          assign.set(supplier.cell, supplier.dir);
        }
      }
    }

    for (const [cell, dir] of assign) {
      if (remove.has(cell * 4 + dir)) {
        return { kind: "contradiction", depth, reason: "a forced direction was also refused" };
      }
    }

    let productive = false;
    for (const [cell, dir] of assign) {
      assigned[cell] = dir;
      domain[cell] = 0;
      const target = geometry.targets[cell * 4 + dir];
      count.set(target, (count.get(target) as number) + 1);
      remaining -= 1;
      productive = true;
    }
    for (const key of remove) {
      const cell = Math.floor(key / 4);
      const dir = (key % 4) as Direction;
      if (assigned[cell] !== null) continue;
      if (domain[cell] & (1 << dir)) {
        domain[cell] &= ~(1 << dir);
        productive = true;
      }
    }

    depth += 1;
    if (depth === 1) opening = assign.size;

    for (const clue of geometry.clueCells) {
      const need = needOf(clue);
      if (need < 0) return { kind: "contradiction", depth, reason: "a clue was oversubscribed" };
      const possible = (geometry.suppliers.get(clue) as readonly Supplier[]).filter(live).length;
      if (possible < need) {
        return { kind: "contradiction", depth, reason: "a clue lost the suppliers it needs" };
      }
    }
    for (const cell of geometry.blankCells) {
      if (assigned[cell] === null && domain[cell] === 0) {
        return { kind: "contradiction", depth, reason: "a cell was left with no direction" };
      }
    }

    if (!productive) {
      return { kind: "stalled", depth, assigned: geometry.blankCells.length - remaining };
    }
  }

  return { kind: "resolved", arrows: assigned, depth, opening };
}

/** The unique solution, or null on any board that does not resolve. */
export function solutionOf(geometry: Geometry): ArrowBoard | null {
  const result = propagate(geometry);
  return result.kind === "resolved" ? result.arrows : null;
}

/** Placement invariant 2. Every row and every column holds a clue. */
export function everyLineHasClue(clues: ClueLayout): boolean {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (let cell = 0; cell < CELLS; cell += 1) {
    if (clues[cell] === null) continue;
    rows.add(rowOf(cell));
    cols.add(colOf(cell));
  }
  return rows.size === ROWS && cols.size === COLS;
}

/** Placement invariant 4. The closed system. Section 3.1. */
export function cluesSumToBlanks(geometry: Geometry): boolean {
  let total = 0;
  for (const clue of geometry.clueCells) total += geometry.clues[clue] as number;
  return total === geometry.blankCells.length;
}
