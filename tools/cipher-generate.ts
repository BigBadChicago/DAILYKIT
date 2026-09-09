/**
 * Node only. Produces the CIPHER horizon and writes it as one chunk plus an
 * index. Never bundled into a browser build.
 *
 * A year of CIPHER is 365 codes of four symbols, so unlike POKER GRID the whole
 * horizon is a few kilobytes and lives in one file. The chunk still carries the
 * `boards` key that src/shell/boot.ts looks for, which is a defect this phase
 * records rather than fixes.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { seedFor } from "../src/core/seed.js";
import {
  MIN_LINE,
  bandFor,
  generateCode,
  inBand,
  leverOf,
  type CipherLever,
} from "../src/games/cipher/generator.js";
import { encodeCode } from "../src/games/cipher/manifest-codec.js";
import { MANIFEST_CODEC } from "../src/games/cipher/manifest-codec.js";
import { codeIndex, remainingAfterOpening, solveLine, OPENING_GUESS } from "../src/games/cipher/solver.js";
import { MAX_GUESSES } from "../src/games/cipher/rules.js";

export const GAME_ID = "cipher";
export const DEFAULT_HORIZON = 365;
export const EPOCH = { year: 2026, month: 1, day: 5 } as const;
export const OUTPUT_DIR = "data/cipher";
/* Tuesday's band holds 73 eligible codes and spends 52 of them, so the last
   Tuesdays of a year draw against a thin pool. Measured worst case is under
   two hundred draws; the ceiling is set well above it so an unlucky year fails
   loudly rather than silently shipping a day outside its band. */
export const MAX_ATTEMPTS = 4096;

export type RejectionReason = "below-floor" | "out-of-band" | "already-used";

export interface GeneratedEntry {
  /** In memory only. The chunk keys every entry by puzzle number. */
  readonly number: number;
  /** Obfuscated. Requirement 8.4. */
  readonly code: string;
  readonly levers: readonly CipherLever[];
  readonly best: { readonly remaining: number; readonly line: number };
  /** Attempt 0 is the code an offline client reproduces past the horizon. */
  readonly attempt: number;
}

export interface ManifestChunk {
  readonly game: string;
  readonly codec: string;
  /** The horizon this chunk covers. Not a calendar year: the epoch is 5
   *  January, so 365 days run four days into the following one. */
  readonly span: string;
  readonly from: number;
  readonly to: number;
  /** Keyed by puzzle number as a string. Phase 11 correction, defect 7. */
  readonly entries: Readonly<Record<string, Omit<GeneratedEntry, "number">>>;
}

export function chunkOf(span: string, boards: readonly GeneratedEntry[]): ManifestChunk {
  const entries: Record<string, Omit<GeneratedEntry, "number">> = {};
  for (const board of boards) {
    const { number, ...rest } = board;
    entries[String(number)] = rest;
  }
  return {
    game: GAME_ID,
    codec: MANIFEST_CODEC,
    span,
    from: boards[0]?.number ?? 0,
    to: boards[boards.length - 1]?.number ?? 0,
    entries,
  };
}

export function entriesOf(chunk: ManifestChunk): readonly GeneratedEntry[] {
  return Object.keys(chunk.entries)
    .map((key) => ({ number: Number(key), ...(chunk.entries[key] as Omit<GeneratedEntry, "number">) }))
    .sort((left, right) => left.number - right.number);
}

export function saltFor(attempt: number): number | undefined {
  return attempt === 0 ? undefined : attempt;
}

export interface Candidate {
  readonly number: number;
  readonly attempt: number;
  readonly code: readonly number[];
  readonly index: number;
  readonly remaining: number;
  readonly line: number;
  readonly lever: CipherLever;
}

/** Cheap checks first. solveLine is the only expensive call in the pipeline, so
 *  it runs after the band has already accepted the code. */
export function evaluateCandidate(number: number, attempt: number): Candidate {
  const code = generateCode(seedFor(GAME_ID, number, saltFor(attempt)));
  const index = codeIndex(code);
  const remaining = remainingAfterOpening(index);
  const line = inBand(number, remaining) ? solveLine(index).length : 0;
  return { number, attempt, code, index, remaining, line, lever: leverOf(code) };
}

export function generateEntry(
  number: number,
  used: ReadonlySet<number> = new Set(),
): { readonly entry: GeneratedEntry; readonly rejected: Readonly<Record<string, number>> } {
  const rejected: Record<string, number> = {};
  const count = (reason: RejectionReason): void => {
    rejected[reason] = (rejected[reason] ?? 0) + 1;
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = evaluateCandidate(number, attempt);
    if (!inBand(number, candidate.remaining)) {
      count("out-of-band");
      continue;
    }
    if (candidate.line < MIN_LINE || candidate.line > MAX_GUESSES) {
      count("below-floor");
      continue;
    }
    if (used.has(candidate.index)) {
      count("already-used");
      continue;
    }
    return {
      entry: {
        number,
        code: encodeCode(number, candidate.code),
        levers: [candidate.lever],
        best: { remaining: candidate.remaining, line: candidate.line },
        attempt,
      },
      rejected,
    };
  }
  throw new Error(`no code satisfied day ${number} in ${MAX_ATTEMPTS} attempts`);
}

export function generateManifest(horizon = DEFAULT_HORIZON): ManifestChunk {
  const boards: GeneratedEntry[] = [];
  const used = new Set<number>();
  const rejected: Record<string, number> = {};
  const started = Date.now();

  for (let number = 1; number <= horizon; number += 1) {
    const result = generateEntry(number, used);
    boards.push(result.entry);
    used.add(codeIndex(generateCode(seedFor(GAME_ID, number, saltFor(result.entry.attempt)))));
    for (const [reason, hits] of Object.entries(result.rejected)) {
      rejected[reason] = (rejected[reason] ?? 0) + hits;
    }
    if (number % 50 === 0) console.log(`day ${number} of ${horizon}`);
  }

  const chunk = chunkOf(`1-${horizon}`, boards);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(`${OUTPUT_DIR}/manifest.horizon.json`, `${JSON.stringify(chunk)}\n`, "utf8");
  writeIndex(horizon);
  console.log(
    `wrote ${boards.length} days in ${((Date.now() - started) / 1000).toFixed(1)}s, rejected ${JSON.stringify(rejected)}`,
  );
  return chunk;
}

export function writeIndex(horizon = DEFAULT_HORIZON): void {
  const index = {
    game: GAME_ID,
    codec: MANIFEST_CODEC,
    epoch: EPOCH,
    horizon,
    opening: OPENING_GUESS,
    chunks: [
      { span: `1-${horizon}`, from: 1, to: horizon, url: `/${OUTPUT_DIR}/manifest.horizon.json` },
    ],
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(`${OUTPUT_DIR}/manifest.index.json`, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export function bandOf(number: number): readonly number[] {
  return bandFor(number);
}

if (process.argv[1]?.endsWith("cipher-generate.ts")) {
  generateManifest(Number(process.env["CIPHER_HORIZON"] ?? DEFAULT_HORIZON));
}
