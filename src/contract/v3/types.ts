/**
 * Layer 3. The v3 descriptor types layered on top of the v2 contract types.
 * ARCHITECTURE2 sections 3, 13 and 23. Kept beside the v2 contract so the live
 * legacy games keep compiling against contract/types.ts unchanged.
 */

import type { PuzzleCertification } from "../../engine/certification.js";
import type { ShareGrammar } from "../../engine/share-grammar.js";
import type { TelemetryPattern } from "../../core/types.js";

/** What a game declares about its share output. The engine reads it on the hub
 *  card and in the certification gate, and it is stored in the manifest entry. */
export interface ShareCapabilities {
  readonly grammar: ShareGrammar;
  /** At least two, per section 13. */
  readonly patterns: readonly TelemetryPattern[];
  /** Rows the game emits at most, never above seven so the block stays inside
   *  the nine line cap once the title and URL are added. */
  readonly maxRows: number;
}

/** The neutral manifest entry. `puzzlePayload` is opaque to the engine.
 *  Section 23.1. */
export interface ManifestEntryV3 {
  readonly puzzleNumber: number;
  readonly seed: number;
  readonly puzzleHash: string;
  readonly generatorVersion: number;
  readonly puzzlePayload: unknown;
  readonly difficulty: number;
  readonly band: number;
  readonly certification: PuzzleCertification | null;
  readonly shareCapabilities: ShareCapabilities;
}
