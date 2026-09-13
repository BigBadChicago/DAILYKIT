/**
 * Layer 1. Two telemetry concepts share this file, kept apart by section header.
 *
 * The first is the analytics seam of the original architecture (requirement
 * 4.1.6 and 8.5): a no operation vendor interface so privacy is structurally
 * true. The second is the v3 social telemetry (ARCHITECTURE2 section 13 and 17):
 * the local run log a game turns into a shareable artifact. The two never mix;
 * the analytics seam never sees puzzle or run content.
 */

import { err, ok, type Result } from "../core/result.js";
import type { FinishedOutcomeV3, ShareRow } from "../core/types.js";

// ---------------------------------------------------------------------------
// Analytics seam. Original architecture.
// ---------------------------------------------------------------------------

export interface TelemetryEvent {
  readonly name: string;
  /** Flat, primitive valued, and never containing puzzle content. A vendor
   *  added later must not be able to reconstruct a board from event payloads. */
  readonly fields?: Readonly<Record<string, string | number | boolean>>;
}

export interface Telemetry {
  track(event: TelemetryEvent): void;
  /** Engine defects and recovered illegal transitions. Separate from track so a
   *  later vendor can route them differently without inspecting event names. */
  fault(message: string, fields?: Readonly<Record<string, string | number | boolean>>): void;
}

export const NO_OP_TELEMETRY: Telemetry = Object.freeze({
  track(): void {
    /* Intentionally empty. See file header. */
  },
  fault(): void {
    /* Intentionally empty. See file header. */
  },
});

/**
 * Development only. Not wired into any build; the shell substitutes it by hand
 * when someone is debugging a lifecycle problem.
 */
export function createConsoleTelemetry(sink: Pick<Console, "info" | "warn">): Telemetry {
  return {
    track(event: TelemetryEvent): void {
      sink.info(`[telemetry] ${event.name}`, event.fields ?? {});
    },
    fault(message: string, fields?: Readonly<Record<string, string | number | boolean>>): void {
      sink.warn(`[fault] ${message}`, fields ?? {});
    },
  };
}

// ---------------------------------------------------------------------------
// Social telemetry. ARCHITECTURE2 sections 13 and 17.
// ---------------------------------------------------------------------------

/** Opaque to the engine, like SerializedState. A game reads its own entries. */
export interface RunLog {
  readonly v: number;
  readonly entries: readonly unknown[];
}

/** A fingerprint point describes player behavior, never puzzle data. Section 18. */
export type FingerprintShape = "accepted" | "refused" | "correction";

export interface FingerprintPoint {
  /** Action or attempt index along the run. */
  readonly x: number;
  /** Mapped quality of that action. */
  readonly y: number;
  readonly shape: FingerprintShape;
}

export interface Fingerprint {
  readonly points: readonly FingerprintPoint[];
}

/**
 * The canonical artifact. One model, two renderers, no second scoring path.
 * `rows` are semantic tokens the engine renders and validates; a game never
 * emits codepoints.
 */
export interface ArtifactModel {
  readonly title: string;
  readonly rows: readonly ShareRow[];
  readonly outcome: FinishedOutcomeV3;
  readonly fingerprint: Fingerprint;
  readonly archetype?: string;
}

export interface RunLogFault {
  readonly code: "malformed";
  readonly detail: string;
}

/** A stored or reconstructed RunLog is validated before it drives an artifact. */
export function validateRunLog(raw: unknown): Result<RunLog, RunLogFault> {
  if (typeof raw !== "object" || raw === null) {
    return err({ code: "malformed", detail: "run log is not an object" });
  }
  const log = raw as { v?: unknown; entries?: unknown };
  if (typeof log.v !== "number" || !Number.isInteger(log.v)) {
    return err({ code: "malformed", detail: "run log version is not an integer" });
  }
  if (!Array.isArray(log.entries)) {
    return err({ code: "malformed", detail: "run log entries is not an array" });
  }
  return ok({ v: log.v, entries: log.entries });
}
