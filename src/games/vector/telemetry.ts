/**
 * Layer 4. VECTOR's social telemetry and its artifact mapping. ARCHITECTURE2
 * sections 13, 16, 17 and 18.
 *
 * The run log carries how the player worked, never what the board says. VECTOR
 * already refused to grade a failure by how close it came, VECTOR.md 6.1,
 * because that is board information travelling to someone who has not played,
 * and the fingerprint ships in the same artifact and inherits the rule. So the
 * only numbers here are counts of the player's own accepted actions.
 */

import type { ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import { tierLabel } from "../../engine/tiers.js";
import type {
  ArtifactModel,
  Fingerprint,
  FingerprintPoint,
  RunLog,
} from "../../engine/telemetry.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import {
  MAX_SUBMISSIONS,
  finishedOutcomeFor,
  tierFor,
  type VectorState,
} from "./rules.js";

export const RUN_LOG_VERSION = 1;

/** Cells per share row. The suite meter width. VECTOR.md 12. */
export const SHARE_ROW_WIDTH = 5;

/** Fingerprint y values run 0 to EFFORT_BANDS - 1. Section 18. */
export const EFFORT_BANDS = 5;

/**
 * One submission's worth of run. `blanks` is the count of empty cells on the
 * board, which every player of the day sees and which says nothing about the
 * solution; it is the denominator the effort band is measured against and it is
 * carried here so the mapper reads only the run log, section 13.3.
 */
export interface VectorRunEntry {
  /** Zero based submission index, which is also the row's position. */
  readonly index: number;
  readonly cycles: number;
  readonly changes: number;
  readonly solved: boolean;
  readonly blanks: number;
}

/**
 * Effort band, 0 to 4, from accepted actions relative to the number of blanks.
 * Integer comparisons only, so the band is identical in every engine, which is
 * the same reason the RNG is integer only.
 *
 * Filling a board takes at least one action per blank, so a first submission
 * starts at band 0 and climbs as the player reworks cells. A later submission
 * can be a single change, which is band 0 again, and that is the intended
 * reading: it took one touch.
 */
export function effortBand(cycles: number, blanks: number): number {
  if (blanks <= 0 || cycles <= 0) return 0;
  const scaled = cycles * 4;
  if (scaled <= blanks * 4) return 0;
  if (scaled <= blanks * 6) return 1;
  if (scaled <= blanks * 8) return 2;
  if (scaled <= blanks * 12) return 3;
  return 4;
}

export function vectorEntries(state: VectorState): readonly VectorRunEntry[] {
  const blanks = state.puzzle.geometry.blankCells.length;
  const last = state.effort.length - 1;
  return state.effort.map((effort, index) => ({
    index,
    cycles: effort.cycles,
    changes: effort.changes,
    solved: state.solved && index === last,
    blanks,
  }));
}

export function vectorRunLog(state: VectorState): RunLog {
  return { v: RUN_LOG_VERSION, entries: vectorEntries(state) };
}

/** The engine hands back an opaque RunLog, so the entries are re-narrowed here
 *  rather than assumed. A malformed entry is dropped rather than thrown on;
 *  the moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly VectorRunEntry[] {
  const out: VectorRunEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<VectorRunEntry>;
    if (
      typeof entry.index !== "number" ||
      typeof entry.cycles !== "number" ||
      typeof entry.changes !== "number" ||
      typeof entry.blanks !== "number" ||
      typeof entry.solved !== "boolean"
    ) {
      continue;
    }
    out.push({
      index: entry.index,
      cycles: entry.cycles,
      changes: entry.changes,
      solved: entry.solved,
      blanks: entry.blanks,
    });
  }
  return out;
}

/**
 * One row per submission, five cells each, `best` across for the submission that
 * solved it and `miss` across for one that did not. VECTOR.md 12, unchanged by
 * v3: the artifact is a richer carrier for the same block.
 */
export function artifactRows(entries: readonly VectorRunEntry[]): ShareRow[] {
  return entries.map((entry) => {
    const token: ShareToken = entry.solved ? "best" : "miss";
    return new Array<ShareToken>(SHARE_ROW_WIDTH).fill(token);
  });
}

/** The rows a given outcome must produce, used by the answer property probe.
 *  Rows are a function of the outcome alone, which is the claim being tested. */
export function rowsForOutcome(submissions: number, solved: boolean): ShareRow[] {
  const entries: VectorRunEntry[] = [];
  for (let index = 0; index < submissions; index += 1) {
    entries.push({
      index,
      cycles: 0,
      changes: 0,
      solved: solved && index === submissions - 1,
      blanks: 0,
    });
  }
  return artifactRows(entries);
}

export function artifactTitle(state: VectorState, context: ShareContext): string {
  /* Never unrated: the tier is the submission count, not a stored optimum, so
     tierLabel is never handed a null here. Contract decision 16. */
  const label = tierLabel(tierFor(state));
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `VECTOR #${String(context.puzzleNumber)} ${label}${streak}`;
}

/**
 * Section 18. One point per submission: chronology across, effort up, and a
 * shape that separates the submission that landed from one that was reworked
 * and one that was not. Two players who both solve on the second submission
 * differ here whenever they worked differently, which is the property a tier
 * restyled as a picture cannot have.
 */
export function vectorFingerprint(entries: readonly VectorRunEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: effortBand(entry.cycles, entry.blanks),
    shape: entry.solved ? "accepted" : entry.changes > 0 ? "correction" : "refused",
  }));
  return { points };
}

export function vectorArtifact(
  state: VectorState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: artifactRows(entries),
    outcome: finishedOutcomeFor(state),
    fingerprint: vectorFingerprint(entries),
  };
}

/**
 * Section 16. The harness checks the title and the fingerprint for every game;
 * these four are the correlations only VECTOR can compute. A probe returns true
 * when it detects a leak.
 */
export const vectorLeakProbes: LeakProbes = {
  /** Every row is one token repeated, so no position inside a row can carry a
   *  cell, a direction or an order. A mixed row would be a new channel. */
  positionLeak: (sample) => sample.artifact.rows.some((row) => new Set(row).size > 1),

  /** The rows are a function of the outcome alone. If they are not, something
   *  about the board reached them. */
  answerPropertyLeak: (sample) => {
    const outcome = sample.artifact.outcome;
    const solved = outcome.won === true;
    const submissions = solved ? outcome.bucket + 1 : MAX_SUBMISSIONS;
    const expected = rowsForOutcome(submissions, solved);
    return JSON.stringify(sample.artifact.rows) !== JSON.stringify(expected);
  },

  /** Rows are player chronology: at most one solving row and it is the last. */
  orderingLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_SUBMISSIONS) return true;
    for (let at = 0; at < rows.length; at += 1) {
      const isBest = (rows[at] as ShareRow)[0] === "best";
      if (isBest && at !== rows.length - 1) return true;
    }
    return false;
  },

  /** The silhouette is a rectangle of fixed width, so it reconstructs nothing. */
  shapeLeak: (sample) => sample.artifact.rows.some((row) => row.length !== SHARE_ROW_WIDTH),
};
