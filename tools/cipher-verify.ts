/**
 * Node only. Re-derives every claim a CIPHER manifest entry makes, rather than
 * re-reading it. Generation decision 12's discipline, applied to game two: the
 * seed, the attempt, the code, the lever, the difficulty, the band, and the
 * solver line are all recomputed, so corrupting any single field fails.
 *
 * A separate process from generation on purpose. A bug that writes a bad day
 * and a bug that fails to notice one must not be able to be the same bug.
 */

import { readFileSync } from "node:fs";
import { seedFor } from "../src/core/seed.js";
import { MAX_GUESSES } from "../src/games/cipher/rules.js";
import { MIN_LINE, bandFor, generateCode, inBand, leverOf } from "../src/games/cipher/generator.js";
import { MANIFEST_CODEC, decodeCode, encodeCode } from "../src/games/cipher/manifest-codec.js";
import { codeIndex, remainingAfterOpening, solveLine } from "../src/games/cipher/solver.js";
import { GAME_ID, OUTPUT_DIR, entriesOf, saltFor, type GeneratedEntry, type ManifestChunk } from "./cipher-generate.js";

export type { GeneratedEntry, ManifestChunk };

function fail(entry: GeneratedEntry, message: string): never {
  throw new Error(`day ${entry.number}: ${message}`);
}

/** Assertions 1, 2 and 3 of CIPHER.md section 8, plus every stored field. */
export function verifyEntry(entry: GeneratedEntry): void {
  if (!Number.isInteger(entry.number) || entry.number < 1) fail(entry, "puzzle number is not a positive integer");
  if (!Number.isInteger(entry.attempt) || entry.attempt < 0) fail(entry, "attempt is not a non negative integer");

  const decoded = decodeCode(entry.number, entry.code);
  if (decoded === null) fail(entry, "code does not decode");
  if (encodeCode(entry.number, decoded) !== entry.code) fail(entry, "code does not round trip");

  const regenerated = generateCode(seedFor(GAME_ID, entry.number, saltFor(entry.attempt)));
  if (regenerated.join("") !== decoded.join("")) {
    fail(entry, "code does not come from the seed and attempt it claims");
  }

  if (entry.levers.length !== 1 || entry.levers[0] !== leverOf(decoded)) {
    fail(entry, "recorded lever does not describe the code");
  }

  const index = codeIndex(decoded);
  const remaining = remainingAfterOpening(index);
  if (remaining !== entry.best.remaining) fail(entry, "stored difficulty is not the measured one");
  if (!inBand(entry.number, remaining)) {
    fail(entry, `difficulty ${remaining} is outside the band ${bandFor(entry.number).join(", ")}`);
  }

  const line = solveLine(index);
  if (line.length !== entry.best.line) fail(entry, "stored line length is not the solver's");
  if (line[line.length - 1] !== index) fail(entry, "the solver line does not end on the code");
  if (line.length > MAX_GUESSES) fail(entry, "the code is not solvable inside the guess limit");
  if (line.length < MIN_LINE) fail(entry, "the code falls out below the fairness floor");
}

export function verifyChunk(chunk: ManifestChunk): number {
  if (chunk.game !== GAME_ID) throw new Error(`chunk is for ${chunk.game}, not ${GAME_ID}`);
  if (chunk.codec !== MANIFEST_CODEC) throw new Error(`chunk uses codec ${chunk.codec}`);

  const seen = new Set<number>();
  const boards = entriesOf(chunk);
  let previous = chunk.from - 1;
  for (const entry of boards) {
    if (entry.number !== previous + 1) throw new Error(`day ${entry.number} is out of sequence`);
    previous = entry.number;
    verifyEntry(entry);
    const decoded = decodeCode(entry.number, entry.code);
    const index = codeIndex(decoded as readonly number[]);
    /* A repeated code inside one horizon would hand two days the same answer,
       which a player who plays the archive would notice immediately. */
    if (seen.has(index)) throw new Error(`day ${entry.number} repeats an earlier code`);
    seen.add(index);
  }
  if (previous !== chunk.to) throw new Error(`chunk claims to end at ${chunk.to} and ends at ${previous}`);
  return boards.length;
}

export function verifyDirectory(directory = OUTPUT_DIR): number {
  const index = JSON.parse(readFileSync(`${directory}/manifest.index.json`, "utf8")) as {
    horizon: number;
    chunks: readonly { from: number; to: number; url: string }[];
  };
  let verified = 0;
  for (const pointer of index.chunks) {
    const file = pointer.url.replace(/^\//, "");
    const chunk = JSON.parse(readFileSync(file, "utf8")) as ManifestChunk;
    verified += verifyChunk(chunk);
  }
  if (verified !== index.horizon) {
    throw new Error(`index claims a horizon of ${index.horizon} and the chunks hold ${verified}`);
  }
  return verified;
}

if (process.argv[1]?.endsWith("cipher-verify.ts")) {
  const verified = verifyDirectory();
  console.log(`verified ${verified} CIPHER days`);
}
