/**
 * Layer 3. The descriptor and handle types that make up the seam, split from
 * game-module.ts so that file holds only the interface itself and its erasure.
 */

import type {
  DistributionSpec,
  HelpContent,
  InputDescriptor,
  PuzzleNumber,
  Rejection,
} from "../core/types.js";

export type {
  CustomInput,
  GridInput,
  HelpContent,
  InputDescriptor,
  PointerMode,
} from "../core/types.js";

/** Requirement 5.1. Everything the chrome needs to render a game's identity
 *  without knowing anything else about it. */
export interface GameIdentity {
  /** Stable, lowercase, hyphenated. Storage keys and seeds derive from it, so
   *  changing it after launch is a migration and not a rename. */
  readonly id: string;
  readonly displayName: string;
  /** Calendar date, not a UTC instant. Requirement 3.1.2 and charter decision 5. */
  readonly epoch: { readonly year: number; readonly month: number; readonly day: number };
  /** Bare host string that becomes the last line of the share block. */
  readonly shareUrl: string;
  /** CSS custom property values applied to the game route only. Requirement
   *  7.3.8 gives a game its identity here and nowhere else. */
  readonly accent: { readonly hue: string; readonly boardFontStack: string };
  /** One sentence rule for the hub listing. Requirement 7.1.6. */
  readonly oneLineRule: string;
}

/**
 * The shell fetches, the game parses. Requirement 6.3.1 and charter decision 3.
 * Keeping the fetch in the shell puts network, service worker caching, offline
 * fallback, and the past horizon unrated path in one place instead of five.
 */
export interface ManifestDescriptor {
  /**
   * Absolute URL of the index, which carries the horizon and one pointer per
   * chunk. The index is the only thing that says where a day lives: a module
   * states where the index is and nothing more.
   *
   * A chunk is a JSON object holding `entries`, keyed by puzzle number as a
   * string, whose values are whatever `parsePuzzle` reads. The engine looks up
   * one entry by key and never inspects it further. Phase 11 correction,
   * defect 7: this format used to be enforced by shell code and stated nowhere,
   * so game two had to discover it by watching a puzzle fail to load.
   *
   * How many chunks a horizon has, and how days divide between them, is the
   * index's business. Phase 11 correction, defect 1 removed a `granularity`
   * field that nothing read and that a game with one chunk could only fill in
   * falsely, and the first onboarding review removed `urlForChunk`, which every
   * module implemented and nothing ever called.
   */
  readonly indexUrl: string;
  /** How many days past today to prefetch. Charter decision 3 says seven. */
  readonly lookaheadDays: number;
}

/**
 * Requirement 5.8. Returned by mount rather than exposed as further methods on
 * the module, because a module is a singleton and per session mutable render
 * state must not be shared. An archive view open beside a live board is the case
 * that breaks the singleton version.
 */
export interface GameView<TState> {
  update(state: TState): void;
  unmount(): void;
}

/** What a game receives when it mounts. The engine owns the chrome; this is the
 *  entire surface a renderer is allowed to touch beyond its own host element. */
export interface MountContext<TState, TAction, TPuzzle> {
  readonly puzzle: TPuzzle;
  readonly initial: TState;
  /** The only way a game causes a state change. The shell routes this through
   *  apply and the state machine, so a game can never mutate state directly. */
  dispatch(action: TAction): void;
  /** Pushed to the ARIA live region. Requirement 8.1. */
  announce(message: string): void;
  /** Requirement 8.1. Honoured by the game's own transitions. */
  readonly reducedMotion: boolean;
  /** True in ARCHIVED_VIEW so a renderer can suppress result reveal chrome. */
  readonly readOnly: boolean;
}

export interface PuzzleFailure {
  readonly code: "malformed" | "missing" | "unsupported-version";
  readonly detail: string;
}

/**
 * `puzzle-mismatch` is optional, not obligatory. Phase 11 correction, defect 6:
 * the engine owns puzzle identity and restores stored state only when the saved
 * puzzle number equals the day being opened, so a game whose state cannot tell
 * one puzzle from another is safe. A game that can detect it cheaply, as POKER
 * GRID does by checking its cards, should still say so.
 */
export interface StateFailure {
  readonly code: "malformed" | "unsupported-version" | "puzzle-mismatch";
  readonly detail: string;
}

export type { Rejection, DistributionSpec };
