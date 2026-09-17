/**
 * Layer 4. The ROTATE LOCK module, on the v3 contract from its first line.
 * ROTATE-LOCK.md section 19. Scaffolded by npm run new-game from the planned
 * registry row, template decision 10, and then replaced piece by piece.
 */

import { intBelow } from "../../core/rng.js";
import { err, ok, type Result } from "../../core/result.js";
import { rngFromSeed } from "../../core/seed.js";
import type {
  DistributionSpec,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareContext,
} from "../../core/types.js";
import { defineGameV3, type GameModuleV3 } from "../../contract/v3/game-module.js";
import type { ShareCapabilities } from "../../contract/v3/types.js";
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
import type { ArtifactModel, RunLog } from "../../engine/telemetry.js";

import { firstSessionPuzzle, generateUnrated } from "./generator.js";
import { HELP } from "./help.js";
import { decodeLayout } from "./layout-codec.js";
import { mountRotateLock } from "./render.js";
import {
  applyAction,
  decodeMoves,
  encodeMoves,
  initialState,
  inspect as inspectState,
  makePuzzle,
  replay,
  type RotateLockAction,
  type RotateLockPuzzle,
  type RotateLockState,
} from "./rules.js";
import { MAX_ROWS, artifactOf, runLogOf } from "./telemetry.js";

const STATE_VERSION = 1;

const identity: GameIdentity = {
  id: "rotate-lock",
  displayName: "ROTATE LOCK",
  /* First Monday of the epoch year, so puzzle 1 lands in the gentlest band. */
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "308", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Order and rotate the route pieces so the path takes every marked turn and ends at the lock.",
};

export const KEYS: readonly string[] = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Enter",
  " ",
  "Escape",
  "r",
  "R",
];

const input: InputDescriptor = { kind: "custom", pointer: "tap", keys: KEYS };
const manifest: ManifestDescriptor = { indexUrl: "/data/rotate-lock/manifest.index.json", lookaheadDays: 7 };
const distribution: DistributionSpec = {
  labels: ["At par", "1 to 4 over", "5 to 10 over", "11 or more over", "Jammed"],
  distinguishedIndex: 0,
};
const shareCapabilities: ShareCapabilities = {
  grammar: "B",
  patterns: ["micro-replay-path", "comparative-friction", "emergent-fingerprint"],
  maxRows: MAX_ROWS,
};

interface RawEntry {
  readonly layout?: unknown;
  readonly levers?: unknown;
}

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<RotateLockPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "entry is not an object" });
  const entry = raw as RawEntry;
  const decoded = decodeLayout(puzzleNumber, entry.layout);
  if (decoded === null) return err({ code: "malformed", detail: "layout does not decode" });
  const levers = Array.isArray(entry.levers) ? entry.levers.filter((lever): lever is string => typeof lever === "string") : [];
  /* The stored par and difficulty are never read: makePuzzle measures both, and
     refuses a layout that does not have exactly one route. */
  const made = makePuzzle(puzzleNumber, decoded.layout, decoded.start, levers);
  return made.ok ? ok(made.value) : err({ code: "malformed", detail: made.error.detail });
}

/** Past the horizon, ROTATE-LOCK.md 18. Every screen but the band. */
function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<RotateLockPuzzle, PuzzleFailure> {
  const rng = rngFromSeed(seed);
  const puzzle = generateUnrated(puzzleNumber, { intBelow: (bound: number): number => intBelow(rng, bound) });
  return puzzle === null
    ? err({ code: "missing", detail: "no puzzle passed the screens before the attempt ceiling" })
    : ok(puzzle);
}

function serialize(state: RotateLockState): SerializedState {
  return { v: STATE_VERSION, data: { m: encodeMoves(state.moves) } };
}

/** Replayed through the rules, so a save no real game could reach is refused. */
function deserialize(puzzle: RotateLockPuzzle, raw: SerializedState): Result<RotateLockState, StateFailure> {
  if (raw.v !== STATE_VERSION) return err({ code: "unsupported-version", detail: `version ${String(raw.v)}` });
  const text = (raw.data as { m?: unknown } | null)?.m;
  if (typeof text !== "string") return err({ code: "malformed", detail: "moves are not a string" });
  const actions = decodeMoves(text);
  if (actions === null) return err({ code: "malformed", detail: "moves do not decode" });
  const state = replay(puzzle, actions);
  return state === null ? err({ code: "malformed", detail: "a stored move was refused on replay" }) : ok(state);
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no migration from version ${String(fromVersion)}` });
}

function apply(state: RotateLockState, action: RotateLockAction): Result<RotateLockState, Rejection> {
  return applyAction(state, action);
}

function inspect(state: RotateLockState): OutcomeV3 {
  return inspectState(state);
}

/** Recomputed when the puzzle is made, from the layout, never from the manifest. */
function difficulty(puzzle: RotateLockPuzzle): number {
  return puzzle.difficulty;
}

function telemetry(state: RotateLockState): RunLog {
  return runLogOf(state);
}

/** Reads the run log and the finished state's tier and move count, never the
 *  layout, which is what the answer property probe asserts. */
function shareArtifact(_puzzle: RotateLockPuzzle, state: RotateLockState, run: RunLog, context: ShareContext): ArtifactModel {
  return artifactOf(state, run, context);
}

function mount(host: HTMLElement, context: MountContext<RotateLockState, RotateLockAction, RotateLockPuzzle>): GameView<RotateLockState> {
  return mountRotateLock(host, context);
}

function help(): HelpContent {
  return HELP;
}

const game: GameModuleV3<RotateLockState, RotateLockAction, RotateLockPuzzle> = {
  identity,
  input,
  manifest,
  archiveEnabled: true,
  hasWinLoss: true,
  stateVersion: STATE_VERSION,
  distribution,
  shareCapabilities,
  parsePuzzle,
  generatePuzzle,
  firstSessionPuzzle,
  initialState,
  serialize,
  deserialize,
  migrateState,
  apply,
  inspect,
  difficulty,
  telemetry,
  shareArtifact,
  mount,
  help,
};

export default defineGameV3(game);

/** Typed access for this game's tests. Nothing in the shell reads these. */
export const internals = {
  identity,
  input,
  distribution,
  shareCapabilities,
  parsePuzzle,
  generatePuzzle,
  serialize,
  deserialize,
  migrateState,
  inspect,
  difficulty,
  telemetry,
  shareArtifact,
  STATE_VERSION,
};
