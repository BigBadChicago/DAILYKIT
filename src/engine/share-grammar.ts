/**
 * Layer 1. The share grammar renderer, validator and composer. ARCHITECTURE2
 * section 15.
 *
 * Since v3 migration phase 5 this is the only place a share string is built.
 * A game's ArtifactModel and the suite's daily card both reach it as a
 * ShareText, so the nine line cap, the eight token cap and the same width rule
 * hold for every string the suite can emit. Rows arrive as semantic tokens,
 * so the renderer is grammar agnostic and the vocabulary is closed by type.
 */

import { err, ok, type Result } from "../core/result.js";
import type { ShareRow } from "../core/types.js";
import { SHARE_GLYPHS } from "../shared/share-vocabulary.js";
import { NO_OP_TELEMETRY, type Telemetry } from "./telemetry.js";

export const SHARE_GRAMMARS = ["A", "B", "C", "D", "E", "F"] as const;
export type ShareGrammar = (typeof SHARE_GRAMMARS)[number];

/** Section 15. Title plus URL are two of these, so rows are capped at seven. */
export const SHARE_MAX_LINES = 9;
export const SHARE_MAX_ROWS = SHARE_MAX_LINES - 2;
export const SHARE_MAX_TOKENS_PER_ROW = 8;

/**
 * What the grammar reads. An ArtifactModel satisfies it structurally. The
 * daily card supplies exactly this and nothing more, because it has no outcome
 * and no fingerprint, and inventing either would be a second scoring path.
 */
export interface ShareText {
  readonly title: string;
  readonly rows: readonly ShareRow[];
}

export interface GrammarFault {
  readonly code: "too-tall" | "row-too-wide" | "empty-row" | "ragged-rows" | "bad-title" | "bad-url";
  readonly detail: string;
}

export function renderArtifactText(share: ShareText, url: string): string[] {
  const rows = share.rows.map((row) => {
    let out = "";
    for (const token of row) out += SHARE_GLYPHS[token];
    return out;
  });
  return [share.title, ...rows, url];
}

/**
 * Checks row shape, not codepoints, because ShareToken already bounds the
 * vocabulary at the type level.
 *
 * Ragged rows are refused rather than padded. v2 padded short rows, which let
 * requirement 3.5.4 hold without any game counting columns; v3 has no padding,
 * so the requirement is enforced here instead. Every live game already emits
 * uniform rows, which each game's shape probe asserts.
 */
export function validateArtifactText(share: ShareText, url: string): Result<true, GrammarFault> {
  if (share.title.length === 0 || share.title.includes("\n")) {
    return err({ code: "bad-title", detail: "title must be one non empty line" });
  }
  if (url.length === 0 || url.includes("\n") || /\s/.test(url)) {
    return err({ code: "bad-url", detail: "url must be a bare single token" });
  }
  const totalLines = share.rows.length + 2;
  if (totalLines > SHARE_MAX_LINES) {
    return err({ code: "too-tall", detail: `${String(totalLines)} lines exceeds ${String(SHARE_MAX_LINES)}` });
  }
  const first = share.rows[0];
  for (const row of share.rows) {
    if (row.length === 0) return err({ code: "empty-row", detail: "a row has no tokens" });
    if (row.length > SHARE_MAX_TOKENS_PER_ROW) {
      return err({ code: "row-too-wide", detail: `a row has ${String(row.length)} tokens` });
    }
    if (first !== undefined && row.length !== first.length) {
      return err({
        code: "ragged-rows",
        detail: `rows of ${String(first.length)} and ${String(row.length)} tokens in one block`,
      });
    }
  }
  return ok(true);
}

export interface ComposedShareText {
  readonly text: string;
  readonly lines: readonly string[];
  /** The grammar fault the input had, or null. When set, `text` is the
   *  repaired string that was delivered instead. */
  readonly fault: GrammarFault | null;
}

/** Title used only when a module supplies an empty one, so a repaired string
 *  still names the suite. */
const FALLBACK_TITLE = "DAILYKIT";

/**
 * The only composer. Engine decision 21 carried into v3: a module defect found
 * at the moment the player taps share is reported as a telemetry fault and
 * repaired, never thrown, because that moment is the worst one for an
 * exception. The repair only removes: the title is cut to its first line, rows
 * are capped at SHARE_MAX_ROWS, each row is capped at the token limit, and
 * empty rows are dropped. A ragged block is delivered as it is, because adding
 * a token would put a claim in the string the player did not make.
 *
 * The URL is a suite constant rather than module output, so a bad URL is a
 * programming error and throws.
 */
export function composeShareText(
  share: ShareText,
  url: string,
  telemetry: Telemetry = NO_OP_TELEMETRY,
): ComposedShareText {
  const checked = validateArtifactText(share, url);
  if (checked.ok) {
    const lines = renderArtifactText(share, url);
    return { text: lines.join("\n"), lines, fault: null };
  }
  if (checked.error.code === "bad-url") throw new Error(checked.error.detail);

  telemetry.fault("share text failed the grammar", {
    code: checked.error.code,
    detail: checked.error.detail,
  });

  const title = share.title.split("\n").find((line) => line.length > 0) ?? FALLBACK_TITLE;
  const rows = share.rows
    .filter((row) => row.length > 0)
    .slice(0, SHARE_MAX_ROWS)
    .map((row) => row.slice(0, SHARE_MAX_TOKENS_PER_ROW));
  const lines = renderArtifactText({ title, rows }, url);
  return { text: lines.join("\n"), lines, fault: checked.error };
}
