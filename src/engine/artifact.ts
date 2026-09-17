/**
 * Layer 1. Validates a game's ArtifactModel and renders its text form.
 * ARCHITECTURE2 section 17. There is one model and one scoring path; the text
 * renderer and the future graphic card both read from here.
 */

import { err, ok, type Result } from "../core/result.js";
import {
  composeShareText,
  renderArtifactText,
  validateArtifactText,
  type ComposedShareText,
  type GrammarFault,
} from "./share-grammar.js";
import { NO_OP_TELEMETRY, type ArtifactModel, type Telemetry } from "./telemetry.js";

export interface ArtifactFault {
  readonly code: "no-fingerprint" | "not-finished" | GrammarFault["code"];
  readonly detail: string;
}

/** A model is valid when it grades a finished game, carries a behavioral
 *  fingerprint, and fits the share grammar. */
export function validateArtifact(model: ArtifactModel, url: string): Result<ArtifactModel, ArtifactFault> {
  if (model.outcome.kind !== "finished") {
    return err({ code: "not-finished", detail: "an artifact grades a finished game only" });
  }
  if (model.fingerprint.points.length === 0) {
    return err({ code: "no-fingerprint", detail: "artifact carries no fingerprint" });
  }
  const grammar = validateArtifactText(model, url);
  if (!grammar.ok) return err({ code: grammar.error.code, detail: grammar.error.detail });
  return ok(model);
}

/** The clipboard string: title, token rows, then the bare URL. */
export function renderArtifact(model: ArtifactModel, url: string): string {
  return renderArtifactText(model, url).join("\n");
}

export interface ComposedArtifact {
  readonly text: string;
  readonly lines: readonly string[];
  readonly fault: ArtifactFault | null;
}

/**
 * What the shell delivers. The text always comes from composeShareText, so a
 * grammar defect is repaired there under engine decision 21. The two faults
 * only an artifact can have, a missing fingerprint and an unfinished outcome,
 * cannot change the string, so they are reported and the string still ships.
 */
export function composeArtifact(
  model: ArtifactModel,
  url: string,
  telemetry: Telemetry = NO_OP_TELEMETRY,
): ComposedArtifact {
  const composed: ComposedShareText = composeShareText(model, url, telemetry);
  if (composed.fault !== null) return composed;
  const checked = validateArtifact(model, url);
  if (checked.ok) return { ...composed, fault: null };
  telemetry.fault("artifact failed validation", { code: checked.error.code, detail: checked.error.detail });
  return { ...composed, fault: checked.error };
}
