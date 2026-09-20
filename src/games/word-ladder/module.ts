/**
 * Layer 4. The WORD LADDER module, on the v3 contract from its first line.
 * WORD-LADDER.md section 28.
 *
 * The module owns the accepted graph, built once from words.ts at module load,
 * and a per goal distance map memoised so apply and progress stay cheap. rules.ts
 * is graph free and takes a distanceToGoal function, so the pure rules never
 * import the word asset and the graph lives in exactly one place.
 */

import { err, ok, type Result } from "../../core/result.js";
import { intBelow } from "../../core/rng.js";
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

import { buildGraph, distancesFrom, type WordGraph } from "./ladder.js";
import { fallbackContext, generateUnrated, FIRST_SESSION } from "./generator.js";
import { HELP } from "./help.js";
import { mountWordLadder } from "./render.js";
import {
  applyAction,
  buildState,
  currentWord,
  initialState,
  inspect as inspectState,
  makePuzzle,
  type DistanceToGoal,
  type WordLadderAction,
  type WordLadderPuzzle,
  type WordLadderState,
} from "./rules.js";
import { artifactOf, MAX_ROWS, runLogOf } from "./telemetry.js";
import { decodeLayout } from "./word-ladder-codec.js";
import { ACCEPTED_WORDS } from "./words.js";

const STATE_VERSION = 1;

/* The one runtime graph, built once. The familiar graph is offline only, so the
   module builds only the accepted graph and the fallback context from it. */
const ACCEPTED_SET: ReadonlySet<string> = new Set(ACCEPTED_WORDS);
let acceptedGraphCache: WordGraph | null = null;
function acceptedGraph(): WordGraph {
  if (acceptedGraphCache === null) acceptedGraphCache = buildGraph(ACCEPTED_WORDS);
  return acceptedGraphCache;
}

/* Memoised distance map per goal word, so a session's every progress lookup is a
   map read after the first breadth first search. */
const distanceCache = new Map<string, ReadonlyMap<string, number>>();
function distanceToGoalFor(goal: string): DistanceToGoal {
  let map = distanceCache.get(goal);
  if (map === undefined) {
    map = distancesFrom(acceptedGraph(), goal);
    distanceCache.set(goal, map);
  }
  const resolved = map;
  return (word: string): number | null => resolved.get(word) ?? null;
}

const identity: GameIdentity = {
  id: "word-ladder",
  displayName: "WORD LADDER",
  /* First Monday of the epoch year, so puzzle 1 lands in the gentlest band. */
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "128", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Change one letter at a time to climb from the start word to the goal word in as few steps as you can.",
};

const input: InputDescriptor = { kind: "custom", pointer: "tap", keys: ["Enter", "Backspace", "Escape"] };
const manifest: ManifestDescriptor = { indexUrl: "/data/word-ladder/manifest.index.json", lookaheadDays: 7 };
const distribution: DistributionSpec = {
  labels: ["Par", "Par +1", "Par +2", "Par +3 or more", "Revealed"],
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

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<WordLadderPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "entry is not an object" });
  const entry = raw as RawEntry;
  const decoded = decodeLayout(puzzleNumber, entry.layout);
  if (decoded === null) return err({ code: "malformed", detail: "layout does not decode" });
  const levers = Array.isArray(entry.levers) ? entry.levers.filter((lever): lever is string => typeof lever === "string") : [];
  /* The stored par and difficulty are never read: makePuzzle measures both from
     the graph and refuses a board that is unsolvable, out of band, or unfair.
     Familiar graph is absent at runtime, so fairness is not reproved here; the
     manifest was proved fair offline by tools/word-ladder-verify.ts. Passing the
     accepted graph as both graphs makes the fairness screen trivially pass, and
     the band check below is the runtime integrity check. */
  const made = makePuzzle(puzzleNumber, decoded.start, decoded.goal, acceptedGraph(), acceptedGraph(), ACCEPTED_SET, levers);
  return made.ok ? ok(made.value) : err({ code: "malformed", detail: made.error.detail });
}

/** Past the horizon, WORD-LADDER.md 6. Every screen but fairness and band. */
function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<WordLadderPuzzle, PuzzleFailure> {
  const rng = rngFromSeed(seed);
  const context = fallbackContext(ACCEPTED_WORDS);
  const puzzle = generateUnrated(context, puzzleNumber, { intBelow: (bound: number): number => intBelow(rng, bound) });
  return puzzle === null
    ? err({ code: "missing", detail: "no puzzle passed the screens before the attempt ceiling" })
    : ok(puzzle);
}

function firstSessionPuzzle(): WordLadderPuzzle {
  const made = makePuzzle(
    0,
    FIRST_SESSION.start,
    FIRST_SESSION.goal,
    acceptedGraph(),
    acceptedGraph(),
    ACCEPTED_SET,
    ["first-session"],
  );
  if (!made.ok) throw new Error(`the first session board is not a puzzle: ${made.error.detail}`);
  return made.value;
}

function serialize(state: WordLadderState): SerializedState {
  return {
    v: STATE_VERSION,
    data: {
      w: state.rungs.map((rung) => rung.word),
      f: state.rungs.map((rung) => rung.refusedBefore),
      r: state.revealed,
    },
  };
}

/** Rebuilt and validated against the rules, so a save no real game could reach is
 *  refused. */
function deserialize(puzzle: WordLadderPuzzle, raw: SerializedState): Result<WordLadderState, StateFailure> {
  if (raw.v !== STATE_VERSION) return err({ code: "unsupported-version", detail: `version ${String(raw.v)}` });
  const data = raw.data as { w?: unknown; f?: unknown; r?: unknown } | null;
  const words = data?.w;
  const refusals = data?.f;
  const revealed = data?.r === true;
  const isWordList = (value: unknown): value is string[] => Array.isArray(value) && value.every((w) => typeof w === "string");
  const isNumList = (value: unknown): value is number[] => Array.isArray(value) && value.every((n) => Number.isInteger(n));
  if (!isWordList(words)) return err({ code: "malformed", detail: "rungs are not a list of words" });
  if (!isNumList(refusals)) return err({ code: "malformed", detail: "refusal counts are not a list of numbers" });
  const state = buildState(puzzle, words, refusals, revealed, distanceToGoalFor(puzzle.goal));
  return state === null ? err({ code: "malformed", detail: "a stored rung could not be reached" }) : ok(state);
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no migration from version ${String(fromVersion)}` });
}

/** Threads the memoised distance function into the pure rules. Refusal friction
 *  is counted by the renderer and arrives on the accepted rung action, so apply
 *  stays a thin pure wrapper. */
function apply(state: WordLadderState, action: WordLadderAction): Result<WordLadderState, Rejection> {
  return applyAction(state, action, distanceToGoalFor(state.puzzle.goal));
}

function inspect(state: WordLadderState): OutcomeV3 {
  return inspectState(state);
}

function difficulty(puzzle: WordLadderPuzzle): number {
  return puzzle.difficulty;
}

function telemetry(state: WordLadderState): RunLog {
  return runLogOf(state);
}

function shareArtifact(
  _puzzle: WordLadderPuzzle,
  state: WordLadderState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  return artifactOf(state, run, context);
}

function mount(
  host: HTMLElement,
  context: MountContext<WordLadderState, WordLadderAction, WordLadderPuzzle>,
): GameView<WordLadderState> {
  return mountWordLadder(host, context);
}

function help(): HelpContent {
  return HELP;
}

const game: GameModuleV3<WordLadderState, WordLadderAction, WordLadderPuzzle> = {
  identity,
  input,
  manifest,
  archiveEnabled: true,
  hasWinLoss: false,
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
  currentWord,
  distanceToGoalFor,
  acceptedGraph,
  STATE_VERSION,
};
