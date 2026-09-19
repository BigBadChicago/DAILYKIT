/**
 * Verifies the DIFFERENCE RELAY horizon. A separate process from generation, and
 * it never imports solver.ts, so uniqueness, par and difficulty are checked by
 * code that shares nothing with the search that made them. DIFFERENCE-RELAY.md
 * 10.2.
 *
 *   npx tsx tools/difference-relay-verify.ts --dir data/difference-relay
 *
 * Six assertions per day, in the document's order. The enumeration is its own
 * permutation walk and its own minimax deduction, written from sections 6.2 and
 * 10.3 directly rather than lifted from the game.
 */

import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import { BAND_EDGES, bandForPuzzle, bandOf, generateForPuzzle } from "../src/games/difference-relay/generator.js";
import { decodeLayout } from "../src/games/difference-relay/relay-codec.js";
import { makePuzzle, puzzleProblem } from "../src/games/difference-relay/rules.js";
import { drawFor, layoutIdentity, type DifferenceRelayEntry } from "./difference-relay-generate.js";

const HORIZON_DAYS = 365;
const GAPS = 5;
const LEVER_PATTERN = /^(range-tight|range-wide|hidden-[123])$/;

/** Its own permutation walk, independent of relay.ts. */
function permutations(numbers: readonly number[]): number[][] {
  if (numbers.length === 0) return [[]];
  const out: number[][] = [];
  for (let i = 0; i < numbers.length; i += 1) {
    const rest = [...numbers.slice(0, i), ...numbers.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([numbers[i] as number, ...tail]);
  }
  return out;
}

function diffs(order: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < GAPS; i += 1) out.push(Math.abs((order[i] as number) - (order[i + 1] as number)));
  return out;
}

function depth(guessDiffs: readonly number[], hypothesis: readonly number[]): number {
  for (let i = 0; i < GAPS; i += 1) if ((guessDiffs[i] as number) !== (hypothesis[i] as number)) return i;
  return GAPS;
}

interface Independent {
  readonly solutions: number;
  readonly visibleCount: number;
  readonly par: number;
  readonly difficulty: number;
}

/** Uniqueness by counting orders with the target's difference sequence, and par
 *  by the same no guess minimax the game declares, both from scratch here. */
function enumerate(target: readonly number[], marks: readonly (number | null)[]): Independent {
  const numbers = [...target].sort((a, b) => a - b);
  const orders = permutations(numbers);
  const targetDiffs = diffs(target);

  let solutions = 0;
  const visible: number[][] = [];
  const visibleDiffs: number[][] = [];
  for (const order of orders) {
    const d = diffs(order);
    if (d.every((value, i) => value === targetDiffs[i])) solutions += 1;
    let ok = true;
    for (let i = 0; i < GAPS; i += 1) {
      const mark = marks[i];
      if (mark !== null && (d[i] as number) !== mark) {
        ok = false;
        break;
      }
    }
    if (ok) {
      visible.push(order);
      visibleDiffs.push(d);
    }
  }

  let live = visible.map((_, index) => index);
  let par = 0;
  let mass = 0;
  while (par < 20) {
    mass += live.length;
    par += 1;
    let bestIndex = 0;
    let bestWorst = Number.POSITIVE_INFINITY;
    for (let g = 0; g < live.length; g += 1) {
      const guessDiffs = visibleDiffs[live[g] as number] as number[];
      const buckets = new Array<number>(GAPS + 1).fill(0);
      for (let c = 0; c < live.length; c += 1) {
        const d = depth(guessDiffs, visibleDiffs[live[c] as number] as number[]);
        buckets[d] = (buckets[d] as number) + 1;
      }
      const worst = Math.max(...buckets);
      if (worst < bestWorst) {
        bestWorst = worst;
        bestIndex = g;
      }
    }
    const guessDiffs = visibleDiffs[live[bestIndex] as number] as number[];
    const realDepth = depth(guessDiffs, targetDiffs);
    if (realDepth === GAPS) break;
    live = live.filter((index) => depth(guessDiffs, visibleDiffs[index] as number[]) === realDepth);
  }

  return { solutions, visibleCount: visible.length, par, difficulty: mass };
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
  const dir = flag("dir", "data/difference-relay");
  const index = JSON.parse(readFileSync(`${dir}/manifest.index.json`, "utf8")) as {
    codec?: unknown;
    horizon?: unknown;
    chunks?: { from: number; to: number; url: string }[];
  };
  if (index.codec !== MANIFEST_CODEC) fail(0, "index codec is not the engine codec");
  if (typeof index.horizon !== "number" || index.horizon < HORIZON_DAYS) fail(0, "horizon is shorter than a year");
  const horizon = index.horizon;

  const entries = new Map<number, DifferenceRelayEntry>();
  for (const chunk of index.chunks ?? []) {
    const path = chunk.url.replace(/^\//, "");
    const body = JSON.parse(readFileSync(path, "utf8")) as { codec?: unknown; entries?: Record<string, DifferenceRelayEntry> };
    if (body.codec !== MANIFEST_CODEC) fail(chunk.from, "chunk codec is not the engine codec");
    for (let n = chunk.from; n <= chunk.to; n += 1) {
      const entry = body.entries?.[String(n)];
      if (entry === undefined) fail(n, "missing from its chunk");
      entries.set(n, entry);
    }
  }

  const identities = new Map<string, number>();
  const started = Date.now();

  for (let n = 1; n <= horizon; n += 1) {
    const entry = entries.get(n);
    if (entry === undefined) fail(n, "not covered by any chunk");

    /* 1. Structure. */
    const decoded = decodeLayout(n, entry.layout);
    if (decoded === null) fail(n, "layout does not decode");
    const problem = puzzleProblem(decoded.target, decoded.marks, decoded.startOrder);
    if (problem !== null) fail(n, problem);
    if (!Array.isArray(entry.levers) || !entry.levers.every((lever) => LEVER_PATTERN.test(lever))) fail(n, "unknown lever");

    /* 2. Replay the generator from the seed. */
    const replayed = generateForPuzzle(n, drawFor(n));
    if (replayed === null || replayed.attempt !== entry.attempt) fail(n, "the stream does not reproduce the recorded attempt");
    if (layoutIdentity(replayed.puzzle) !== layoutIdentity({ target: decoded.target, marks: decoded.marks, startOrder: decoded.startOrder })) {
      fail(n, "the regenerated layout differs from the stored one");
    }

    /* 3 to 5. Uniqueness (EXACT), decomposition, par and difficulty by the independent walk. */
    const found = enumerate(decoded.target, decoded.marks);
    if (found.solutions !== 1) fail(n, `${String(found.solutions)} orders satisfy the marks`);
    if (found.visibleCount < 2) fail(n, "the visible marks alone pin the order");
    if (found.par !== entry.best.par) fail(n, `par ${String(found.par)} but the entry stores ${String(entry.best.par)}`);
    if (found.difficulty !== entry.best.difficulty) fail(n, "stored difficulty is not the independently measured one");
    if (found.par > 6) fail(n, "the board is not fair within the budget");

    /* Cross check against the module's own measure. */
    const made = makePuzzle(n, decoded.target, decoded.marks, decoded.startOrder, entry.levers);
    if (!made.ok) fail(n, made.error.detail);
    if (made.value.par !== found.par) fail(n, "the game's par disagrees with the independent par");
    if (made.value.difficulty !== found.difficulty) fail(n, "the game's difficulty disagrees with the independent one");
    if (bandOf(made.value.difficulty) !== bandForPuzzle(n)) fail(n, "difficulty is outside the weekday band");

    /* 6. Symmetry, section 12, and no repeated layout. */
    const reversed = [...decoded.target].reverse();
    let mirror = true;
    for (let i = 0; i < GAPS; i += 1) {
      const mark = decoded.marks[i];
      if (mark !== null && Math.abs((reversed[i] as number) - (reversed[i + 1] as number)) !== mark) mirror = false;
    }
    if (mirror) fail(n, "the reverse target satisfies the visible marks");

    const identity = layoutIdentity({ target: decoded.target, marks: decoded.marks, startOrder: decoded.startOrder });
    const twin = identities.get(identity);
    if (twin !== undefined) fail(n, `same layout as puzzle ${String(twin)}`);
    identities.set(identity, n);

    if (n % 25 === 0) stdout.write(".");
  }

  stdout.write(`\n${String(horizon)} days verified in ${String(Date.now() - started)} ms: one order each (EXACT), par, difficulty, band, symmetry, no repeats\n`);
  stdout.write(`band edges ${BAND_EDGES.join(", ")}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/difference-relay-verify.ts")) main();
