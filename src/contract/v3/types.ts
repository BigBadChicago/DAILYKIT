/**
 * Layer 3. The v3 descriptor types layered on top of contract/types.ts.
 * ARCHITECTURE2 sections 3, 13 and 23. The two folders stay apart after v3
 * migration phase 6 because folding them would touch every import for a tidier
 * name; BACKLOG.md records that change.
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
