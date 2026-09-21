/**
 * Layer 4. FIVE LETTERS run log, artifact mapping and leak probes.
 * FIVE-LETTERS.md sections 19 to 25; ARCHITECTURE2 sections 13, 16, 17 and 18.
 *
 * The run log is the player's own guesses reduced to integers, held on the device
 * and never sent anywhere. Each entry is the count of right and present marks,
 * how many letters changed from the previous guess, whether the guess respected
 * the feedback already held, and how many words were refused before it. No
 * letter, word or position is in it, so nothing the mapper reads can name the
 * answer or say which slot was right.
 */

import type { ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import type { ArtifactModel, Fingerprint, FingerprintPoint, FingerprintShape, RunLog } from "../../engine/telemetry.js";
import { tierLabel } from "../../engine/tiers.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { MAX_GUESSES, WORD_LENGTH, countsOf, patternOf, patternOfMarks } from "./feedback.js";
import { finishedOutcomeFor, solved, type FiveLettersState, type GuessRecord } from "./rules.js";

export const RUN_LOG_VERSION = 1;
/** One cell per letter. */
export const SHARE_ROW_WIDTH = WORD_LENGTH;
/** One row per guess. */
export const MAX_ROWS = MAX_GUESSES;

/** 2 consistent with every earlier row, 1 with the latest only, 0 with neither.
 *  The first guess is 2: an empty set of constraints contradicts nothing. */
export type Discipline = 0 | 1 | 2;

export interface GuessEntry {
  readonly index: number;
  readonly right: number;
  readonly present: number;
  /** Positions whose letter changed since the previous guess; 0 for the first. */
  readonly churn: number;
  readonly discipline: Discipline;
  readonly refusedBefore: number;
  readonly solved: boolean;
}

/** Whether `word` could be the answer given one earlier row. Marks are not
 *  symmetric in answer and guess, so the candidate is always the answer side. */
function agreesWith(word: string, record: GuessRecord): boolean {
  return patternOf(word, record.word) === patternOfMarks(record.marks);
}

export function churnBetween(previous: string, current: string): number {
  let changed = 0;
  for (let i = 0; i < WORD_LENGTH; i += 1) if (previous[i] !== current[i]) changed += 1;
  return changed;
}

export function disciplineAt(guesses: readonly GuessRecord[], index: number): Discipline {
  const word = (guesses[index] as GuessRecord).word;
  let all = true;
  for (let earlier = 0; earlier < index; earlier += 1) {
    if (!agreesWith(word, guesses[earlier] as GuessRecord)) {
      all = false;
      break;
    }
  }
  if (all) return 2;
  return agreesWith(word, guesses[index - 1] as GuessRecord) ? 1 : 0;
}

export function runEntries(state: FiveLettersState): readonly GuessEntry[] {
  return state.guesses.map((record, index) => {
    const { right, present } = countsOf(record.marks);
    return {
      index,
      right,
      present,
      churn: index === 0 ? 0 : churnBetween((state.guesses[index - 1] as GuessRecord).word, record.word),
      discipline: disciplineAt(state.guesses, index),
      refusedBefore: record.refusedBefore,
      solved: right === WORD_LENGTH,
    };
  });
}

export function runLogOf(state: FiveLettersState): RunLog {
  return { v: RUN_LOG_VERSION, entries: runEntries(state) };
}

const isCount = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;

/** Re-narrows the opaque run log. A malformed entry is dropped, never thrown on,
 *  because the moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly GuessEntry[] {
  const out: GuessEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<GuessEntry>;
    if (
      !isCount(entry.index, MAX_GUESSES) ||
      !isCount(entry.right, WORD_LENGTH) ||
      !isCount(entry.present, WORD_LENGTH) ||
      entry.right + entry.present > WORD_LENGTH ||
      !isCount(entry.churn, WORD_LENGTH) ||
      (entry.discipline !== 0 && entry.discipline !== 1 && entry.discipline !== 2) ||
      !isCount(entry.refusedBefore, Number.MAX_SAFE_INTEGER) ||
      typeof entry.solved !== "boolean"
    ) {
      continue;
    }
    out.push({
      index: entry.index,
      right: entry.right,
      present: entry.present,
      churn: entry.churn,
      discipline: entry.discipline,
      refusedBefore: entry.refusedBefore,
      solved: entry.solved,
    });
  }
  return out;
}

/**
 * FIVE-LETTERS.md 21. Cells are sorted, right first, then present, then absent,
 * CIPHER's mapping. The genre's positional grid is refused: measured, one shared
 * positional block leaves as few as 4 answers possible, a sorted block never
 * fewer than 126 (FIVE-LETTERS.md 30).
 */
export function shareRow(right: number, present: number): ShareRow {
  const cells: ShareToken[] = [];
  for (let i = 0; i < right; i += 1) cells.push("best");
  for (let i = 0; i < present; i += 1) cells.push("partial");
  while (cells.length < SHARE_ROW_WIDTH) cells.push("miss");
  return cells;
}

export function artifactRows(entries: readonly GuessEntry[]): ShareRow[] {
  return entries.slice(0, MAX_ROWS).map((entry) => shareRow(entry.right, entry.present));
}

export function artifactTitle(state: FiveLettersState, context: ShareContext): string {
  const outcome = finishedOutcomeFor(state);
  const count = solved(state) ? String(state.guesses.length) : "X";
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `FIVE LETTERS #${String(context.puzzleNumber)} ${tierLabel(outcome.tier)}, ${count}/${String(MAX_GUESSES)}${streak}`;
}

/** What the title may be, held by the answer property probe. */
export const TITLE_PATTERN = /^FIVE LETTERS #\d+ (?:Excellent|Great|Good|Fair|Rough), [1-6X]\/6(?:, streak \d+)?$/;

const SHAPE_BY_DISCIPLINE: readonly FingerprintShape[] = ["refused", "correction", "accepted"];

/** FIVE-LETTERS.md 25. Chronology across, letters changed up, and whether the
 *  guess was licensed by what the player already held. */
export function fingerprintOf(entries: readonly GuessEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: entry.churn,
    shape: SHAPE_BY_DISCIPLINE[entry.discipline] ?? "refused",
  }));
  return { points };
}

/** FIVE-LETTERS.md 21. Deterministic thresholds over the run only. */
export function archetypeOf(entries: readonly GuessEntry[]): string {
  if (entries.length === 0) return "UNSTARTED";
  const later = entries.slice(1);
  if (later.length > 0 && later.every((entry) => entry.discipline === 2)) return "STRICT";
  if (later.filter((entry) => entry.churn >= 4).length * 2 > later.length) return "PROBER";
  if (entries.reduce((sum, entry) => sum + entry.refusedBefore, 0) >= entries.length) return "TYPIST";
  return "STEADY";
}

export function artifactOf(state: FiveLettersState, run: RunLog, context: ShareContext): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: artifactRows(entries),
    outcome: finishedOutcomeFor(state),
    fingerprint: fingerprintOf(entries),
    archetype: archetypeOf(entries),
  };
}

const CELL_RANK: Readonly<Record<string, number>> = { best: 0, partial: 1, miss: 2 };

function isSolveRow(row: ShareRow): boolean {
  return row.length === SHARE_ROW_WIDTH && row.every((token) => token === "best");
}

/**
 * Section 16. Each probe is true when it detects a leak, and each has a positive
 * control in tests/games/five-letters/telemetry.test.ts that feeds it an
 * artifact built to leak.
 */
export const fiveLettersLeakProbes: LeakProbes = {
  /** Sorted by rank, so no cell position corresponds to a letter position. */
  positionLeak: (sample) =>
    sample.artifact.rows.some((row) => {
      let rank = -1;
      for (const token of row) {
        const next = CELL_RANK[token];
        if (next === undefined || next < rank) return true;
        rank = next;
      }
      return false;
    }),

  /** Every row a legal count pair (four right and one present is impossible),
   *  the title held to its pattern, and the outcome agreeing with the last row. */
  answerPropertyLeak: (sample) => {
    if (!TITLE_PATTERN.test(sample.artifact.title)) return true;
    const rows = sample.artifact.rows;
    for (const row of rows) {
      let right = 0;
      let present = 0;
      for (const token of row) {
        if (token === "best") right += 1;
        else if (token === "partial") present += 1;
        else if (token !== "miss") return true;
      }
      if (right === WORD_LENGTH - 1 && present === 1) return true;
    }
    const last = rows[rows.length - 1];
    if (last !== undefined && isSolveRow(last) !== (sample.artifact.outcome.won === true)) return true;
    return false;
  },

  /** Player chronology: at most six rows, and a solved row only last. */
  orderingLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_ROWS) return true;
    return rows.some((row, at) => isSolveRow(row) && at !== rows.length - 1);
  },

  /** A rectangle five cells wide; its one free dimension, the guess count, is
   *  already in the title. */
  shapeLeak: (sample) => sample.artifact.rows.some((row) => row.length !== SHARE_ROW_WIDTH),
};
