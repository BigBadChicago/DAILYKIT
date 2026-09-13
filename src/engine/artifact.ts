/**
 * Layer 1. Validates a game's ArtifactModel and renders its text form.
 * ARCHITECTURE2 section 17. There is one model and one scoring path; the text
 * renderer and the future graphic card both read from here.
 */

import { err, ok, type Result } from "../core/result.js";
import { renderArtifactText, validateArtifactText, type GrammarFault } from "./share-grammar.js";
import type { ArtifactModel } from "./telemetry.js";

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
