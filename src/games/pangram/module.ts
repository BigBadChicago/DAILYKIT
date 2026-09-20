/**
 * Layer 4. The PANGRAM module, on the v3 contract from its first line.
 * PANGRAM.md section 28.
 *
 * The browser ships no dictionary (PANGRAM.md 0). A day's answers arrive in its
 * manifest entry, so parsing measures the total, the count and the pangrams from
 * those answers and refuses an entry whose stored figures disagree. That the
 * answers are exactly the dictionary's is proved offline by
 * tools/pangram-verify.ts. This file never imports the generator or the solver,
 * which is what keeps the word lists out of the page.
 */

import { err, ok, type Result } from "../../core/result.js";
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

import { HELP } from "./help.js";
import { decodeLayout, decodeWords } from "./pangram-codec.js";
import { mountPangram } from "./render.js";
import {
  applyAction,
  buildState,
  initialState,
  inspect as inspectState,
  makePuzzle,
  type PangramAction,
  type PangramPuzzle,
  type PangramState,
} from "./rules.js";
import { artifactOf, MAX_ROWS, runLogOf } from "./telemetry.js";
import { FIRST_SESSION } from "./tutorial.js";

const STATE_VERSION = 1;

const identity: GameIdentity = {
  id: "pangram",
  displayName: "PANGRAM",
  /* First Monday of the epoch year, so puzzle 1 lands in the gentlest band. */
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "208", boardFontStack: "ui-monospace, monospace" },
  oneLineRule:
    "Make words of four or more letters from seven, always using the centre letter, and find the word that uses all seven.",
};

const input: InputDescriptor = { kind: "custom", pointer: "tap", keys: ["Enter", "Backspace", "Escape"] };
const manifest: ManifestDescriptor = { indexUrl: "/data/pangram/manifest.index.json", lookaheadDays: 7 };
const distribution: DistributionSpec = {
  labels: ["Top, with pangram", "40% or more", "25% or more", "10% or more", "Under 10%"],
  distinguishedIndex: 0,
};
const shareCapabilities: ShareCapabilities = {
  grammar: "C",
  patterns: ["deterministic-output", "micro-replay-path", "emergent-fingerprint"],
  maxRows: MAX_ROWS,
};

interface RawEntry {
  readonly layout?: unknown;
  readonly words?: unknown;
  readonly best?: { readonly total?: unknown; readonly count?: unknown; readonly pangrams?: unknown };
  readonly levers?: unknown;
}

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<PangramPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "entry is not an object" });
  const entry = raw as RawEntry;
  const layout = decodeLayout(puzzleNumber, entry.layout);
  if (layout === null) return err({ code: "malformed", detail: "layout does not decode" });
  const answers = decodeWords(puzzleNumber, layout.letters, entry.words);
  if (answers === null) return err({ code: "malformed", detail: "answers do not decode" });
  const levers = Array.isArray(entry.levers) ? entry.levers.filter((lever): lever is string => typeof lever === "string") : [];
  const made = makePuzzle(puzzleNumber, layout.letters, layout.centre, answers, levers);
  if (!made.ok) return err({ code: "malformed", detail: made.error.detail });
  /* The stored figures are never used, only compared: a disagreement means the
     entry was damaged or hand edited. */
  const best = entry.best;
  if (
    best !== undefined &&
    (best.total !== made.value.total || best.count !== made.value.answers.length || best.pangrams !== made.value.pangrams)
  ) {
    return err({ code: "malformed", detail: "stored figures disagree with the answers" });
  }
  return ok(made.value);
}

/**
 * Past the horizon there is no day. A day's answers come from the dictionary,
 * which the browser deliberately does not hold (PANGRAM.md 0 and 26), so an
 * honest "unavailable" is the answer rather than a board with a wrong word list.
 * The horizon is extended offline before it lapses (BACKLOG.md).
 */
function generatePuzzle(_puzzleNumber: PuzzleNumber, _seed: Seed): Result<PangramPuzzle, PuzzleFailure> {
  return err({ code: "missing", detail: "PANGRAM days exist only inside the manifest horizon" });
}

function firstSessionPuzzle(): PangramPuzzle {
  const made = makePuzzle(0, FIRST_SESSION.letters, FIRST_SESSION.centre, FIRST_SESSION.answers, ["first-session"]);
  if (!made.ok) throw new Error(`the first session day is not a puzzle: ${made.error.detail}`);
  return made.value;
}

function serialize(state: PangramState): SerializedState {
  return {
    v: STATE_VERSION,
    data: {
      w: state.found.map((find) => find.word),
      f: state.found.map((find) => find.refusedBefore),
      d: state.finished,
    },
  };
}

/** Rebuilt through the rules, so a save no real game could reach is refused. */
function deserialize(puzzle: PangramPuzzle, raw: SerializedState): Result<PangramState, StateFailure> {
  if (raw.v !== STATE_VERSION) return err({ code: "unsupported-version", detail: `version ${String(raw.v)}` });
  const data = raw.data as { w?: unknown; f?: unknown; d?: unknown } | null;
  const words = data?.w;
  const refusals = data?.f;
  const isWordList = (value: unknown): value is string[] => Array.isArray(value) && value.every((w) => typeof w === "string");
  const isNumList = (value: unknown): value is number[] => Array.isArray(value) && value.every((n) => Number.isInteger(n));
  if (!isWordList(words)) return err({ code: "malformed", detail: "finds are not a list of words" });
  if (!isNumList(refusals)) return err({ code: "malformed", detail: "refusal counts are not a list of numbers" });
  const state = buildState(puzzle, words, refusals, data?.d === true);
  return state === null ? err({ code: "puzzle-mismatch", detail: "a stored find is not one of this day's answers" }) : ok(state);
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no migration from version ${String(fromVersion)}` });
}

function apply(state: PangramState, action: PangramAction): Result<PangramState, Rejection> {
  return applyAction(state, action);
}

function inspect(state: PangramState): OutcomeV3 {
  return inspectState(state);
}

/** The total available score, measured from the day's answers at parse. */
function difficulty(puzzle: PangramPuzzle): number {
  return puzzle.difficulty;
}

function telemetry(state: PangramState): RunLog {
  return runLogOf(state);
}

function shareArtifact(_puzzle: PangramPuzzle, state: PangramState, run: RunLog, context: ShareContext): ArtifactModel {
  return artifactOf(state, run, context);
}

function mount(host: HTMLElement, context: MountContext<PangramState, PangramAction, PangramPuzzle>): GameView<PangramState> {
  return mountPangram(host, context);
}

function help(): HelpContent {
  return HELP;
}

const game: GameModuleV3<PangramState, PangramAction, PangramPuzzle> = {
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
  STATE_VERSION,
};
