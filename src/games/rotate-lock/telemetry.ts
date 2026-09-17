/**
 * Layer 4. ROTATE LOCK's run log, artifact mapping and leak probes.
 * ROTATE-LOCK.md section 17; ARCHITECTURE2 sections 13, 16, 17 and 18.
 *
 * The run log is the player's own moves, held on the device and never sent
 * anywhere. It carries what kind of move each one was and whether it went back
 * to an arrangement the run had already been in. It carries no piece, slot,
 * facing or cell, so nothing the mapper reads can say where the route goes.
 */

import type { ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import type { ArtifactModel, Fingerprint, FingerprintPoint, RunLog } from "../../engine/telemetry.js";
import { tierLabel } from "../../engine/tiers.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { MOVE_CAP, finishedOutcomeFor, type RotateLockState } from "./rules.js";

export const RUN_LOG_VERSION = 1;
export const ROW_WIDTH = 8;
export const MAX_ROWS = MOVE_CAP / ROW_WIDTH;

export interface RotateLockRunEntry {
  readonly index: number;
  readonly kind: "swap" | "rotate";
  readonly revisit: boolean;
  readonly opened: boolean;
}

export function runEntries(state: RotateLockState): readonly RotateLockRunEntry[] {
  const last = state.moves.length - 1;
  return state.moves.map((move, index) => ({
    index,
    kind: move.kind,
    revisit: move.revisit,
    opened: state.open && index === last,
  }));
}

export function runLogOf(state: RotateLockState): RunLog {
  return { v: RUN_LOG_VERSION, entries: runEntries(state) };
}

/** Re-narrows the opaque run log. A malformed entry is dropped, never thrown on,
 *  because the moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly RotateLockRunEntry[] {
  const out: RotateLockRunEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<RotateLockRunEntry>;
    if (
      typeof entry.index !== "number" ||
      (entry.kind !== "swap" && entry.kind !== "rotate") ||
      typeof entry.revisit !== "boolean" ||
      typeof entry.opened !== "boolean"
    ) {
      continue;
    }
    out.push({ index: entry.index, kind: entry.kind, revisit: entry.revisit, opened: entry.opened });
  }
  return out;
}

/**
 * ROTATE-LOCK.md 17.3. One token per move, eight to a row, a lone short row kept
 * as wide as it is, and a trailing short row padded so every row matches.
 */
export function rowsFromRevisits(revisits: readonly boolean[]): ShareRow[] {
  const rows: ShareToken[][] = [];
  for (let at = 0; at < revisits.length; at += ROW_WIDTH) {
    rows.push(revisits.slice(at, at + ROW_WIDTH).map((revisit): ShareToken => (revisit ? "barEmpty" : "barFull")));
  }
  if (rows.length > 1) {
    const last = rows[rows.length - 1] as ShareToken[];
    while (last.length < ROW_WIDTH) last.push("unused");
  }
  return rows.slice(0, MAX_ROWS);
}

export function artifactTitle(state: RotateLockState, context: ShareContext): string {
  const outcome = finishedOutcomeFor(state);
  const moves = state.moves.length;
  const result = state.open ? `${tierLabel(outcome.tier)}, ${String(moves)} ${moves === 1 ? "move" : "moves"}` : `${tierLabel(outcome.tier)}, jammed`;
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `ROTATE LOCK #${String(context.puzzleNumber)} ${result}${streak}`;
}

/** ROTATE-LOCK.md 17.6. Rhythm across, move kind up, backtracks as a shape. */
export function fingerprintOf(entries: readonly RotateLockRunEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: entry.kind === "swap" ? 0 : 1,
    shape: entry.revisit ? "correction" : "accepted",
  }));
  return { points };
}

export function artifactOf(state: RotateLockState, run: RunLog, context: ShareContext): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: rowsFromRevisits(entries.map((entry) => entry.revisit)),
    outcome: finishedOutcomeFor(state),
    fingerprint: fingerprintOf(entries),
  };
}

const MOVE_TOKENS: ReadonlySet<ShareToken> = new Set<ShareToken>(["barFull", "barEmpty"]);

/**
 * Section 16. The title and fingerprint checks are the engine's. These four are
 * ROTATE LOCK's, each true when it detects a leak. The positive controls in the
 * telemetry tests feed each one an artifact built to leak and require it to fire.
 */
export const rotateLockLeakProbes: LeakProbes = {
  /** Only move tokens and padding. A direction, tier or any other token would be
   *  a channel for a piece, a facing or a cell. */
  positionLeak: (sample) =>
    sample.artifact.rows.some((row) => row.some((token) => !MOVE_TOKENS.has(token) && token !== "unused")),

  /** The rows must be exactly what the fingerprint's revisit shapes rebuild, so
   *  nothing but the run reached them. */
  answerPropertyLeak: (sample) => {
    const revisits = sample.artifact.fingerprint.points.map((point) => point.shape === "correction");
    return JSON.stringify(sample.artifact.rows) !== JSON.stringify(rowsFromRevisits(revisits));
  },

  /** Padding only after the last move of the last row: the order is chronology. */
  orderingLeak: (sample) => {
    const rows = sample.artifact.rows;
    for (let r = 0; r < rows.length; r += 1) {
      const row = rows[r] as ShareRow;
      const firstPad = row.indexOf("unused");
      if (firstPad < 0) continue;
      if (r !== rows.length - 1) return true;
      if (row.slice(firstPad).some((token) => token !== "unused")) return true;
    }
    return false;
  },

  /** Rows are eight wide unless there is only one, and never more than seven. */
  shapeLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_ROWS) return true;
    return rows.length > 1 && rows.some((row) => row.length !== ROW_WIDTH);
  },
};
