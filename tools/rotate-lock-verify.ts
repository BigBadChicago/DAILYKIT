/**
 * Verifies the ROTATE LOCK horizon. A separate process from generation, and it
 * never imports solver.ts, so the uniqueness claim and par are checked by a
 * search that shares no code with the one that made them. ROTATE-LOCK.md 10.2.
 *
 *   npx tsx tools/rotate-lock-verify.ts --dir data/rotate-lock
 *
 * Seven assertions per day, in the document's order. The search is over
 * arrangements by piece id, pruned only by the trace rules as each piece is laid,
 * and it walks the board with its own stepping code rather than route.ts's.
 */

import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import {
  BAND_EDGES,
  bandForPuzzle,
  bandOf,
  generateForPuzzle,
  passesDecomposition,
  passesSymmetry,
} from "../src/games/rotate-lock/generator.js";
import { decodeLayout } from "../src/games/rotate-lock/layout-codec.js";
import { layoutProblem, makePuzzle } from "../src/games/rotate-lock/rules.js";
import type { Arrangement, Direction, Layout } from "../src/games/rotate-lock/route.js";
import { drawFor, layoutIdentity, type RotateLockEntry } from "./rotate-lock-generate.js";

const GAME_ID = "rotate-lock";
const HORIZON_DAYS = 365;
const LEVER_PATTERN = /^(hidden-[012]|segments-[456])$/;

export interface Enumeration {
  /** Distinct open routes, each as its visited cells joined. */
  readonly routes: ReadonlySet<string>;
  readonly openings: readonly Arrangement[];
  readonly nodes: number;
  /** The route legs of the first opening, direction and length, for the decomposition check. */
  readonly legs: readonly { readonly dir: Direction; readonly length: number }[];
}

/**
 * Every arrangement, piece by piece, pruned the moment a laid piece breaks a
 * trace rule. Written from ROTATE-LOCK.md 6.2 directly.
 */
export function enumerateOpenings(layout: Layout): Enumeration {
  const size = 6;
  const pieces = layout.lengths.length;
  const marks = new Set(layout.marks);
  const used = new Array<boolean>(pieces).fill(false);
  const visited = new Set<number>([layout.start]);
  const order: number[] = [];
  const facing = new Array<Direction>(pieces).fill(0);
  const cells: number[] = [];
  const turns = new Set<number>();
  const routes = new Set<string>();
  const openings: Arrangement[] = [];
  let firstLegs: { dir: Direction; length: number }[] = [];
  let nodes = 0;
  let remaining = layout.lengths.reduce((sum, length) => sum + length, 0);
  const lockRow = Math.floor(layout.lock / size);
  const lockCol = layout.lock % size;

  const move = (cell: number, dir: Direction): number => {
    const row = Math.floor(cell / size);
    const col = cell % size;
    if (dir === 0) return row === 0 ? -1 : cell - size;
    if (dir === 2) return row === size - 1 ? -1 : cell + size;
    if (dir === 1) return col === size - 1 ? -1 : cell + 1;
    return col === 0 ? -1 : cell - 1;
  };

  const lay = (pos: number, prev: Direction | null): void => {
    nodes += 1;
    if (order.length === pieces) {
      if (pos === layout.lock && turns.size === marks.size) {
        routes.add(cells.join(","));
        openings.push({ order: order.slice(), facing: facing.slice() });
        if (firstLegs.length === 0) {
          const legs: { dir: Direction; length: number }[] = [];
          for (const id of order) {
            const dir = facing[id] as Direction;
            const length = layout.lengths[id] as number;
            const top = legs[legs.length - 1];
            if (top !== undefined && top.dir === dir) top.length += length;
            else legs.push({ dir, length });
          }
          firstLegs = legs;
        }
      }
      return;
    }
    /* Sound: the lock must still be reachable in the cells left, at the same parity. */
    const distance = Math.abs(Math.floor(pos / size) - lockRow) + Math.abs((pos % size) - lockCol);
    if (distance > remaining || (remaining - distance) % 2 === 1) return;
    for (let id = 0; id < pieces; id += 1) {
      if (used[id]) continue;
      for (const dir of [0, 1, 2, 3] as const) {
        if (prev === dir && marks.has(pos)) continue;
        const isTurn = prev !== null && prev !== dir && marks.has(pos);
        const length = layout.lengths[id] as number;
        const laid: number[] = [];
        let at = pos;
        let broken = false;
        for (let step = 1; step <= length; step += 1) {
          const next = move(at, dir);
          const end = step === length;
          if (next < 0 || visited.has(next) || (marks.has(next) && !end) || (next === layout.lock && !(end && order.length === pieces - 1))) {
            broken = true;
            break;
          }
          visited.add(next);
          laid.push(next);
          at = next;
        }
        if (!broken) {
          used[id] = true;
          order.push(id);
          facing[id] = dir;
          cells.push(...laid);
          if (isTurn) turns.add(pos);
          remaining -= length;
          lay(at, dir);
          remaining += length;
          if (isTurn) turns.delete(pos);
          cells.length -= laid.length;
          order.pop();
          used[id] = false;
        }
        for (const cell of laid) visited.delete(cell);
      }
    }
  };

  lay(layout.start, null);
  return { routes, openings, nodes, legs: firstLegs };
}

/** Par by its own cycle count, ROTATE-LOCK.md 10.3. */
export function independentPar(start: Arrangement, openings: readonly Arrangement[]): number | null {
  let best: number | null = null;
  for (const target of openings) {
    let moves = 0;
    for (let id = 0; id < start.facing.length; id += 1) {
      moves += ((target.facing[id] as number) + 4 - (start.facing[id] as number)) % 4;
    }
    const where = new Map<number, number>();
    target.order.forEach((id, slot) => where.set(id, slot));
    const done = new Set<number>();
    for (let slot = 0; slot < start.order.length; slot += 1) {
      let length = 0;
      for (let at = slot; !done.has(at); at = where.get(start.order[at] as number) as number) {
        done.add(at);
        length += 1;
      }
      if (length > 1) moves += length - 1;
    }
    if (best === null || moves < best) best = moves;
  }
  return best;
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

function fail(puzzleNumber: number, why: string): never {
  stdout.write(`\npuzzle ${String(puzzleNumber)}: ${why}\n`);
  exit(1);
}

function main(): void {
  const dir = flag("dir", "data/rotate-lock");
  const index = JSON.parse(readFileSync(`${dir}/manifest.index.json`, "utf8")) as {
    codec?: unknown;
    horizon?: unknown;
    chunks?: { from: number; to: number; url: string }[];
  };
  if (index.codec !== MANIFEST_CODEC) fail(0, "index codec is not the engine codec");
  if (typeof index.horizon !== "number" || index.horizon < HORIZON_DAYS) fail(0, "horizon is shorter than a year");
  const horizon = index.horizon;

  const entries = new Map<number, RotateLockEntry>();
  for (const chunk of index.chunks ?? []) {
    const path = chunk.url.replace(/^\//, "");
    const body = JSON.parse(readFileSync(path, "utf8")) as { codec?: unknown; entries?: Record<string, RotateLockEntry> };
    if (body.codec !== MANIFEST_CODEC) fail(chunk.from, "chunk codec is not the engine codec");
    for (let n = chunk.from; n <= chunk.to; n += 1) {
      const entry = body.entries?.[String(n)];
      if (entry === undefined) fail(n, "missing from its chunk");
      entries.set(n, entry);
    }
  }

  const identities = new Map<string, number>();
  let nodes = 0;
  let maxNodes = 0;
  const started = Date.now();

  for (let n = 1; n <= horizon; n += 1) {
    const entry = entries.get(n);
    if (entry === undefined) fail(n, "not covered by any chunk");

    /* 1. Structure. */
    const decoded = decodeLayout(n, entry.layout);
    if (decoded === null) fail(n, "layout does not decode");
    const problem = layoutProblem(decoded.layout, decoded.start);
    if (problem !== null) fail(n, problem);
    if (!Array.isArray(entry.levers) || !entry.levers.every((lever) => LEVER_PATTERN.test(lever))) fail(n, "unknown lever");

    /* 2. Replay the generator from the seed. */
    const replayed = generateForPuzzle(n, drawFor(n));
    if (replayed === null || replayed.attempt !== entry.attempt) fail(n, "the stream does not reproduce the recorded attempt");
    if (replayed.puzzle.number !== n || layoutIdentity(replayed.puzzle) !== layoutIdentity({ ...decoded.layout, startOrder: decoded.start.order, startFacing: decoded.start.facing })) {
      fail(n, "the regenerated layout differs from the stored one");
    }

    /* 3. Uniqueness, EXACT, by the independent enumeration. */
    const found = enumerateOpenings(decoded.layout);
    nodes += found.nodes;
    maxNodes = Math.max(maxNodes, found.nodes);
    if (found.routes.size !== 1) fail(n, `${String(found.routes.size)} routes open the lock`);

    /* 4. Par. */
    const par = independentPar(decoded.start, found.openings);
    if (par !== entry.best.par) fail(n, `par ${String(par)} but the entry stores ${String(entry.best.par)}`);

    /* 5. Difficulty and band, through the module's measure. */
    const made = makePuzzle(n, decoded.layout, decoded.start, entry.levers);
    if (!made.ok) fail(n, made.error.detail);
    if (made.value.par !== par) fail(n, "the game's par disagrees with the independent par");
    if (made.value.difficulty !== entry.best.difficulty) fail(n, "stored difficulty is not the measured one");
    if (bandOf(made.value.difficulty) !== bandForPuzzle(n)) fail(n, "difficulty is outside the weekday band");

    /* 6. Decomposition and symmetry, sections 11 and 12. */
    if (!passesDecomposition(decoded.layout.lengths, found.legs)) fail(n, "decomposes into one piece problems");
    if (!passesSymmetry(decoded.layout)) fail(n, "a board symmetry fixes the layout");

    /* 7. No repeated layout in the horizon. */
    const identity = layoutIdentity(made.value);
    const twin = identities.get(identity);
    if (twin !== undefined) fail(n, `same layout as puzzle ${String(twin)}`);
    identities.set(identity, n);

    if (n % 25 === 0) stdout.write(".");
  }

  stdout.write(`\n${String(horizon)} days verified in ${String(Date.now() - started)} ms: one route each (EXACT), par, band, decomposition, symmetry, no repeats\n`);
  stdout.write(`arrangement search nodes: ${String(nodes)} total, ${String(maxNodes)} on the largest day; band edges ${BAND_EDGES.join(", ")}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/rotate-lock-verify.ts")) main();
