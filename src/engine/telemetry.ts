/**
 * Layer 1. Requirement 4.1.6 and 8.5.
 *
 * A seam, not a feature. Version 1 ships the no operation implementation and
 * nothing else, so the privacy claim in 8.5 is structurally true rather than a
 * promise. The seam exists so that adding a vendor later is a change to one
 * file rather than a change to every game.
 */

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
