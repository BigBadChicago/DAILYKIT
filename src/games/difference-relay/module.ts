/**
 * Layer 4. The DIFFERENCE RELAY module, on the v3 contract from its first line.
 * DIFFERENCE-RELAY.md section 19. Scaffolded by npm run new-game from the planned
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
import { decodeLayout } from "./relay-codec.js";
import { isPermutationOf } from "./relay.js";
import { mountDifferenceRelay } from "./render.js";
import {
  applyAction,
  buildState,
  initialState,
  inspect as inspectState,
  makePuzzle,
  type DifferenceRelayAction,
  type DifferenceRelayPuzzle,
  type DifferenceRelayState,
} from "./rules.js";
import { MAX_ROWS, artifactOf, runLogOf } from "./telemetry.js";

const STATE_VERSION = 1;

const identity: GameIdentity = {
  id: "difference-relay",
  displayName: "DIFFERENCE RELAY",
  /* First Monday of the epoch year, so puzzle 1 lands in the gentlest band. */
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "68", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Order the numbers so every neighbouring pair differs by the amount marked between them.",
};

export const KEYS: readonly string[] = ["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " ", "Escape", "r", "R"];

const input: InputDescriptor = { kind: "custom", pointer: "tap", keys: KEYS };
const manifest: ManifestDescriptor = { indexUrl: "/data/difference-relay/manifest.index.json", lookaheadDays: 7 };
const distribution: DistributionSpec = {
  labels: ["Solved in 1", "Solved in 2", "Solved in 3", "Solved in 4", "Solved in 5", "Solved in 6", "Failed"],
  distinguishedIndex: 0,
};
const shareCapabilities: ShareCapabilities = {
  grammar: "A",
  patterns: ["micro-replay-path", "comparative-friction", "emergent-fingerprint"],
  maxRows: MAX_ROWS,
};

interface RawEntry {
  readonly layout?: unknown;
  readonly levers?: unknown;
}

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<DifferenceRelayPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "entry is not an object" });
  const entry = raw as RawEntry;
  const decoded = decodeLayout(puzzleNumber, entry.layout);
  if (decoded === null) return err({ code: "malformed", detail: "layout does not decode" });
  const levers = Array.isArray(entry.levers) ? entry.levers.filter((lever): lever is string => typeof lever === "string") : [];
  /* The stored par and difficulty are never read: makePuzzle measures both and
     refuses a board that is not unique, not fair, or already pinned. */
  const made = makePuzzle(puzzleNumber, decoded.target, decoded.marks, decoded.startOrder, levers);
  return made.ok ? ok(made.value) : err({ code: "malformed", detail: made.error.detail });
}

/** Past the horizon, DIFFERENCE-RELAY.md 18. Every screen but the band. */
function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<DifferenceRelayPuzzle, PuzzleFailure> {
  const rng = rngFromSeed(seed);
  const puzzle = generateUnrated(puzzleNumber, { intBelow: (bound: number): number => intBelow(rng, bound) });
  return puzzle === null
    ? err({ code: "missing", detail: "no puzzle passed the screens before the attempt ceiling" })
    : ok(puzzle);
}

function serialize(state: DifferenceRelayState): SerializedState {
  return { v: STATE_VERSION, data: { o: state.order.slice(), r: state.runs.map((run) => run.order.slice()) } };
}

/** Rebuilt and validated against the rules, so a save no real game could reach
 *  is refused. */
function deserialize(puzzle: DifferenceRelayPuzzle, raw: SerializedState): Result<DifferenceRelayState, StateFailure> {
  if (raw.v !== STATE_VERSION) return err({ code: "unsupported-version", detail: `version ${String(raw.v)}` });
  const data = raw.data as { o?: unknown; r?: unknown } | null;
  const order = data?.o;
  const runOrders = data?.r;
  const isOrder = (value: unknown): value is number[] => Array.isArray(value) && value.every((n) => Number.isInteger(n));
  if (!isOrder(order)) return err({ code: "malformed", detail: "current order is not a list of numbers" });
  if (!Array.isArray(runOrders) || !runOrders.every(isOrder)) {
    return err({ code: "malformed", detail: "runs are not lists of numbers" });
  }
  if (!isPermutationOf(order, puzzle.numbers)) return err({ code: "puzzle-mismatch", detail: "order is not this puzzle's numbers" });
  const state = buildState(puzzle, order, runOrders as number[][]);
  return state === null ? err({ code: "malformed", detail: "a stored run could not be reached" }) : ok(state);
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no migration from version ${String(fromVersion)}` });
}

function apply(state: DifferenceRelayState, action: DifferenceRelayAction): Result<DifferenceRelayState, Rejection> {
  return applyAction(state, action);
}

function inspect(state: DifferenceRelayState): OutcomeV3 {
  return inspectState(state);
}

/** Recomputed when the puzzle is made, from the board, never from the manifest. */
function difficulty(puzzle: DifferenceRelayPuzzle): number {
  return puzzle.difficulty;
}

function telemetry(state: DifferenceRelayState): RunLog {
  return runLogOf(state);
}

/** Reads the run log and the finished state's tier and run count, never the
 *  target or the marks, which the answer property probe asserts. */
function shareArtifact(
  _puzzle: DifferenceRelayPuzzle,
  state: DifferenceRelayState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  return artifactOf(state, run, context);
}

function mount(
  host: HTMLElement,
  context: MountContext<DifferenceRelayState, DifferenceRelayAction, DifferenceRelayPuzzle>,
): GameView<DifferenceRelayState> {
  return mountDifferenceRelay(host, context);
}

function help(): HelpContent {
  return HELP;
}

const game: GameModuleV3<DifferenceRelayState, DifferenceRelayAction, DifferenceRelayPuzzle> = {
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
