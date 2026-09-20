/**
 * Layer 4. WORD LADDER's run log, artifact mapping and leak probes.
 * WORD-LADDER.md sections 19, 20, 21, 24 and 25; ARCHITECTURE2 sections 13, 16,
 * 17 and 18.
 *
 * The run log is the player's own climb, held on the device and never sent
 * anywhere. Each entry is whether that rung moved closer, level or farther from
 * the goal, and how many rungs were refused before it landed. It carries no
 * letter, word or distance value, so nothing the mapper reads can name the goal
 * or the route.
 */

import type { ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import type { ArtifactModel, Fingerprint, FingerprintPoint, RunLog } from "../../engine/telemetry.js";
import { tierLabel } from "../../engine/tiers.js";
import type { ShareToken, TierToken } from "../../shared/share-vocabulary.js";
import { MAX_SHARE_ROWS } from "./ladder.js";
import { finishedOutcomeFor, type WordLadderState } from "./rules.js";

export const RUN_LOG_VERSION = 1;
export const MAX_ROWS = MAX_SHARE_ROWS;

export interface RungEntry {
  readonly index: number;
  readonly progress: -1 | 0 | 1;
  readonly refusedBefore: number;
}

export function runEntries(state: WordLadderState): readonly RungEntry[] {
  return state.rungs.map((rung, index) => ({
    index,
    progress: rung.progress,
    refusedBefore: rung.refusedBefore,
  }));
}

export function runLogOf(state: WordLadderState): RunLog {
  return { v: RUN_LOG_VERSION, entries: runEntries(state) };
}

/** Re-narrows the opaque run log. A malformed entry is dropped, never thrown on,
 *  because the moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly RungEntry[] {
  const out: RungEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<RungEntry>;
    if (
      typeof entry.index !== "number" ||
      (entry.progress !== -1 && entry.progress !== 0 && entry.progress !== 1) ||
      typeof entry.refusedBefore !== "number"
    ) {
      continue;
    }
    out.push({ index: entry.index, progress: entry.progress, refusedBefore: entry.refusedBefore });
  }
  return out;
}

/** Progress to its tier token: closer best, level partial, farther weak. Never a
 *  miss token, so a detour reads as the scenic route, not a rebuke
 *  (WORD-LADDER.md 20). */
export function tokenForProgress(progress: -1 | 0 | 1): TierToken {
  if (progress === 1) return "best";
  if (progress === 0) return "partial";
  return "weak";
}

/** WORD-LADDER.md 21. Grammar B, one token per rung in climb order, capped at
 *  seven so the block stays inside the nine line grammar. Every row is one token,
 *  so all rows are the same width and nothing is padded. */
export function rowsFromEntries(entries: readonly RungEntry[]): ShareRow[] {
  return entries.slice(0, MAX_ROWS).map((entry): ShareRow => [tokenForProgress(entry.progress)]);
}

export function artifactTitle(state: WordLadderState, context: ShareContext): string {
  const outcome = finishedOutcomeFor(state);
  const rungs = state.rungs.length;
  const result = state.won
    ? `${tierLabel(outcome.tier)}, ${String(rungs)}/${String(state.puzzle.par)}`
    : `${tierLabel(outcome.tier)}, X/${String(state.puzzle.par)}`;
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `WORD LADDER #${String(context.puzzleNumber)} ${result}${streak}`;
}

/** WORD-LADDER.md 25. x is the rung index, y is the running progress so the line
 *  climbs and dips on a detour, and a rung refused before it landed is a
 *  correction shape. */
export function fingerprintOf(entries: readonly RungEntry[]): Fingerprint {
  let running = 0;
  const points: FingerprintPoint[] = entries.map((entry) => {
    running += entry.progress;
    return {
      x: entry.index,
      y: running,
      shape: entry.refusedBefore > 0 ? "correction" : "accepted",
    };
  });
  return { points };
}

/** WORD-LADDER.md 21. CLIMBER monotone and low friction, WANDERER detoured,
 *  GUESSER high friction, REVEALER ended by reveal. Deterministic thresholds. */
export function archetypeOf(state: WordLadderState, entries: readonly RungEntry[]): string {
  if (state.revealed) return "REVEALER";
  const refusals = entries.reduce((sum, entry) => sum + entry.refusedBefore, 0);
  const detoured = entries.some((entry) => entry.progress <= 0);
  if (refusals >= entries.length && entries.length > 0) return "GUESSER";
  if (detoured) return "WANDERER";
  return "CLIMBER";
}

export function artifactOf(state: WordLadderState, run: RunLog, context: ShareContext): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: rowsFromEntries(entries),
    outcome: finishedOutcomeFor(state),
    fingerprint: fingerprintOf(entries),
    archetype: archetypeOf(state, entries),
  };
}

const PROGRESS_TOKENS: ReadonlySet<ShareToken> = new Set<ShareToken>(["best", "partial", "weak"]);

/**
 * Section 16. Each probe is true when it detects a leak. The positive controls in
 * the telemetry tests feed each one an artifact built to leak and require it to
 * fire.
 */
export const wordLadderLeakProbes: LeakProbes = {
  /** Only the three progress tokens. Any other token would be a channel for a
   *  letter, a word or a distance. */
  positionLeak: (sample) => sample.artifact.rows.some((row) => row.some((token) => !PROGRESS_TOKENS.has(token))),

  /** The rows must be exactly what the fingerprint's progress steps rebuild, so
   *  nothing but the run reached them. The fingerprint y is cumulative, so the
   *  per row progress is its first difference. */
  answerPropertyLeak: (sample) => {
    const ys = sample.artifact.fingerprint.points.map((point) => point.y);
    const progress: (-1 | 0 | 1)[] = [];
    let previous = 0;
    for (const y of ys) {
      const step = y - previous;
      previous = y;
      progress.push(step > 0 ? 1 : step < 0 ? -1 : 0);
    }
    const rebuilt = progress.slice(0, MAX_ROWS).map((step): ShareRow => [tokenForProgress(step)]);
    return JSON.stringify(sample.artifact.rows) !== JSON.stringify(rebuilt);
  },

  /** Each row is a single token, so there is no within row order to leak. The
   *  probe fires if any row is not exactly one token. */
  orderingLeak: (sample) => sample.artifact.rows.some((row) => row.length !== 1),

  /** Every row is one token wide and there are never more than seven. */
  shapeLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_ROWS) return true;
    return rows.some((row) => row.length !== 1);
  },
};
