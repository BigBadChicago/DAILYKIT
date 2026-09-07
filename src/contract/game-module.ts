/**
 * Layer 3. The spine. Section 5.
 *
 * Three type parameters, not one. Rules need an action type distinct from state,
 * and a puzzle definition is distinct from in progress state because only the
 * latter is serialized. Collapsing any of the three forces unknown into the game
 * side of the seam, which moves type checking from the compiler into every
 * game's implementation.
 *
 * The shell cannot be generic over a triple it learns at build time, so this file
 * also owns the one place in the codebase where those parameters are erased.
 */

import type { Result } from "../core/result.js";
import type {
  DistributionSpec,
  FinishedOutcome,
  Outcome,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareBlock,
  ShareContext,
} from "../core/types.js";
import type {
  GameIdentity,
  GameView,
  HelpContent,
  InputDescriptor,
  ManifestDescriptor,
  MountContext,
  PuzzleFailure,
  StateFailure,
} from "./types.js";

export interface GameModule<TState, TAction, TPuzzle> {
  // Identity and declarations. Requirement 5.1 and 5.9.

  readonly identity: GameIdentity;
  readonly input: InputDescriptor;
  readonly manifest: ManifestDescriptor;

  /** Requirement 3.6.2. */
  readonly archiveEnabled: boolean;

  /** False suppresses the win rate row. Recorded conflict resolution 1. */
  readonly hasWinLoss: boolean;

  /** Version of this game's serialized payload only. The storage envelope
   *  carries its own engine version, so requirement 7.3.3 holds: a defect in one
   *  game's migration cannot reach another game's key. */
  readonly stateVersion: number;

  /** Requirement 5.7. */
  readonly distribution: DistributionSpec;

  // Puzzle production. Requirement 5.2.

  /**
   * Parse a payload the shell fetched from the manifest chunk. Synchronous on
   * purpose: the module does no network work, so offline behavior is testable
   * without stubbing fetch inside a game.
   */
  parsePuzzle(
    puzzleNumber: PuzzleNumber,
    raw: unknown,
  ): Result<TPuzzle, PuzzleFailure>;

  /** Fallback past the manifest horizon. Requirement 6.3.1. Boards produced this
   *  way are unrated, which the engine signals through ShareContext.rated. */
  generatePuzzle(
    puzzleNumber: PuzzleNumber,
    seed: Seed,
  ): Result<TPuzzle, PuzzleFailure>;

  /** Requirement 3.7.3 and charter decision 2. Absence of this method disables
   *  the TUTORIAL state entirely for this game. */
  firstSessionPuzzle?(): TPuzzle;

  // State. Requirement 5.3.

  initialState(puzzle: TPuzzle): TState;

  /** Snapshot, not an action log. A log would freeze apply semantics across every
   *  stored save, turning a routine rules fix into a migration event. */
  serialize(state: TState): SerializedState;

  deserialize(
    puzzle: TPuzzle,
    raw: SerializedState,
  ): Result<TState, StateFailure>;

  /** Requirement 3.3.2. Called with any payload version below stateVersion and
   *  expected to return one at stateVersion, without loss of result or stats. */
  migrateState(
    fromVersion: number,
    raw: SerializedState,
  ): Result<SerializedState, StateFailure>;

  // Rules. Requirement 5.4 and 5.5.

  /** Pure. No DOM, no clock, no randomness beyond the seeded RNG. */
  apply(state: TState, action: TAction): Result<TState, Rejection>;

  inspect(state: TState): Outcome;

  /** Index into distribution.labels. Requirement 5.7. */
  bucketOf(outcome: FinishedOutcome, state: TState): number;

  // Share. Requirement 5.6.

  /** Rows are semantic tokens. The engine pads, appends the URL, and enforces
   *  SHARE_MAX_ROWS, so a game cannot break the family look of 7.3.6. */
  shareBlock(state: TState, context: ShareContext): ShareBlock;

  // Presentation. Requirement 5.8 and 5.10.

  mount(
    host: HTMLElement,
    context: MountContext<TState, TAction, TPuzzle>,
  ): GameView<TState>;

  help(): HelpContent;
}

/**
 * Erasure.
 *
 * The shell holds one of these and never names a concrete state, action, or
 * puzzle type. Every opaque value it handles came out of the same module it is
 * about to hand it back to, so the branding below is sound in practice and the
 * compiler still refuses to let the shell mix values from two modules.
 */
declare const opaqueTag: unique symbol;

interface Opaque<Tag extends string> {
  readonly [opaqueTag]: Tag;
}

export type OpaqueState = Opaque<"state">;
export type OpaqueAction = Opaque<"action">;
export type OpaquePuzzle = Opaque<"puzzle">;

export type AnyGameModule = GameModule<
  OpaqueState,
  OpaqueAction,
  OpaquePuzzle
>;

/**
 * The only cast in the codebase outside of storage parsing. Boundary code per
 * constraint 2.1. Every game's entry point exports defineGame(...) and nothing
 * else, so this cast happens exactly once per game and never in engine or shell
 * source.
 */
export function defineGame<TState, TAction, TPuzzle>(
  module: GameModule<TState, TAction, TPuzzle>,
): AnyGameModule {
  return module as unknown as AnyGameModule;
}
