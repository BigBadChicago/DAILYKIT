/**
 * Layer 1. The share grammar renderer and validator. ARCHITECTURE2 section 15.
 *
 * A grammar is a game's declaration of how its rows are shaped; the renderer is
 * grammar agnostic because rows arrive as semantic tokens already. The engine
 * enforces the family constraints so a game cannot break the suite look: at most
 * nine total lines, at most eight tokens per row, a bare URL last line, and only
 * the approved vocabulary, which the ShareToken type already guarantees.
 */

import { err, ok, type Result } from "../core/result.js";
import { SHARE_GLYPHS } from "../shared/share-vocabulary.js";
import type { ArtifactModel } from "./telemetry.js";

export const SHARE_GRAMMARS = ["A", "B", "C", "D", "E", "F"] as const;
export type ShareGrammar = (typeof SHARE_GRAMMARS)[number];

/** Section 15. Title plus URL are two of these, so rows are capped at seven. */
export const SHARE_MAX_LINES = 9;
export const SHARE_MAX_TOKENS_PER_ROW = 8;

export interface GrammarFault {
  readonly code: "too-tall" | "row-too-wide" | "empty-row" | "bad-title" | "bad-url";
  readonly detail: string;
}

export function renderArtifactText(model: ArtifactModel, url: string): string[] {
  const rows = model.rows.map((row) => {
    let out = "";
    for (const token of row) out += SHARE_GLYPHS[token];
    return out;
  });
  return [model.title, ...rows, url];
}

/**
 * Validates the model against the grammar constraints before it is rendered or
 * copied. Checks the row shape, not the codepoints, because ShareToken already
 * bounds the vocabulary at the type level.
 */
export function validateArtifactText(model: ArtifactModel, url: string): Result<true, GrammarFault> {
  if (model.title.length === 0 || model.title.includes("\n")) {
    return err({ code: "bad-title", detail: "title must be one non empty line" });
  }
  if (url.length === 0 || url.includes("\n") || /\s/.test(url)) {
    return err({ code: "bad-url", detail: "url must be a bare single token" });
  }
  const totalLines = model.rows.length + 2;
  if (totalLines > SHARE_MAX_LINES) {
    return err({ code: "too-tall", detail: `${String(totalLines)} lines exceeds ${String(SHARE_MAX_LINES)}` });
  }
  for (const row of model.rows) {
    if (row.length === 0) return err({ code: "empty-row", detail: "a row has no tokens" });
    if (row.length > SHARE_MAX_TOKENS_PER_ROW) {
      return err({ code: "row-too-wide", detail: `a row has ${String(row.length)} tokens` });
    }
  }
  return ok(true);
}
