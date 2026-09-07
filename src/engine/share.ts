/**
 * Layer 1. Requirement 3.5 and 4.1.3.
 *
 * Assembly is driven entirely by the module's ShareBlock. The engine pads,
 * enforces the row cap, and appends the URL. It never invents a row and never
 * edits the title, which is what keeps the family look of 7.3.6 an engine
 * invariant rather than five games agreeing to behave.
 */

import { SHARE_MAX_ROWS, type ShareBlock } from "../core/types.js";
import {
  SHARE_PAD_TOKEN,
  renderShareRow,
  type ShareToken,
} from "../shared/share-vocabulary.js";
import { NO_OP_TELEMETRY, type Telemetry } from "./telemetry.js";

export interface ComposeOptions {
  /** Bare host, no scheme and no trailing slash. From GameIdentity.shareUrl. */
  readonly shareUrl: string;
  readonly telemetry?: Telemetry;
}

export interface ComposedShare {
  readonly text: string;
  readonly lines: readonly string[];
  /** True when the module exceeded SHARE_MAX_ROWS and rows were dropped. A
   *  module defect, surfaced rather than hidden. */
  readonly truncated: boolean;
}

/**
 * Padding is per block, to the widest row in that same block, not to a suite
 * constant. Contract decision 4. A suite constant would either truncate a wide
 * row or pad every one glyph row of every game to the widest game's width,
 * which reads as an empty progress bar.
 */
function padRows(rows: readonly (readonly ShareToken[])[]): readonly (readonly ShareToken[])[] {
  let width = 0;
  for (const row of rows) if (row.length > width) width = row.length;

  return rows.map((row) => {
    if (row.length === width) return row;
    const padded = row.slice();
    while (padded.length < width) padded.push(SHARE_PAD_TOKEN);
    return padded;
  });
}

export function composeShare(block: ShareBlock, options: ComposeOptions): ComposedShare {
  const telemetry = options.telemetry ?? NO_OP_TELEMETRY;

  if (block.title.includes("\n")) {
    throw new Error("share title must be a single line");
  }
  if (options.shareUrl.includes("\n") || options.shareUrl.trim() === "") {
    throw new Error("share url must be a non empty single line");
  }

  let rows = block.rows;
  let truncated = false;
  if (rows.length > SHARE_MAX_ROWS) {
    telemetry.fault("share block exceeded the row cap", {
      rows: rows.length,
      cap: SHARE_MAX_ROWS,
    });
    rows = rows.slice(0, SHARE_MAX_ROWS);
    truncated = true;
  }

  const lines = [block.title, ...padRows(rows).map(renderShareRow), options.shareUrl];
  return { text: lines.join("\n"), lines, truncated };
}

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
