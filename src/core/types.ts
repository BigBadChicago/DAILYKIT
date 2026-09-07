/**
 * Layer 0. The narrow structural types that Layer 1 engine services are written
 * against.
 *
 * These live here rather than in contract/ because the layer rule puts the
 * engine below the contract. share.ts, stats.ts, and state-machine.ts must be
 * able to name a share block and an outcome without importing GameModule, or the
 * engine would depend on the seam it is supposed to be independent of. Layer 3
 * composes these into the contract; the engine only ever sees these.
 */

import type { ShareToken } from "../shared/share-vocabulary.js";

/** Count of whole local days since a game's epoch, plus one. Requirement 3.1.1. */
export type PuzzleNumber = number;

/** Derived by core/seed.ts from game id, puzzle number, and optional salt. */
export type Seed = number;

/** Opaque JSON payload owned by a game. The engine stores it and never reads
 *  inside it. Requirement 5.3. */
export interface SerializedState {
  /** Game owned payload version. The envelope version is the engine's. */
  readonly v: number;
  readonly data: unknown;
}

/** A refused player action. Routine, not a defect. The announce string is read
 *  into the a11y live region by the engine, which is how requirement 8.1 is
 *  satisfied once rather than remembered by every game. */
export interface Rejection {
  /** Stable machine code, used by tests and by telemetry seams. */
  readonly code: string;
  /** Human sentence, already localized in the sense that it is plain text. */
  readonly announce: string;
}

export interface OngoingOutcome {
  readonly kind: "ongoing";
}

export interface FinishedOutcome {
  readonly kind: "finished";
  readonly score: number;
  /** Null when the module sets hasWinLoss false. Resolves the conflict between
   *  requirement 3.4 and locked decision 4. */
  readonly won: boolean | null;
  /** Short human summary for the end screen, for example cards remaining. */
  readonly detail: string;
}

export type Outcome = OngoingOutcome | FinishedOutcome;

/** Ordered histogram bucket labels. The engine renders them; the module decides
 *  what they mean and which one a finished game lands in. Requirement 3.4. */
export interface DistributionSpec {
  readonly labels: readonly string[];
  /** Rendered with emphasis, for example the perfect clear bucket. */
  readonly distinguishedIndex: number | null;
}

export type ShareRow = readonly ShareToken[];

/** What a module returns from shareBlock. The engine appends the URL line and
 *  validates the shape. It never invents rows and never edits the title. */
export interface ShareBlock {
  /** Game name, puzzle number, result summary, and streak if any.
   *  Requirement 3.5.1 and charter decision 1 and 7. */
  readonly title: string;
  readonly rows: readonly ShareRow[];
}

/** Engine supplied facts a module may use when composing its title. */
export interface ShareContext {
  readonly puzzleNumber: PuzzleNumber;
  readonly currentStreak: number;
  /** False past the manifest horizon, where no stored optimum exists. See
   *  recorded conflict resolution 3. */
  readonly rated: boolean;
}

/** Title plus rows plus URL. Charter decision 1 caps the block at ten lines. */
export const SHARE_MAX_ROWS = 8;

/**
 * Rows within one block are padded by the engine to the width of the widest row
 * in that same block, using SHARE_PAD_TOKEN. Width is per block and not a suite
 * constant, because POKER GRID pairs one glyph hand rows with a wide summary bar
 * and a fixed suite width would either truncate the bar or pad every hand row of
 * every game to the widest game's bar. Requirement 3.5.4 therefore holds as an
 * engine invariant without constraining what a game may encode.
 */
