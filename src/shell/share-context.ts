/**
 * Layer 5. What a share is told about the session, and the one function that
 * turns a finished session into the string the player shares. Both are kept
 * out of main.ts so they can be tested per game without mounting a session.
 */

import type { AnyGameModuleV3, OpaquePuzzle, OpaqueState } from "../contract/v3/game-module.js";
import type { PuzzleNumber } from "../core/types.js";
import { composeArtifact, type ComposedArtifact } from "../engine/artifact.js";
import { NO_OP_TELEMETRY, type Telemetry } from "../engine/telemetry.js";

export type ShareSessionMode = "live" | "archive" | "tutorial";

/**
 * Requirement 3.6.1 and resolution 6 keep a replay out of every live aggregate.
 * The share title is the one place that separation reaches a reader, so a
 * replay is told the streak is zero rather than today's number, which the
 * puzzle in its title had nothing to do with. A tutorial never shares at all
 * and is covered here so a later change cannot make it the exception.
 */
export function shareStreakFor(mode: ShareSessionMode, currentStreak: number): number {
  return mode === "live" ? currentStreak : 0;
}

export interface ResultShareSession {
  readonly puzzleNumber: PuzzleNumber;
  readonly mode: ShareSessionMode;
  readonly rated: boolean;
  readonly puzzle: OpaquePuzzle;
  readonly state: OpaqueState;
}

/**
 * Section 53's chain for one finished session: the module's run log, the
 * module's artifact, the engine's composer. The shell never builds a row or a
 * title itself and there is no second path to one.
 */
export function composeResultShare(
  game: AnyGameModuleV3,
  session: ResultShareSession,
  currentStreak: number,
  shareUrl: string,
  telemetry: Telemetry = NO_OP_TELEMETRY,
): ComposedArtifact {
  const run = game.telemetry(session.state);
  const model = game.shareArtifact(session.puzzle, session.state, run, {
    puzzleNumber: session.puzzleNumber,
    currentStreak: shareStreakFor(session.mode, currentStreak),
    rated: session.rated,
  });
  return composeArtifact(model, shareUrl, telemetry);
}
