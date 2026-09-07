/**
 * Layer 3. The descriptor and handle types that make up the seam, split from
 * game-module.ts so that file holds only the interface itself and its erasure.
 */

import type {
  DistributionSpec,
  PuzzleNumber,
  Rejection,
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
 * Requirement 5.9, widened from the flat pointer and keyboard pair.
 *
 * The grid variant lets ui/gridCursor.ts supply full keyboard play for any
 * lattice game without the game reimplementing arrow key handling. It activates
 * only on this declaration, so a non grid game never pulls the helper in and the
 * presentation kit does not assume grids.
 */
export type PointerMode = "drag" | "tap" | "none";

export interface GridInput {
  readonly kind: "grid";
  readonly cols: number;
  readonly rows: number;
  readonly pointer: PointerMode;
}

export interface CustomInput {
  readonly kind: "custom";
  readonly pointer: PointerMode;
  /** KeyboardEvent.key values the game wants forwarded. Anything not listed is
   *  left to the chrome, which is how modal focus traps stay intact. */
  readonly keys: readonly string[];
}

export type InputDescriptor = GridInput | CustomInput;

/**
 * The shell fetches, the game parses. Requirement 6.3.1 and charter decision 3.
 * Keeping the fetch in the shell puts network, service worker caching, offline
 * fallback, and the past horizon unrated path in one place instead of five.
 */
export interface ManifestDescriptor {
  /** Monthly chunking per charter decision 3. */
  readonly granularity: "month";
  /** Returns the absolute URL of the chunk containing this puzzle number. */
  urlForChunk(puzzleNumber: PuzzleNumber): string;
  /** Absolute URL of the index carrying the horizon and chunk pointers. */
  readonly indexUrl: string;
  /** How many days past today to prefetch. Charter decision 3 says seven. */
  readonly lookaheadDays: number;
}

/** Requirement 3.7.1. A worked micro example, not paragraphs of rules. */
export interface HelpContent {
  readonly headline: string;
  readonly steps: readonly string[];
  readonly example: {
    readonly caption: string;
    readonly lines: readonly string[];
    /** Optional. A game that needs a drawn example, for example a small board,
     *  paints into this host. The panel itself stays engine owned. */
    readonly draw?: (host: HTMLElement) => void;
  };
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

export interface StateFailure {
  readonly code: "malformed" | "unsupported-version" | "puzzle-mismatch";
  readonly detail: string;
}

export type { Rejection, DistributionSpec };
