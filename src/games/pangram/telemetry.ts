/**
 * Layer 4. PANGRAM's run log, artifact mapping and leak probes. PANGRAM.md
 * sections 19 to 25; ARCHITECTURE2 sections 13, 16, 17 and 18.
 *
 * The run log is the player's own finds, held on the device and never sent
 * anywhere. Each entry is a coarse length class, whether it was a pangram, how
 * many words were refused before it, and how full the meter stood after it. No
 * letter, word or answer count is in it, so nothing the mapper reads can name
 * an answer.
 */

import type { ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import type { ArtifactModel, Fingerprint, FingerprintPoint, RunLog } from "../../engine/telemetry.js";
import { tierLabel } from "../../engine/tiers.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { TIER_PERCENT, thresholdFor } from "./letters.js";
import { finishedOutcomeFor, pangramFound, type PangramState } from "./rules.js";

export const RUN_LOG_VERSION = 1;
/** Cells in each share row, the grammar's widest. */
export const METER_CELLS = 8;
/** Two rows: the meter, then the opening finds. */
export const MAX_ROWS = 2;

/** 0 four letters, 1 five or six, 2 seven or more. */
export type LengthClass = 0 | 1 | 2;

export interface FindEntry {
  readonly index: number;
  readonly lengthClass: LengthClass;
  readonly pangram: boolean;
  readonly refusedBefore: number;
  /** Meter cells full after this find, 0 to 8, against the top tier's score. */
  readonly meter: number;
}

export function lengthClassOf(word: string): LengthClass {
  if (word.length <= 4) return 0;
  if (word.length <= 6) return 1;
  return 2;
}

/** Cells full for a score against the top tier's threshold, capped at eight. */
export function meterFor(score: number, total: number): number {
  const target = thresholdFor(TIER_PERCENT[0] as number, total);
  if (target <= 0) return METER_CELLS;
  return Math.min(METER_CELLS, Math.floor((score * METER_CELLS) / target));
}

export function runEntries(state: PangramState): readonly FindEntry[] {
  let score = 0;
  return state.found.map((find, index) => {
    score += find.points;
    return {
      index,
      lengthClass: lengthClassOf(find.word),
      pangram: find.pangram,
      refusedBefore: find.refusedBefore,
      meter: meterFor(score, state.puzzle.total),
    };
  });
}

export function runLogOf(state: PangramState): RunLog {
  return { v: RUN_LOG_VERSION, entries: runEntries(state) };
}

/** Re-narrows the opaque run log. A malformed entry is dropped, never thrown on,
 *  because the moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly FindEntry[] {
  const out: FindEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<FindEntry>;
    if (
      typeof entry.index !== "number" ||
      (entry.lengthClass !== 0 && entry.lengthClass !== 1 && entry.lengthClass !== 2) ||
      typeof entry.pangram !== "boolean" ||
      typeof entry.refusedBefore !== "number" ||
      typeof entry.meter !== "number" ||
      !Number.isInteger(entry.meter) ||
      entry.meter < 0 ||
      entry.meter > METER_CELLS
    ) {
      continue;
    }
    out.push({
      index: entry.index,
      lengthClass: entry.lengthClass,
      pangram: entry.pangram,
      refusedBefore: entry.refusedBefore,
      meter: entry.meter,
    });
  }
  return out;
}

/** A find to its token: pangram best, seven or more strong, five or six partial,
 *  four weak. Never miss, because a short word is still a find. */
export function tokenForFind(entry: Pick<FindEntry, "lengthClass" | "pangram">): ShareToken {
  if (entry.pangram) return "best";
  if (entry.lengthClass === 2) return "strong";
  if (entry.lengthClass === 1) return "partial";
  return "weak";
}

export function meterRow(meter: number): ShareRow {
  const row: ShareToken[] = [];
  for (let cell = 0; cell < METER_CELLS; cell += 1) row.push(cell < meter ? "barFull" : "barEmpty");
  return row;
}

/** The first eight finds in the player's order, padded with the unused token. */
export function openingRow(entries: readonly FindEntry[]): ShareRow {
  const row: ShareToken[] = entries.slice(0, METER_CELLS).map(tokenForFind);
  while (row.length < METER_CELLS) row.push("unused");
  return row;
}

/** PANGRAM.md 21. Grammar C, two rows of eight: the meter, then the opening. */
export function rowsFromEntries(entries: readonly FindEntry[]): ShareRow[] {
  const last = entries[entries.length - 1];
  return [meterRow(last === undefined ? 0 : last.meter), openingRow(entries)];
}

export function artifactTitle(state: PangramState, context: ShareContext): string {
  const outcome = finishedOutcomeFor(state);
  const found = state.found.length;
  const words = `${String(found)} ${found === 1 ? "word" : "words"}`;
  const pangram = pangramFound(state) ? ", pangram" : "";
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `PANGRAM #${String(context.puzzleNumber)} ${tierLabel(outcome.tier)}, ${words}${pangram}${streak}`;
}

/** PANGRAM.md 25. x is the find index, y the meter after it, and a find that
 *  followed refusals is a correction shape. A closing point marks where the
 *  player stopped, so a day ended with no finds still has a signature. */
export function fingerprintOf(entries: readonly FindEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: entry.meter,
    shape: entry.refusedBefore > 0 ? "correction" : "accepted",
  }));
  const last = entries[entries.length - 1];
  points.push({ x: entries.length, y: last === undefined ? 0 : last.meter, shape: "accepted" });
  return { points };
}

/** PANGRAM.md 21. Deterministic thresholds over the run only. */
export function archetypeOf(entries: readonly FindEntry[]): string {
  if (entries.length === 0) return "BROWSER";
  if (entries.slice(0, 3).some((entry) => entry.pangram)) return "HUNTER";
  const refusals = entries.reduce((sum, entry) => sum + entry.refusedBefore, 0);
  if (refusals >= entries.length) return "GUESSER";
  const long = entries.filter((entry) => entry.pangram || entry.lengthClass === 2).length;
  if (long * 2 >= entries.length) return "LONGHAND";
  return "BUILDER";
}

export function artifactOf(state: PangramState, run: RunLog, context: ShareContext): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: rowsFromEntries(entries),
    outcome: finishedOutcomeFor(state),
    fingerprint: fingerprintOf(entries),
    archetype: archetypeOf(entries),
  };
}

const BAR_TOKENS: ReadonlySet<ShareToken> = new Set<ShareToken>(["barFull", "barEmpty"]);
const FIND_TOKENS: ReadonlySet<ShareToken> = new Set<ShareToken>(["best", "strong", "partial", "weak"]);

/**
 * Section 16. Each probe is true when it detects a leak. The positive controls in
 * the telemetry tests feed each one an artifact built to leak and require it to
 * fire.
 */
export const pangramLeakProbes: LeakProbes = {
  /** The meter row holds bar tokens only and the opening row find tokens or the
   *  unused pad only. Any other token would be a channel for a letter. */
  positionLeak: (sample) => {
    const [meter, opening] = sample.artifact.rows;
    if (meter === undefined || opening === undefined) return true;
    if (meter.some((token) => !BAR_TOKENS.has(token))) return true;
    return opening.some((token) => !FIND_TOKENS.has(token) && token !== "unused");
  },

  /** The meter must be exactly what the fingerprint's last point rebuilds, so
   *  nothing but the run reached it. */
  answerPropertyLeak: (sample) => {
    const last = sample.artifact.fingerprint.points.at(-1);
    const rebuilt = meterRow(last === undefined ? 0 : last.y);
    return JSON.stringify(sample.artifact.rows[0]) !== JSON.stringify(rebuilt);
  },

  /** Order is the player's: full cells before empty ones, finds before the pad.
   *  Anything else would be a fixed puzzle ordering. */
  orderingLeak: (sample) => {
    const [meter, opening] = sample.artifact.rows;
    if (meter === undefined || opening === undefined) return true;
    const firstEmpty = meter.indexOf("barEmpty");
    if (firstEmpty >= 0 && meter.slice(firstEmpty).some((token) => token === "barFull")) return true;
    const firstPad = opening.indexOf("unused");
    return firstPad >= 0 && opening.slice(firstPad).some((token) => token !== "unused");
  },

  /** Exactly two rows of eight, whatever the day's answer count. */
  shapeLeak: (sample) =>
    sample.artifact.rows.length !== MAX_ROWS || sample.artifact.rows.some((row) => row.length !== METER_CELLS),
};
