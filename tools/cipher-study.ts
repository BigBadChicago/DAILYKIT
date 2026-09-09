/**
 * Node only. The CIPHER equivalent of tools/calibrate.ts: it measures the two
 * integers the generator bands on, across the whole 1,296 code space, so the
 * weekday bands and the fairness floor are set from data rather than guessed.
 *
 * Writes data/cipher/study.json and prints a summary. Cheap enough to rerun.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { CODE_SPACE } from "../src/games/cipher/rules.js";
import { LEVERS, satisfiesLever } from "../src/games/cipher/generator.js";
import { ALL_CODES, OPENING_GUESS, remainingAfterOpening, solveLine } from "../src/games/cipher/solver.js";

interface Entry {
  readonly code: number;
  readonly remaining: number;
  readonly line: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)));
  return sorted[index] as number;
}

const started = Date.now();
const entries: Entry[] = [];
for (let code = 0; code < CODE_SPACE; code += 1) {
  entries.push({ code, remaining: remainingAfterOpening(code), line: solveLine(code).length });
}

const lineCounts = new Map<number, number>();
for (const entry of entries) lineCounts.set(entry.line, (lineCounts.get(entry.line) ?? 0) + 1);

const eligible = entries.filter((entry) => entry.line >= 4);
const remainingSorted = [...eligible].map((entry) => entry.remaining).sort((a, b) => a - b);

const quintiles = [0, 0.2, 0.4, 0.6, 0.8, 1].map((fraction) => percentile(remainingSorted, fraction));

/* Supply per lever per class. A weekday needs 52 codes a year from the
   intersection of its band and its lever, so this table is what a schedule is
   allowed to be. */
const supply: Record<string, Record<number, number>> = {};
for (const lever of LEVERS) {
  const row: Record<number, number> = {};
  for (const entry of eligible) {
    if (!satisfiesLever(ALL_CODES[entry.code]!, lever)) continue;
    row[entry.remaining] = (row[entry.remaining] ?? 0) + 1;
  }
  supply[lever] = row;
}

const report = {
  opening: OPENING_GUESS,
  codeSpace: CODE_SPACE,
  lineLengthCounts: Object.fromEntries([...lineCounts.entries()].sort((a, b) => a[0] - b[0])),
  eligible: eligible.length,
  remaining: {
    min: remainingSorted[0] as number,
    max: remainingSorted[remainingSorted.length - 1] as number,
    median: percentile(remainingSorted, 0.5),
    quintiles,
  },
  supply,
  elapsedMs: Date.now() - started,
};

mkdirSync("data/cipher", { recursive: true });
writeFileSync("data/cipher/study.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
