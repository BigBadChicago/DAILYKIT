/**
 * Layer 4. A trivial game that implements GameModuleV3 end to end, so the v3
 * contract is proven before an expensive game is migrated. Not shipped: it has
 * no entry, no html, and no registry row. Guess the hidden digit in three tries.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  DistributionSpec,
  FinishedOutcomeV3,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareContext,
  ShareRow,
  TierOrdinal,
} from "../../core/types.js";
import { intBelow } from "../../core/rng.js";
import { rngFromSeed } from "../../core/seed.js";
import type { ArtifactModel, Fingerprint, RunLog } from "../../engine/telemetry.js";
import { defineGameV3, type GameModuleV3 } from "../../contract/v3/game-module.js";
import type {
  GameIdentity,
  GameView,
  HelpContent,
  InputDescriptor,
  ManifestDescriptor,
  MountContext,
  PuzzleFailure,
  StateFailure,
} from "../../contract/types.js";
import type { ShareCapabilities } from "../../contract/v3/types.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";

const MAX_GUESSES = 3;

interface ToyPuzzle { readonly number: PuzzleNumber; readonly target: number; }
interface ToyState { readonly puzzle: ToyPuzzle; readonly guesses: readonly number[]; }
type ToyAction = { readonly kind: "guess"; readonly value: number };

const identity: GameIdentity = {
  id: "toy-v3",
  displayName: "TOY V3",
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "0", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Guess the hidden digit in three tries.",
};
const input: InputDescriptor = { kind: "custom", pointer: "none", keys: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] };
const manifest: ManifestDescriptor = { indexUrl: "/data/toy-v3/manifest.index.json", lookaheadDays: 7 };
const distribution: DistributionSpec = { labels: ["1 guess", "2 guesses", "3 guesses", "Not solved"], distinguishedIndex: 0 };
const shareCapabilities: ShareCapabilities = { grammar: "A", patterns: ["deterministic-output", "emergent-fingerprint"], maxRows: MAX_GUESSES };

function makePuzzle(number: PuzzleNumber, target: number): ToyPuzzle { return { number, target }; }
function parsePuzzle(number: PuzzleNumber, raw: unknown): Result<ToyPuzzle, PuzzleFailure> {
  const t = (raw as { t?: unknown } | null)?.t;
  if (typeof t !== "number" || !Number.isInteger(t) || t < 0 || t > 9) {
    return err({ code: "malformed", detail: "target digit is not 0 to 9" });
  }
  return ok(makePuzzle(number, t));
}
function generatePuzzle(number: PuzzleNumber, seed: Seed): Result<ToyPuzzle, PuzzleFailure> {
  return ok(makePuzzle(number, intBelow(rngFromSeed(seed), 10)));
}
function initialState(puzzle: ToyPuzzle): ToyState { return { puzzle, guesses: [] }; }

function won(state: ToyState): boolean {
  const last = state.guesses[state.guesses.length - 1];
  return last !== undefined && last === state.puzzle.target;
}
function finished(state: ToyState): boolean { return won(state) || state.guesses.length >= MAX_GUESSES; }

function apply(state: ToyState, action: ToyAction): Result<ToyState, Rejection> {
  if (finished(state)) return err({ code: "game-over", announce: "This puzzle is finished." });
  if (!Number.isInteger(action.value) || action.value < 0 || action.value > 9) {
    return err({ code: "not-a-digit", announce: "Guess a digit from 0 to 9." });
  }
  return ok({ ...state, guesses: [...state.guesses, action.value] });
}

function finishedOutcome(state: ToyState): FinishedOutcomeV3 {
  const isWin = won(state);
  return {
    kind: "finished",
    score: isWin ? state.guesses.length : 0,
    won: isWin,
    detail: isWin ? `Solved on guess ${String(state.guesses.length)}` : "Not solved",
    tier: isWin ? ((state.guesses.length - 1) as TierOrdinal) : null,
    bucket: isWin ? state.guesses.length - 1 : MAX_GUESSES,
    difficulty: difficulty(state.puzzle),
  };
}
function inspect(state: ToyState): OutcomeV3 { return finished(state) ? finishedOutcome(state) : { kind: "ongoing" }; }
function difficulty(_puzzle: ToyPuzzle): number { return 1; }
function bucketOf(outcome: FinishedOutcomeV3): number { return outcome.bucket; }
function tierOf(outcome: FinishedOutcomeV3): TierOrdinal | null { return outcome.tier; }

function telemetry(state: ToyState): RunLog {
  return { v: 1, entries: state.guesses.map((value, index) => ({ index, correct: value === state.puzzle.target })) };
}
function shareArtifact(puzzle: ToyPuzzle, state: ToyState, run: RunLog, context: ShareContext): ArtifactModel {
  const rows: ShareRow[] = run.entries.map((entry) => {
    const token: ShareToken = (entry as { correct: boolean }).correct ? "best" : "miss";
    return [token];
  });
  const points = run.entries.map((entry, x) => {
    const correct = (entry as { correct: boolean }).correct;
    return { x, y: correct ? 1 : 0, shape: correct ? ("accepted" as const) : ("refused" as const) };
  });
  const fingerprint: Fingerprint = { points };
  const outcome = finishedOutcome(state);
  const suffix = outcome.won ? `guess ${String(state.guesses.length)}` : "unsolved";
  return { title: `TOY V3 #${String(context.puzzleNumber)} ${suffix}`, rows, outcome, fingerprint };
}

function serialize(state: ToyState): SerializedState { return { v: 1, data: { g: state.guesses } }; }
function deserialize(puzzle: ToyPuzzle, raw: SerializedState): Result<ToyState, StateFailure> {
  if (raw.v !== 1) return err({ code: "unsupported-version", detail: `version ${String(raw.v)}` });
  const g = (raw.data as { g?: unknown } | null)?.g;
  if (!Array.isArray(g) || g.some((v) => typeof v !== "number")) {
    return err({ code: "malformed", detail: "guesses are not numbers" });
  }
  return ok({ puzzle, guesses: g as number[] });
}
function migrateState(fromVersion: number): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no migration from ${String(fromVersion)}` });
}

function mount(_host: HTMLElement, _context: MountContext<ToyState, ToyAction, ToyPuzzle>): GameView<ToyState> {
  return { update(): void {}, unmount(): void {} };
}
function help(): HelpContent {
  return { headline: "Guess the hidden digit.", steps: ["Enter a digit from 0 to 9.", "You have three tries."], example: { caption: "The digit was 7.", lines: ["Guess 3, then 7. Solved on guess 2."] } };
}

const toyV3: GameModuleV3<ToyState, ToyAction, ToyPuzzle> = {
  identity, input, manifest, archiveEnabled: true, hasWinLoss: true, stateVersion: 1,
  distribution, shareCapabilities,
  parsePuzzle, generatePuzzle, initialState, serialize, deserialize, migrateState,
  apply, inspect, difficulty, bucketOf, tierOf, telemetry, shareArtifact, mount, help,
};

export default defineGameV3(toyV3);
export const toyInternals = { makePuzzle, initialState, apply, inspect, telemetry, shareArtifact, serialize, deserialize };
export type { ToyState, ToyAction, ToyPuzzle };
