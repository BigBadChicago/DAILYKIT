/**
 * Layer 4. DIFFERENCE RELAY's run log, artifact mapping and leak probes.
 * DIFFERENCE-RELAY.md section 17; ARCHITECTURE2 sections 13, 16, 17 and 18.
 *
 * The run log is the player's own runs, held on the device and never sent
 * anywhere. Each entry is how far the baton reached that run, whether it opened
 * the line, and whether the run stalled. It carries no number, station, mark or
 * order, so nothing the mapper reads can say where the answer goes.
 */

import type { ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import type { ArtifactModel, Fingerprint, FingerprintPoint, RunLog } from "../../engine/telemetry.js";
import { tierLabel } from "../../engine/tiers.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { GAPS, MAX_RUNS } from "./relay.js";
import { finishedOutcomeFor, type DifferenceRelayState } from "./rules.js";

export const RUN_LOG_VERSION = 1;
export const ROW_WIDTH = GAPS;
export const MAX_ROWS = MAX_RUNS;

export interface RelayRunEntry {
  readonly index: number;
  readonly depth: number;
  readonly won: boolean;
  readonly stalled: boolean;
}

export function runEntries(state: DifferenceRelayState): readonly RelayRunEntry[] {
  let best = -1;
  return state.runs.map((run, index) => {
    const stalled = run.depth <= best;
    if (run.depth > best) best = run.depth;
    return { index, depth: run.depth, won: run.depth === GAPS, stalled };
  });
}

export function runLogOf(state: DifferenceRelayState): RunLog {
  return { v: RUN_LOG_VERSION, entries: runEntries(state) };
}

/** Re-narrows the opaque run log. A malformed entry is dropped, never thrown on,
 *  because the moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly RelayRunEntry[] {
  const out: RelayRunEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<RelayRunEntry>;
    if (
      typeof entry.index !== "number" ||
      typeof entry.depth !== "number" ||
      typeof entry.won !== "boolean" ||
      typeof entry.stalled !== "boolean"
    ) {
      continue;
    }
    out.push({ index: entry.index, depth: entry.depth, won: entry.won, stalled: entry.stalled });
  }
  return out;
}

/**
 * DIFFERENCE-RELAY.md 17.3. One row per run, a meter of `depth` full tokens then
 * empty to the fixed five gaps, so every row is exactly five wide and nothing is
 * padded.
 */
export function rowsFromDepths(depths: readonly number[]): ShareRow[] {
  return depths.slice(0, MAX_ROWS).map((depth): ShareRow => {
    const clamped = Math.max(0, Math.min(ROW_WIDTH, depth));
    const row: ShareToken[] = [];
    for (let i = 0; i < ROW_WIDTH; i += 1) row.push(i < clamped ? "barFull" : "barEmpty");
    return row;
  });
}

export function artifactTitle(state: DifferenceRelayState, context: ShareContext): string {
  const outcome = finishedOutcomeFor(state);
  const runs = state.runs.length;
  const result = state.won ? `${tierLabel(outcome.tier)}, ${String(runs)}/6` : `${tierLabel(outcome.tier)}, X/6`;
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `DIFFERENCE RELAY #${String(context.puzzleNumber)} ${result}${streak}`;
}

/** DIFFERENCE-RELAY.md 17.6. Depth up the y, run index across, a stall as a
 *  correction shape and the opening run flagged. */
export function fingerprintOf(entries: readonly RelayRunEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: entry.depth,
    shape: entry.stalled ? "correction" : "accepted",
  }));
  return { points };
}

export function artifactOf(state: DifferenceRelayState, run: RunLog, context: ShareContext): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: rowsFromDepths(entries.map((entry) => entry.depth)),
    outcome: finishedOutcomeFor(state),
    fingerprint: fingerprintOf(entries),
  };
}

const METER_TOKENS: ReadonlySet<ShareToken> = new Set<ShareToken>(["barFull", "barEmpty"]);

/**
 * Section 16. The title and fingerprint checks are the engine's. These four are
 * DIFFERENCE RELAY's, each true when it detects a leak. The positive controls in
 * the telemetry tests feed each one an artifact built to leak and require it to fire.
 */
export const differenceRelayLeakProbes: LeakProbes = {
  /** Only meter tokens. Any other token would be a channel for a number, a mark
   *  or a station. */
  positionLeak: (sample) => sample.artifact.rows.some((row) => row.some((token) => !METER_TOKENS.has(token))),

  /** The rows must be exactly what the fingerprint's depths rebuild, so nothing
   *  but the run reached them. */
  answerPropertyLeak: (sample) => {
    const depths = sample.artifact.fingerprint.points.map((point) => point.y);
    return JSON.stringify(sample.artifact.rows) !== JSON.stringify(rowsFromDepths(depths));
  },

  /** Within a row every full token precedes every empty one: the row is a reach
   *  meter, never a per gap map that could name which gap failed. */
  orderingLeak: (sample) =>
    sample.artifact.rows.some((row) => {
      const firstEmpty = row.indexOf("barEmpty");
      return firstEmpty >= 0 && row.slice(firstEmpty).some((token) => token !== "barEmpty");
    }),

  /** Every row is exactly five wide and there are never more than six. */
  shapeLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_ROWS) return true;
    return rows.some((row) => row.length !== ROW_WIDTH);
  },
};
