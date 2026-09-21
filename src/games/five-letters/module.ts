/**
 * Layer 4. The FIVE LETTERS module, on the v3 contract from its first line.
 * FIVE-LETTERS.md section 28.
 *
 * The accepted list ships in the page (FIVE-LETTERS.md 0), because a guess is any
 * five letter word on any day. A day's answer arrives obfuscated in its manifest
 * entry; parsing recomputes its difficulty from the shipped list and refuses an
 * entry whose stored figure disagrees. The witness claim is proved offline by
 * tools/five-letters-verify.ts. This file never imports the generator or the
 * solver, which is what keeps the search out of the page.
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

import { candidatesAfterOpening } from "./difficulty.js";
import { decodeAnswer } from "./five-letters-codec.js";
import { HELP } from "./help.js";
import { mountFiveLetters } from "./render.js";
import {
  applyAction,
  buildState,
  initialState,
  inspect as inspectState,
  makePuzzle,
  type FiveLettersAction,
  type FiveLettersPuzzle,
  type FiveLettersState,
} from "./rules.js";
import { artifactOf, MAX_ROWS, runLogOf } from "./telemetry.js";
import { FIRST_SESSION } from "./tutorial.js";
import { ACCEPTED_WORDS } from "./words.js";

const STATE_VERSION = 1;

/** Built once per page; every puzzle shares it. */
const ACCEPTED: ReadonlySet<string> = new Set(ACCEPTED_WORDS);

const identity: GameIdentity = {
  id: "five-letters",
  displayName: "FIVE LETTERS",
  /* First Monday of the epoch year, so puzzle 1 lands in the gentlest band. */
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "288", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Find the five letter word in six guesses, each letter marked right, present or absent.",
};

const input: InputDescriptor = { kind: "custom", pointer: "tap", keys: ["Enter", "Backspace"] };
const manifest: ManifestDescriptor = { indexUrl: "/data/five-letters/manifest.index.json", lookaheadDays: 7 };
const distribution: DistributionSpec = {
  labels: ["1 guess", "2 guesses", "3 guesses", "4 guesses", "5 guesses", "6 guesses", "Not solved"],
  distinguishedIndex: 0,
};
/** Section 13. Both computed from the player's own guesses on the device. */
const shareCapabilities: ShareCapabilities = {
  grammar: "A",
  patterns: ["emergent-fingerprint", "comparative-friction"],
  maxRows: MAX_ROWS,
};

interface RawEntry {
  readonly answer?: unknown;
  readonly best?: { readonly candidates?: unknown };
  readonly levers?: unknown;
}

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<FiveLettersPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "entry is not an object" });
  const entry = raw as RawEntry;
  const answer = decodeAnswer(puzzleNumber, entry.answer);
  if (answer === null) return err({ code: "malformed", detail: "answer does not decode" });
  if (!ACCEPTED.has(answer)) return err({ code: "malformed", detail: "answer is not an accepted word" });
  const levers = Array.isArray(entry.levers) ? entry.levers.filter((lever): lever is string => typeof lever === "string") : [];
  const difficulty = candidatesAfterOpening(answer, ACCEPTED_WORDS);
  /* Stored figures are compared, never used: a disagreement means a damaged or
     hand edited entry. */
  const stored = entry.best?.candidates;
  if (stored !== undefined && stored !== difficulty) {
    return err({ code: "malformed", detail: "stored difficulty disagrees with the answer" });
  }
  const made = makePuzzle(puzzleNumber, answer, ACCEPTED, difficulty, levers);
  return made.ok ? ok(made.value) : err({ code: "malformed", detail: made.error.detail });
}

/**
 * Past the horizon there is no day. The answer pool is a build time list the
 * page does not hold (FIVE-LETTERS.md 26), so an honest "unavailable" is the
 * answer. The horizon is extended offline before it lapses (BACKLOG.md).
 */
function generatePuzzle(_puzzleNumber: PuzzleNumber, _seed: Seed): Result<FiveLettersPuzzle, PuzzleFailure> {
  return err({ code: "missing", detail: "FIVE LETTERS days exist only inside the manifest horizon" });
}

function firstSessionPuzzle(): FiveLettersPuzzle {
  const answer = FIRST_SESSION.answer;
  const made = makePuzzle(0, answer, ACCEPTED, candidatesAfterOpening(answer, ACCEPTED_WORDS), ["first-session"]);
  if (!made.ok) throw new Error(`the first session day is not a puzzle: ${made.error.detail}`);
  return made.value;
}

function serialize(state: FiveLettersState): SerializedState {
  return {
    v: STATE_VERSION,
    data: { w: state.guesses.map((guess) => guess.word), f: state.guesses.map((guess) => guess.refusedBefore) },
  };
}

/** Rebuilt through the rules, so a save no real game could reach is refused. */
function deserialize(puzzle: FiveLettersPuzzle, raw: SerializedState): Result<FiveLettersState, StateFailure> {
  if (raw.v !== STATE_VERSION) return err({ code: "unsupported-version", detail: `version ${String(raw.v)}` });
  const data = raw.data as { w?: unknown; f?: unknown } | null;
  const words = data?.w;
  const refusals = data?.f;
  if (!Array.isArray(words) || !words.every((w) => typeof w === "string")) {
    return err({ code: "malformed", detail: "guesses are not a list of words" });
  }
  if (!Array.isArray(refusals) || !refusals.every((n) => Number.isInteger(n))) {
    return err({ code: "malformed", detail: "refusal counts are not a list of numbers" });
  }
  const state = buildState(puzzle, words as string[], refusals as number[]);
  return state === null ? err({ code: "puzzle-mismatch", detail: "a stored guess is not legal on this day" }) : ok(state);
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no migration from version ${String(fromVersion)}` });
}

function apply(state: FiveLettersState, action: FiveLettersAction): Result<FiveLettersState, Rejection> {
  return applyAction(state, action);
}

function inspect(state: FiveLettersState): OutcomeV3 {
  return inspectState(state);
}

/** Candidates left after the opening, measured from the answer at parse. */
function difficulty(puzzle: FiveLettersPuzzle): number {
  return puzzle.difficulty;
}

function telemetry(state: FiveLettersState): RunLog {
  return runLogOf(state);
}

function shareArtifact(_puzzle: FiveLettersPuzzle, state: FiveLettersState, run: RunLog, context: ShareContext): ArtifactModel {
  return artifactOf(state, run, context);
}

function mount(
  host: HTMLElement,
  context: MountContext<FiveLettersState, FiveLettersAction, FiveLettersPuzzle>,
): GameView<FiveLettersState> {
  return mountFiveLetters(host, context);
}

function help(): HelpContent {
  return HELP;
}

const game: GameModuleV3<FiveLettersState, FiveLettersAction, FiveLettersPuzzle> = {
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
  ACCEPTED,
};
