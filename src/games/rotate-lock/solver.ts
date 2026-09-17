/**
 * Layer 4. The route solver, par and the difficulty measure. ROTATE-LOCK.md
 * sections 10.1, 10.3 and 14.
 *
 * The search is over routes, not arrangements: it chooses a length rather than a
 * piece, and orders a straight run of pieces by non decreasing length, so each
 * distinct partial route is visited once. No table, a few thousand nodes at the
 * hardest, so it ships in the browser and runs past the horizon, the same call
 * VECTOR made for its propagator. The independent check is
 * tools/rotate-lock-verify.ts, which never imports this file.
 */

import {
  CELLS,
  DIRECTIONS,
  MAX_LENGTH,
  colOf,
  rowOf,
  stepFrom,
  type Arrangement,
  type Direction,
  type Layout,
} from "./route.js";

/** A straight stretch of the route between two turns, collinear pieces merged. */
export interface Leg {
  readonly dir: Direction;
  readonly length: number;
}

export interface SolveResult {
  /** Distinct routes that open the lock, up to the limit asked for. */
  readonly routes: readonly (readonly Leg[])[];
  /** ROTATE-LOCK.md 14. Distinct dead partial routes that had just turned. */
  readonly deadTurns: number;
  readonly nodes: number;
}

export function legsKey(legs: readonly Leg[]): string {
  return legs.map((leg) => `${String(leg.dir)}${String(leg.length)}`).join(".");
}

/**
 * Exhaustive unless `limit` stops it. The dead turn count is only the section 14
 * measure when the search ran to completion, so `difficultyOf` passes no limit.
 */
export function solve(layout: Layout, limit = Number.POSITIVE_INFINITY): SolveResult {
  const counts = new Array<number>(MAX_LENGTH + 1).fill(0);
  let remainingLength = 0;
  for (const length of layout.lengths) {
    counts[length] = (counts[length] as number) + 1;
    remainingLength += length;
  }
  let remainingPieces = layout.lengths.length;
  const isMark = new Uint8Array(CELLS);
  for (const mark of layout.marks) isMark[mark] = 1;
  const visited = new Uint8Array(CELLS);
  visited[layout.start] = 1;
  const lockRow = rowOf(layout.lock);
  const lockCol = colOf(layout.lock);

  const routes = new Map<string, Leg[]>();
  const dead = new Set<string>();
  const legs: Leg[] = [];
  let turned = 0;
  let nodes = 0;

  function search(pos: number, prev: Direction | null, prevLength: number): boolean {
    nodes += 1;
    if (remainingPieces === 0) {
      if (pos !== layout.lock || turned !== layout.marks.length) return false;
      const found = legs.map((leg) => ({ ...leg }));
      routes.set(legsKey(found), found);
      return true;
    }
    const distance = Math.abs(rowOf(pos) - lockRow) + Math.abs(colOf(pos) - lockCol);
    if (distance > remainingLength || (remainingLength - distance) % 2 !== 0) return false;
    if (layout.marks.length - turned > remainingPieces) return false;

    let completes = false;
    for (let length = 1; length <= MAX_LENGTH; length += 1) {
      if (counts[length] === 0) continue;
      for (const dir of DIRECTIONS) {
        if (routes.size >= limit) return completes;
        const straight = prev === dir;
        if (prev === null && isMark[pos] === 1) continue;
        if (straight && (isMark[pos] === 1 || length < prevLength)) continue;
        const turn = prev !== null && !straight;

        const walked: number[] = [];
        let at = pos;
        let fits = true;
        for (let i = 0; i < length; i += 1) {
          const next = stepFrom(at, dir);
          const last = i === length - 1;
          if (
            next < 0 ||
            visited[next] === 1 ||
            (isMark[next] === 1 && !last) ||
            (next === layout.lock && !(last && remainingPieces === 1))
          ) {
            fits = false;
            break;
          }
          visited[next] = 1;
          walked.push(next);
          at = next;
        }

        if (fits) {
          counts[length] = (counts[length] as number) - 1;
          remainingLength -= length;
          remainingPieces -= 1;
          const markTurn = turn && isMark[pos] === 1;
          if (markTurn) turned += 1;
          const extended = straight && legs.length > 0;
          if (extended) {
            const top = legs[legs.length - 1] as Leg;
            legs[legs.length - 1] = { dir, length: top.length + length };
          } else {
            legs.push({ dir, length });
          }

          const ok = search(at, dir, length);
          if (ok) completes = true;
          else if (turn) dead.add(`${legsKey(legs)}|${counts.join("")}`);

          if (extended) {
            const top = legs[legs.length - 1] as Leg;
            legs[legs.length - 1] = { dir, length: top.length - length };
          } else {
            legs.pop();
          }
          if (markTurn) turned -= 1;
          counts[length] = (counts[length] as number) + 1;
          remainingLength += length;
          remainingPieces += 1;
        }
        for (const cell of walked) visited[cell] = 0;
      }
    }
    return completes;
  }

  search(layout.start, null, 0);
  return { routes: [...routes.values()], deadTurns: dead.size, nodes };
}

/** The section 14 integer. Recomputed from the layout, never read from a manifest. */
export function difficultyOf(layout: Layout): number {
  return solve(layout).deadTurns;
}

/**
 * Every arrangement that draws the given route: piece ids assigned to legs in
 * order, each piece facing its leg. ROTATE-LOCK.md 10.4.
 */
export function arrangementsFor(layout: Layout, route: readonly Leg[]): Arrangement[] {
  const pieces = layout.lengths.length;
  const used = new Uint8Array(pieces);
  const order: number[] = [];
  const facing = new Array<Direction>(pieces).fill(0);
  const out: Arrangement[] = [];

  function place(leg: number, filled: number): void {
    if (order.length === pieces) {
      if (leg === route.length) out.push({ order: order.slice(), facing: facing.slice() });
      return;
    }
    const current = route[leg];
    if (current === undefined) return;
    for (let id = 0; id < pieces; id += 1) {
      if (used[id] === 1) continue;
      const length = layout.lengths[id] as number;
      if (filled + length > current.length) continue;
      used[id] = 1;
      order.push(id);
      facing[id] = current.dir;
      const done = filled + length === current.length;
      place(done ? leg + 1 : leg, done ? 0 : filled + length);
      order.pop();
      used[id] = 0;
    }
  }

  place(0, 0);
  return out;
}

/** Moves from one arrangement to another: clockwise quarter turns plus swaps. */
export function movesBetween(from: Arrangement, to: Arrangement): number {
  const pieces = from.order.length;
  let rotations = 0;
  for (let id = 0; id < pieces; id += 1) {
    rotations += ((to.facing[id] as number) - (from.facing[id] as number) + 4) % 4;
  }
  const targetSlot = new Array<number>(pieces).fill(0);
  for (let slot = 0; slot < pieces; slot += 1) targetSlot[to.order[slot] as number] = slot;
  const seen = new Uint8Array(pieces);
  let cycles = 0;
  for (let slot = 0; slot < pieces; slot += 1) {
    if (seen[slot] === 1) continue;
    cycles += 1;
    let at = slot;
    while (seen[at] === 0) {
      seen[at] = 1;
      at = targetSlot[from.order[at] as number] as number;
    }
  }
  return rotations + pieces - cycles;
}

/** Fewest moves from `start` to any open arrangement, or null when none opens. */
export function parOf(start: Arrangement, openings: readonly Arrangement[]): number | null {
  let best: number | null = null;
  for (const target of openings) {
    const moves = movesBetween(start, target);
    if (best === null || moves < best) best = moves;
  }
  return best;
}
