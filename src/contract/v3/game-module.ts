/**
 * Layer 3. The v3 game seam. ARCHITECTURE2 section 3.
 *
 * The only game contract since v3 migration phase 6 deleted v2. v3 began as the
 * v2 GameModule plus three additions and a richer outcome: an emergent
 * `difficulty`, a local `telemetry` run log, and a `shareArtifact` mapper. The
 * proven v2 method names were kept so each legacy game migrated by adding
 * methods rather than being rewritten, which is the stance of section 47.
 * Three type parameters are retained; the run log stays opaque rather than
 * becoming a fourth.
 *
 * The bucket and the tier are fields of the finished outcome and nothing else.
 * `bucketOf` and `tierOf` were removed in v3 migration phase 5: they restated
 * facts `inspect` already returns, which is two answers to one question and
 * the drift section 53 exists to prevent. The shell reads the outcome.
 */

import type { Result } from "../../core/result.js";
import type {
  DistributionSpec,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareContext,
} from "../../core/types.js";
import type { ArtifactModel, RunLog } from "../../engine/telemetry.js";
import type {
  GameIdentity,
  GameView,
  HelpContent,
  InputDescriptor,
  ManifestDescriptor,
  MountContext,
  PuzzleFailure,
  StateFailure,
} from "../types.js";
import type { ShareCapabilities } from "./types.js";

export interface GameModuleV3<TState, TAction, TPuzzle> {
  readonly identity: GameIdentity;
  readonly input: InputDescriptor;
  readonly manifest: ManifestDescriptor;
  readonly archiveEnabled: boolean;
  readonly hasWinLoss: boolean;
  readonly stateVersion: number;
  readonly distribution: DistributionSpec;
  /** New in v3. Declares the game's share grammar and telemetry patterns. */
  readonly shareCapabilities: ShareCapabilities;

  parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<TPuzzle, PuzzleFailure>;
  generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<TPuzzle, PuzzleFailure>;
  firstSessionPuzzle?(): TPuzzle;

  initialState(puzzle: TPuzzle): TState;
  serialize(state: TState): SerializedState;
  deserialize(puzzle: TPuzzle, raw: SerializedState): Result<TState, StateFailure>;
  migrateState(fromVersion: number, raw: SerializedState): Result<SerializedState, StateFailure>;

  apply(state: TState, action: TAction): Result<TState, Rejection>;
  inspect(state: TState): OutcomeV3;

  /** New in v3. One emergent integer, measured the way the puzzle is certified. */
  difficulty(puzzle: TPuzzle): number;

  /** New in v3. The compact local run log, section 13. */
  telemetry(state: TState): RunLog;
  /** New in v3. The pure mapper from run log to the canonical artifact,
   *  section 17. No hidden puzzle data may enter here. */
  shareArtifact(
    puzzle: TPuzzle,
    state: TState,
    run: RunLog,
    context: ShareContext,
  ): ArtifactModel;

  mount(host: HTMLElement, context: MountContext<TState, TAction, TPuzzle>): GameView<TState>;
  help(): HelpContent;
}

declare const opaqueTag: unique symbol;
interface Opaque<Tag extends string> {
  readonly [opaqueTag]: Tag;
}
export type OpaqueState = Opaque<"state">;
export type OpaqueAction = Opaque<"action">;
export type OpaquePuzzle = Opaque<"puzzle">;

export type AnyGameModuleV3 = GameModuleV3<OpaqueState, OpaqueAction, OpaquePuzzle>;

/** The single erasure point. Every game's module file default exports
 *  defineGameV3(...), so the cast happens once per game and never in engine or
 *  shell source. The v2 defineGame it mirrored was deleted in v3 migration
 *  phase 6, which left this the only contract. */
export function defineGameV3<TState, TAction, TPuzzle>(
  module: GameModuleV3<TState, TAction, TPuzzle>,
): AnyGameModuleV3 {
  return module as unknown as AnyGameModuleV3;
}
