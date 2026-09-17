/**
 * Layer 1. Share delivery. Requirement 3.5.5 and ARCHITECTURE2 section 38.
 *
 * Assembly moved to share-grammar.ts in v3 migration phase 5, so this file
 * owns one fact, how a finished string reaches the player, and never what the
 * string says. Section 53 gives each of those one authoritative answer.
 */

import { NO_OP_TELEMETRY, type Telemetry } from "./telemetry.js";

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * Requirement 3.5.5. The chain is Web Share, then the async clipboard, then a
 * hidden textarea with execCommand, then a manual copy box.
 *
 * `cancelled` is a distinct outcome and never falls through. A player who opens
 * the native share sheet and dismisses it has made a decision, and silently
 * writing to their clipboard afterwards is the wrong answer to it.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "manual";

/** The narrow slice of the platform this file uses, so a test needs no DOM. */
export interface ShareDeps {
  /** Absent where the Web Share API is unavailable. */
  readonly share?: (data: { text: string }) => Promise<void>;
  readonly writeClipboard?: (text: string) => Promise<void>;
  /** Legacy path. Returns whether the copy landed. */
  readonly legacyCopy?: (text: string) => boolean;
  readonly telemetry?: Telemetry;
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError"
  );
}

/**
 * Must be called synchronously from within a user gesture. Safari rejects a
 * Web Share invoked outside one, and that rejection is indistinguishable from a
 * genuine failure, so the fallback chain would be entered on a spurious error.
 */
export async function deliverShare(text: string, deps: ShareDeps): Promise<ShareOutcome> {
  const telemetry = deps.telemetry ?? NO_OP_TELEMETRY;

  if (deps.share !== undefined) {
    try {
      await deps.share({ text });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
      telemetry.fault("web share failed", { reason: String(error) });
    }
  }

  if (deps.writeClipboard !== undefined) {
    try {
      await deps.writeClipboard(text);
      return "copied";
    } catch (error) {
      telemetry.fault("clipboard write failed", { reason: String(error) });
    }
  }

  if (deps.legacyCopy !== undefined && deps.legacyCopy(text)) return "copied";

  return "manual";
}

/**
 * The last resort before showing a manual box. Off screen rather than hidden,
 * because a display none element cannot be selected.
 */
function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    /* Deprecated and still the only path on older iOS Safari. */
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Browser wiring. Kept beside the chain so the shell has no platform checks. */
export function browserShareDeps(telemetry?: Telemetry): ShareDeps {
  const nav = typeof navigator === "undefined" ? undefined : navigator;

  return {
    share: nav?.share === undefined ? undefined : (data) => nav.share(data),
    writeClipboard:
      nav?.clipboard?.writeText === undefined ? undefined : (value) => nav.clipboard.writeText(value),
    legacyCopy: typeof document === "undefined" ? undefined : (value) => legacyCopy(value),
    telemetry,
  };
}
