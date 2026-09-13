/**
 * Layer 3. The v3 game seam. ARCHITECTURE2 section 3.
 *
 * v3 is the v2 GameModule plus four additions and a richer outcome: an emergent
 * `difficulty`, a local `telemetry` run log, a `shareArtifact` mapper, and
 * `tierOf` split out from `bucketOf`. The proven v2 method names are kept so a
 * legacy game migrates by adding methods rather than being rewritten, which is
 * the migration stance of section 47. Three type parameters are retained; the
 * run log stays opaque rather than becoming a fourth.
 */

import type { Result } from "../../core/result.js";
import type {
  DistributionSpec,
  FinishedOutcomeV3,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareContext,
  TierOrdinal,
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
  bucketOf(outcome: FinishedOutcomeV3, state: TState): number;
  /** New in v3. Split from bucketOf so the histogram and the tier are separate. */
  tierOf(outcome: FinishedOutcomeV3, state: TState): TierOrdinal | null;

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

/** The single v3 erasure point, mirroring defineGame for the v2 contract. */
export function defineGameV3<TState, TAction, TPuzzle>(
  module: GameModuleV3<TState, TAction, TPuzzle>,
): AnyGameModuleV3 {
  return module as unknown as AnyGameModuleV3;
}
