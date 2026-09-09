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

export type PointerMode = "drag" | "tap" | "none";

export interface GridInput {
  readonly kind: "grid";
  readonly cols: number;
  readonly rows: number;
  readonly pointer: PointerMode;
}

/**
 * A game whose focus model is not a lattice. Phase 11 correction, defect 3:
 * `custom` means the game owns its own keyboard handling, because ui/gridCursor
 * serves a grid and nothing in the kit serves anything else yet. `keys` is a
 * declaration of what the game listens for, so the engine can keep its own
 * shortcuts out of the way, and not a promise that the engine will wire them.
 */
export interface CustomInput {
  readonly kind: "custom";
  readonly pointer: PointerMode;
  readonly keys: readonly string[];
}

export type InputDescriptor = GridInput | CustomInput;

export interface HelpContent {
  readonly headline: string;
  readonly steps: readonly string[];
  readonly example: {
    readonly caption: string;
    readonly lines: readonly string[];
    readonly draw?: (host: HTMLElement) => void;
  };
}

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

/**
 * Structural mirror of engine/tiers.ts TierIndex. The layer rule puts tiers in
 * Layer 1 and this file in Layer 0, so the width is restated here rather than
 * imported, the same mechanism helpPanel.ts uses for HelpContent. A test
 * asserts the two agree, so widening the tier scale fails loudly.
 */
export type TierOrdinal = 0 | 1 | 2 | 3 | 4;

export interface FinishedOutcome {
  readonly kind: "finished";
  readonly score: number;
  /** Null when the module sets hasWinLoss false. Resolves the conflict between
   *  requirement 3.4 and locked decision 4. */
  readonly won: boolean | null;
  /** Short human summary for the end screen, for example cards remaining. */
  readonly detail: string;
  /**
   * The graded band, or null where nothing exists to grade against, which is
   * every board past a game's manifest horizon. Added in Phase 10: requirement
   * 7.3.5's daily card needs one graded result per game at the suite level, and
   * the suite cannot reach a module's private tier calculation. Without this
   * the tier existed only inside a share title string.
   */
  readonly tier: TierOrdinal | null;
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

/** Rows only. A block is this plus a title line and a URL line, so charter
 *  decision 1's ten line cap is eight rows. */
export const SHARE_MAX_ROWS = 8;

/**
 * Rows within one block are padded by the engine to the width of the widest row
 * in that same block, using SHARE_PAD_TOKEN. Width is per block and not a suite
 * constant, because POKER GRID pairs one glyph hand rows with a wide summary bar
 * and a fixed suite width would either truncate the bar or pad every hand row of
 * every game to the widest game's bar. Requirement 3.5.4 therefore holds as an
 * engine invariant without constraining what a game may encode.
 */
