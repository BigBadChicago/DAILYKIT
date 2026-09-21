/**
 * Verifies the PANGRAM horizon. A separate process from generation. It never
 * imports the generator, the solver, the rules, the letter primitives or the
 * band table: the set arithmetic, the scoring, the enumeration and the band
 * edges below are written again from PANGRAM.md sections 1, 8, 9, 11 and 14,
 * and the edges are read from the committed calibration study, so nothing that
 * made a day also checks it. It imports only the codec, which is how a day is
 * read at all.
 *
 *   npx tsx tools/pangram-verify.ts --dir data/pangram
 *
 * Per day, in the document's order: structure; the stored answers are exactly
 * every accepted word the set admits (complete and correct); totals; a pangram;
 * the word count window; familiar fairness; difficulty and band; and across the
 * horizon, no seven letter set shipped twice (duplicate and symmetry).
 */

import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import { decodeLayout, decodeWords } from "../src/games/pangram/pangram-codec.js";

const HORIZON_DAYS = 365;
const MIN_LEN = 4;
const BONUS = 7;
const WINDOW = { lo: 20, hi: 80 };
const FAMILIAR_PERCENT = 65;
const WEEKDAY_BANDS = [0, 1, 2, 3, 5, 6, 4];
const LEVER = /^(centre-(vowel|consonant)|pangrams-\d+|no-s)$/;

interface Entry {
  readonly layout: unknown;
  readonly words: unknown;
  readonly best: { readonly total: number; readonly count: number; readonly pangrams: number };
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

/** Its own letter set: a sorted string of the distinct letters. */
function letterSet(word: string): string {
  return [...new Set(word)].sort().join("");
}

function main(): void {
  const dir = flag("dir", "data/pangram");
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
    const body = JSON.parse(readFileSync(chunk.url.replace(/^\//, ""), "utf8")) as {
      codec?: unknown;
      entries?: Record<string, Entry>;
    };
    if (body.codec !== MANIFEST_CODEC) fail(chunk.from, "chunk codec is not the engine codec");
    for (let n = chunk.from; n <= chunk.to; n += 1) {
      const entry = body.entries?.[String(n)];
      if (entry === undefined) fail(n, "missing from its chunk");
      if (entries.has(n)) fail(n, "covered by two chunks");
      entries.set(n, entry);
    }
  }

  const accepted = list(`${dir}/accepted.txt`);
  const acceptedSet = new Set(accepted);
  const familiar = new Set(list(`${dir}/familiar.txt`));
  for (const word of familiar) if (!acceptedSet.has(word)) fail(0, `familiar word ${word} is not accepted`);
  const study = JSON.parse(readFileSync(`${dir}/study.json`, "utf8")) as { bandEdges: number[] };
  const edges = study.bandEdges;
  if (!Array.isArray(edges) || edges.length !== 6) fail(0, "the study does not carry six band edges");

  /* Accepted words grouped by their distinct letters. */
  const bySet = new Map<string, string[]>();
  for (const word of accepted) {
    const key = letterSet(word);
    const bucket = bySet.get(key);
    if (bucket === undefined) bySet.set(key, [word]);
    else bucket.push(word);
  }

  const seenSets = new Map<string, number>();
  const started = Date.now();
  let totalAnswers = 0;

  for (let n = 1; n <= horizon; n += 1) {
    const entry = entries.get(n);
    if (entry === undefined) fail(n, "not covered by any chunk");

    /* 1. Structure. */
    const layout = decodeLayout(n, entry.layout);
    if (layout === null) fail(n, "layout does not decode");
    const { letters, centre } = layout;
    if (letters.length !== 7 || new Set(letters).size !== 7) fail(n, "the set is not seven distinct letters");
    if (letters.includes("s")) fail(n, "the set contains s");
    if (!letters.includes(centre)) fail(n, "the centre is not a set letter");
    const stored = decodeWords(n, letters, entry.words);
    if (stored === null) fail(n, "the answer list does not decode");
    if (!Array.isArray(entry.levers) || !entry.levers.every((lever) => LEVER.test(lever))) fail(n, "unknown lever");
    if (!Number.isInteger(entry.attempt) || entry.attempt < 0) fail(n, "attempt is not a count");

    /* 2. Exact: every accepted word whose letters are a subset of the set and
       include the centre, and nothing else. */
    const expected: string[] = [];
    for (const [key, words] of bySet) {
      if (!key.includes(centre)) continue;
      if ([...key].every((letter) => letters.includes(letter))) expected.push(...words);
    }
    expected.sort();
    if (JSON.stringify(expected) !== JSON.stringify(stored)) {
      fail(n, `stored answers differ from the dictionary: ${String(stored.length)} stored, ${String(expected.length)} expected`);
    }

    /* 3. Totals, pangrams, the window, fairness. */
    let total = 0;
    let familiarTotal = 0;
    let pangrams = 0;
    let familiarPangram = false;
    for (const word of stored) {
      if (word.length < MIN_LEN) fail(n, `${word} is shorter than four`);
      const pangram = letterSet(word) === letters;
      const points = word.length - (MIN_LEN - 1) + (pangram ? BONUS : 0);
      total += points;
      if (pangram) pangrams += 1;
      if (familiar.has(word)) {
        familiarTotal += points;
        if (pangram) familiarPangram = true;
      }
    }
    if (pangrams === 0) fail(n, "no answer uses all seven letters");
    if (stored.length < WINDOW.lo || stored.length > WINDOW.hi) fail(n, `${String(stored.length)} answers is outside the window`);
    if (total !== entry.best.total) fail(n, `total ${String(total)} but the entry stores ${String(entry.best.total)}`);
    if (stored.length !== entry.best.count) fail(n, "stored count disagrees");
    if (pangrams !== entry.best.pangrams) fail(n, "stored pangram count disagrees");
    if (!familiarPangram) fail(n, "no pangram is a familiar word");
    if (familiarTotal * 100 < FAMILIAR_PERCENT * total) fail(n, "familiar words carry too little of the total");

    /* 4. Difficulty is the total; its band must be the weekday's. */
    let band = 0;
    while (band < edges.length && total > (edges[band] as number)) band += 1;
    if (band !== WEEKDAY_BANDS[(n - 1) % 7]) fail(n, `total ${String(total)} is in band ${String(band)}, not the weekday band`);

    /* 5. Duplicate and symmetry: the day is its set of letters, so the same
       set under any centre or any display order is the same board. */
    const twin = seenSets.get(letters);
    if (twin !== undefined) fail(n, `same seven letters as puzzle ${String(twin)}`);
    seenSets.set(letters, n);

    totalAnswers += stored.length;
    if (n % 25 === 0) stdout.write(".");
  }

  stdout.write(
    `\n${String(horizon)} days verified in ${String(Date.now() - started)} ms: exact answers, totals, pangram, window, ` +
      `familiar fair, difficulty, band, no repeated set; ${String(totalAnswers)} answers\n`,
  );
  stdout.write(`band edges ${edges.join(", ")}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/pangram-verify.ts")) main();
