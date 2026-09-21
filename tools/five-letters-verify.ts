/**
 * Verifies the FIVE LETTERS horizon. A separate process from generation. It never
 * imports the generator, the solver, the rules, the feedback primitives, the
 * difficulty module or the band table: the two pass marking, the opening search,
 * the witness search and the band rule below are written again from
 * FIVE-LETTERS.md sections 1, 9, 11 and 14, and the edges and opening are read
 * from the committed calibration study, so nothing that made a day also checks
 * it. It imports only the codec, which is how a day is read at all.
 *
 *   npx tsx tools/five-letters-verify.ts --dir data/five-letters
 *
 * Once for the horizon: the answer pool is inside the accepted list, the page's
 * embedded list is the accepted list, and the study's opening is the ideal one.
 * Per day: structure; the answer is a pool word; candidates after the opening
 * equal the stored figure; its band is the weekday's; the witness solves it in
 * six or fewer and in the stored count (fairness); no answer twice (duplicate).
 */

import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import { decodeAnswer } from "../src/games/five-letters/five-letters-codec.js";

const HORIZON_DAYS = 365;
const LIMIT = 6;
const WEEKDAY_BANDS = [0, 1, 2, 3, 5, 6, 4];
const LEVER = /^(repeat-letter|distinct-letters)$/;
const SOLVED = 242;

interface Entry {
  readonly answer: unknown;
  readonly best: { readonly candidates: number; readonly witness: number };
  readonly levers: readonly string[];
  readonly attempt: number;
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

function fail(puzzleNumber: number, why: string): never {
  stdout.write(`\npuzzle ${String(puzzleNumber)}: ${why}\n`);
  exit(1);
}

function list(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

/** Section 1, written again: exact first, then present left to right while an
 *  unmatched copy remains. Returned as base three, position i weighted 3^i. */
function mark(answer: string, guess: string): number {
  const left = new Map<string, number>();
  const out = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === answer[i]) out[i] = 2;
    else left.set(answer[i] as string, (left.get(answer[i] as string) ?? 0) + 1);
  }
  for (let i = 0; i < 5; i += 1) {
    if (out[i] === 2) continue;
    const have = left.get(guess[i] as string) ?? 0;
    if (have > 0) {
      out[i] = 1;
      left.set(guess[i] as string, have - 1);
    }
  }
  return out.reduceRight((sum, value) => sum * 3 + value, 0);
}

function main(): void {
  const dir = flag("dir", "data/five-letters");
  const started = Date.now();
  const index = JSON.parse(readFileSync(`${dir}/manifest.index.json`, "utf8")) as {
    codec?: unknown;
    horizon?: unknown;
    chunks?: { from: number; to: number; url: string }[];
  };
  if (index.codec !== MANIFEST_CODEC) fail(0, "index codec is not the engine codec");
  if (typeof index.horizon !== "number" || index.horizon < HORIZON_DAYS) fail(0, "horizon is shorter than a year");
  const horizon = index.horizon;

  const entries = new Map<number, Entry>();
  for (const chunk of index.chunks ?? []) {
    const body = JSON.parse(readFileSync(chunk.url.replace(/^\//, ""), "utf8")) as { codec?: unknown; entries?: Record<string, Entry> };
    if (body.codec !== MANIFEST_CODEC) fail(chunk.from, "chunk codec is not the engine codec");
    for (let n = chunk.from; n <= chunk.to; n += 1) {
      const entry = body.entries?.[String(n)];
      if (entry === undefined) fail(n, "missing from its chunk");
      if (entries.has(n)) fail(n, "covered by two chunks");
      entries.set(n, entry);
    }
  }

  const words = list(`${dir}/accepted.txt`);
  const wordIndex = new Map(words.map((word, i) => [word, i]));
  if (words.some((word) => !/^[a-z]{5}$/.test(word))) fail(0, "accepted.txt holds a word that is not five letters");
  const pool = new Set(list(`${dir}/answers.txt`));
  for (const word of pool) if (!wordIndex.has(word)) fail(0, `pool word ${word} is not accepted`);
  const embedded = /const BLOB =\s*"([a-z ]+)";/.exec(readFileSync("src/games/five-letters/words.ts", "utf8"))?.[1];
  if (embedded !== words.join(" ")) fail(0, "the page's embedded list is not accepted.txt");
  const study = JSON.parse(readFileSync(`${dir}/study.json`, "utf8")) as { bandEdges: number[]; opening: { word: string } };
  const edges = study.bandEdges;
  if (!Array.isArray(edges) || edges.length !== 6) fail(0, "the study does not carry six band edges");

  /* Every pattern, once, from this file's own marking. */
  const n = words.length;
  const table = new Uint8Array(n * n);
  for (let g = 0; g < n; g += 1) for (let a = 0; a < n; a += 1) table[g * n + a] = mark(words[a] as string, words[g] as string);

  /* Sum of squared partition sizes over a candidate set. */
  const counts = new Int32Array(243);
  const cost = (g: number, candidates: readonly number[]): number => {
    counts.fill(0);
    let sum = 0;
    for (const a of candidates) {
      const p = table[g * n + a] as number;
      sum += 2 * (counts[p] as number) + 1;
      counts[p] = (counts[p] as number) + 1;
    }
    return sum;
  };
  const choose = (candidates: readonly number[]): number => {
    if (candidates.length <= 2) return candidates[0] as number;
    const member = new Set(candidates);
    let best = -1;
    let bestCost = Infinity;
    for (let g = 0; g < n; g += 1) {
      const c = cost(g, candidates);
      if (c < bestCost || (c === bestCost && member.has(g) && !member.has(best))) {
        best = g;
        bestCost = c;
      }
    }
    return best;
  };

  /* The opening is the ideal one, not merely the one the generator used. */
  const everyone = words.map((_, i) => i);
  const opening = choose(everyone);
  if (words[opening] !== study.opening.word) fail(0, `the ideal opening is ${String(words[opening])}, the study says ${study.opening.word}`);

  const memo = new Map<string, number>();
  const witness = (a: number): number => {
    let candidates = everyone;
    let guess = opening;
    let key = "";
    for (let step = 1; ; step += 1) {
      const p = table[guess * n + a] as number;
      if (p === SOLVED) return step;
      if (step > 2 * LIMIT) return step;
      candidates = candidates.filter((c) => table[guess * n + c] === p);
      key += `${String(p)},`;
      let next = memo.get(key);
      if (next === undefined) {
        next = choose(candidates);
        memo.set(key, next);
      }
      guess = next;
    }
  };

  const seen = new Map<string, number>();
  const byBand = [0, 0, 0, 0, 0, 0, 0];
  for (let day = 1; day <= horizon; day += 1) {
    const entry = entries.get(day);
    if (entry === undefined) fail(day, "not covered by any chunk");
    const answer = decodeAnswer(day, entry.answer);
    if (answer === null) fail(day, "answer does not decode");
    if (!pool.has(answer)) fail(day, "answer is not a pool word");
    if (!Array.isArray(entry.levers) || !entry.levers.every((lever) => LEVER.test(lever))) fail(day, "unknown lever");
    const repeat = new Set(answer).size < 5;
    if (entry.levers.includes("repeat-letter") !== repeat) fail(day, "the lever disagrees with the answer");
    if (!Number.isInteger(entry.attempt) || entry.attempt < 0) fail(day, "attempt is not a count");

    const a = wordIndex.get(answer) as number;
    const target = table[opening * n + a];
    let candidates = 0;
    for (let c = 0; c < n; c += 1) if (table[opening * n + c] === target) candidates += 1;
    if (candidates !== entry.best.candidates) fail(day, `candidates ${String(candidates)} but the entry stores ${String(entry.best.candidates)}`);
    let band = 0;
    while (band < edges.length && candidates > (edges[band] as number)) band += 1;
    if (band !== WEEKDAY_BANDS[(day - 1) % 7]) fail(day, `candidates ${String(candidates)} is in band ${String(band)}, not the weekday band`);
    byBand[band] = (byBand[band] as number) + 1;

    const steps = witness(a);
    if (steps > LIMIT) fail(day, `the witness needs ${String(steps)} guesses`);
    if (steps !== entry.best.witness) fail(day, `the witness needs ${String(steps)}, the entry stores ${String(entry.best.witness)}`);

    const twin = seen.get(answer);
    if (twin !== undefined) fail(day, `same answer as puzzle ${String(twin)}`);
    seen.set(answer, day);
  }

  stdout.write(
    `${String(horizon)} days verified in ${String(Date.now() - started)} ms: pool answer, candidates, band, ` +
      `witness in six, no repeat; opening ${study.opening.word}; days per band ${byBand.join(", ")}; band edges ${edges.join(", ")}\n`,
  );
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/five-letters-verify.ts")) main();
