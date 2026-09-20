/**
 * Verifies the WORD LADDER horizon. A separate process from generation. It builds
 * its own one letter change graph and its own breadth first search, written from
 * WORD-LADDER.md sections 8, 9 and 14 directly, and never imports solver.ts or
 * ladder.ts, so par, fairness and difficulty are checked by code that shares
 * nothing with the search that made them.
 *
 *   npx tsx tools/word-ladder-verify.ts --dir data/word-ladder
 *
 * Six assertions per day, in the document's order: structure, generator replay,
 * solvability and exact par, familiar fairness, difficulty and band, and the
 * symmetry (no repeated unordered pair).
 */

import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import { BAND_EDGES, bandForPuzzle, bandOf, generateForPuzzle } from "../src/games/word-ladder/generator.js";
import { decodeLayout } from "../src/games/word-ladder/word-ladder-codec.js";
import { buildContext, drawFor, loadList, type WordLadderEntry } from "./word-ladder-generate.js";

const HORIZON_DAYS = 365;
const ACCEPTED_PATH = "data/word-ladder/accepted.txt";
const FAMILIAR_PATH = "data/word-ladder/familiar.txt";
const LEVER_PATTERN = /^(par-[4567]|detour-\d+)$/;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

type Graph = Map<string, string[]>;

/** Its own graph build, independent of ladder.ts. */
function buildGraph(words: readonly string[]): Graph {
  const set = new Set(words);
  const graph: Graph = new Map();
  for (const word of words) {
    const neighbours: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      for (const letter of LETTERS) {
        if (letter === word[i]) continue;
        const candidate = word.slice(0, i) + letter + word.slice(i + 1);
        if (set.has(candidate)) neighbours.push(candidate);
      }
    }
    graph.set(word, neighbours);
  }
  return graph;
}

/** Its own breadth first search: distances from source to every reachable word. */
function distancesFrom(graph: Graph, source: string): Map<string, number> {
  const dist = new Map<string, number>([[source, 0]]);
  const queue = [source];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head] as string;
    head += 1;
    const here = dist.get(word) as number;
    for (const next of graph.get(word) ?? []) {
      if (!dist.has(next)) {
        dist.set(next, here + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

function fail(puzzleNumber: number, why: string): never {
  stdout.write(`\npuzzle ${String(puzzleNumber)}: ${why}\n`);
  exit(1);
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function main(): void {
  const dir = flag("dir", "data/word-ladder");
  const index = JSON.parse(readFileSync(`${dir}/manifest.index.json`, "utf8")) as {
    codec?: unknown;
    horizon?: unknown;
    chunks?: { from: number; to: number; url: string }[];
  };
  if (index.codec !== MANIFEST_CODEC) fail(0, "index codec is not the engine codec");
  if (typeof index.horizon !== "number" || index.horizon < HORIZON_DAYS) fail(0, "horizon is shorter than a year");
  const horizon = index.horizon;

  const entries = new Map<number, WordLadderEntry>();
  for (const chunk of index.chunks ?? []) {
    const path = chunk.url.replace(/^\//, "");
    const body = JSON.parse(readFileSync(path, "utf8")) as { codec?: unknown; entries?: Record<string, WordLadderEntry> };
    if (body.codec !== MANIFEST_CODEC) fail(chunk.from, "chunk codec is not the engine codec");
    for (let n = chunk.from; n <= chunk.to; n += 1) {
      const entry = body.entries?.[String(n)];
      if (entry === undefined) fail(n, "missing from its chunk");
      entries.set(n, entry);
    }
  }

  /* Independent graphs from the same committed lists the game ships and the tools
     generated against. */
  const accepted = loadList(ACCEPTED_PATH);
  const acceptedSet = new Set(accepted);
  const acceptedGraph = buildGraph(accepted);
  const familiarGraph = buildGraph(loadList(FAMILIAR_PATH));
  const context = buildContext();

  const pairs = new Map<string, number>();
  const started = Date.now();

  for (let n = 1; n <= horizon; n += 1) {
    const entry = entries.get(n);
    if (entry === undefined) fail(n, "not covered by any chunk");

    /* 1. Structure. */
    const decoded = decodeLayout(n, entry.layout);
    if (decoded === null) fail(n, "layout does not decode");
    const { start, goal } = decoded;
    if (!/^[a-z]{4}$/.test(start) || !/^[a-z]{4}$/.test(goal)) fail(n, "an endpoint is not four lowercase letters");
    if (start === goal) fail(n, "start and goal are the same");
    if (!acceptedSet.has(start) || !acceptedSet.has(goal)) fail(n, "an endpoint is not in the accepted list");
    if (!Array.isArray(entry.levers) || !entry.levers.every((lever) => LEVER_PATTERN.test(lever))) fail(n, "unknown lever");

    /* 2. Replay the generator from the seed. */
    const replayed = generateForPuzzle(context, n, drawFor(n), undefined, pairsToSet(pairs));
    if (replayed === null || replayed.attempt !== entry.attempt) fail(n, "the stream does not reproduce the recorded attempt");
    if (replayed.puzzle.start !== start || replayed.puzzle.goal !== goal) fail(n, "the regenerated layout differs from the stored one");

    /* 3. Solvable and exact par, by the independent breadth first search. */
    const dist = distancesFrom(acceptedGraph, start);
    const par = dist.get(goal);
    if (par === undefined) fail(n, "the goal is not reachable from the start");
    if (par !== entry.best.par) fail(n, `par ${String(par)} but the entry stores ${String(entry.best.par)}`);
    if (par < 4 || par > 7) fail(n, `par ${String(par)} is outside the band`);

    /* 4. Familiar fairness: the familiar only distance equals par. */
    const familiarDist = familiarGraph.has(start) ? distancesFrom(familiarGraph, start).get(goal) : undefined;
    if (familiarDist === undefined || familiarDist !== par) fail(n, "no shortest path uses familiar words alone");

    /* 5. Difficulty (the search ball below par) and band. */
    let ball = 0;
    for (const d of dist.values()) if (d <= par - 1) ball += 1;
    if (ball !== entry.best.difficulty) fail(n, `difficulty ${String(ball)} but the entry stores ${String(entry.best.difficulty)}`);
    if (bandOf(ball) !== bandForPuzzle(n)) fail(n, "difficulty is outside the weekday band");

    /* 6. Symmetry: the unordered pair has not been used, so the reverse cannot
       ship as a separate day. */
    const key = pairKey(start, goal);
    const twin = pairs.get(key);
    if (twin !== undefined) fail(n, `same word pair as puzzle ${String(twin)}`);
    pairs.set(key, n);

    if (n % 25 === 0) stdout.write(".");
  }

  stdout.write(`\n${String(horizon)} days verified in ${String(Date.now() - started)} ms: solvable, exact par, familiar fair, difficulty, band, no repeated pair\n`);
  stdout.write(`band edges ${BAND_EDGES.join(", ")}\n`);
}

/** The used pairs seen so far, as the set the generator replay expects. Replay
 *  must see the same reused screen the original run saw, so the verifier feeds it
 *  the pairs already accepted before day n. */
function pairsToSet(pairs: ReadonlyMap<string, number>): Set<string> {
  return new Set(pairs.keys());
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/word-ladder-verify.ts")) main();
