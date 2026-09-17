/**
 * Layer 4. The CIPHER GameModule.
 *
 * The module is written against the v3 contract only. v3 migration phase 6
 * deleted the v2 contract, and with it this module's `bucketOf`, `shareBlock`
 * and v2 default export; the default export is now the v3 module the shell
 * mounts. ARCHITECTURE2 section 56.
 *
 * Deliberately imports the generator and never the solver: the solver's
 * precomputed table is 1.7 megabytes and belongs to Node. The difficulty
 * measure the solver used to own now lives in difficulty.ts, which is table
 * free, so the module measures its own difficulty rather than reading the
 * manifest's copy of it.
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
import { LEVERS, generatePuzzle as makePuzzle, type CipherLever, type CipherPuzzle } from "./generator.js";
import { difficultyOf } from "./difficulty.js";
import { decodeCode } from "./manifest-codec.js";
import { CIPHER_HELP } from "./help.js";
import { mountCipher } from "./render.js";
import {
  CODE_LENGTH,
  MAX_GUESSES,
  applyCipherAction,
  bucketFor,
  initialCipherState,
  isCode,
  isSymbol,
  isTerminal,
  scoreGuess,
  type CipherAction,
  type CipherState,
  type Code,
} from "./rules.js";
import {
  SHARE_ROW_WIDTH,
  cipherArtifact,
  cipherRunLog,
  finishedOutcomeFor,
} from "./telemetry.js";

/** No state change was needed for v3: the guess history already carried the
 *  run, and deserialize rebuilds all of it. ARCHITECTURE2 section 56 phase 3. */
const STATE_VERSION = 1;

function encodeCodeString(code: Code): string {
  return code.join("");
}

function decodeCodeString(value: unknown): Code | null {
  if (typeof value !== "string" || value.length !== CODE_LENGTH) return null;
  const code = [...value].map((character) => Number(character));
  return isCode(code) ? code : null;
}

function encodeDraft(draft: readonly (number | null)[]): string {
  return draft.map((symbol) => (symbol === null ? "." : String(symbol))).join("");
}

function decodeDraft(value: unknown): readonly (number | null)[] | null {
  if (typeof value !== "string" || value.length !== CODE_LENGTH) return null;
  const draft = [...value].map((character) => (character === "." ? null : Number(character)));
  return draft.every((symbol) => symbol === null || isSymbol(symbol)) ? draft : null;
}

function validBest(value: unknown): value is CipherPuzzle["best"] {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return false;
  const best = value as { remaining?: unknown; line?: unknown };
  return Number.isInteger(best.remaining) && Number.isInteger(best.line);
}

const identity: GameIdentity = {
  id: "cipher",
  displayName: "CIPHER",
  /* The first Monday of the epoch year, so puzzle 1 lands in the gentlest
     weekday band. Four days after POKER GRID's, which the contract's per game
     epoch has always allowed. */
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "268", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Break a four symbol code in six guesses from exact and misplaced counts.",
};

const input: InputDescriptor = {
  kind: "custom",
  pointer: "tap",
  keys: ["1", "2", "3", "4", "5", "6", "Backspace", "Enter", "ArrowLeft", "ArrowRight"],
};

/* A year of CIPHER is 36 kilobytes and wants one file, so the index carries a
   single pointer covering the whole horizon. */
const manifest: ManifestDescriptor = {
  indexUrl: "/data/cipher/manifest.index.json",
  lookaheadDays: 7,
};

/**
 * Section 13. Two patterns, both computed from the player's own guesses: the
 * ladder replays the run without naming a symbol or a slot, and the friction is
 * what the run cost in rework.
 */
const shareCapabilities: ShareCapabilities = {
  grammar: "A",
  patterns: ["emergent-fingerprint", "comparative-friction"],
  maxRows: MAX_GUESSES,
};

const distribution: DistributionSpec = {
  labels: ["1 guess", "2 guesses", "3 guesses", "4 guesses", "5 guesses", "6 guesses", "Not solved"],
  distinguishedIndex: 0,
};

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<CipherPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "puzzle must be an object" });
  const value = raw as { code?: unknown; best?: unknown; levers?: unknown };
  const code = decodeCode(puzzleNumber, value.code);
  if (code === null) return err({ code: "malformed", detail: "code does not decode to four symbols" });
  if (!validBest(value.best)) return err({ code: "malformed", detail: "best is invalid" });
  const levers = value.levers === undefined ? [] : value.levers;
  if (!Array.isArray(levers) || !levers.every((lever) => (LEVERS as readonly string[]).includes(lever as string))) {
    return err({ code: "malformed", detail: "levers are invalid" });
  }
  return ok({
    number: puzzleNumber,
    code,
    levers: levers as readonly CipherLever[],
    best: (value.best ?? null) as CipherPuzzle["best"],
  });
}

function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<CipherPuzzle, PuzzleFailure> {
  return ok(makePuzzle(puzzleNumber, seed));
}

function initialState(puzzle: CipherPuzzle): CipherState {
  return initialCipherState(puzzle.code);
}

/* The code is stripped here and restored from the puzzle on the way back, so
   the answer never reaches localStorage. Feedback is not stored either: it is
   recomputed, which makes a stored pair that disagrees with the code impossible
   rather than undetectable. */
function serialize(state: CipherState): SerializedState {
  return {
    v: STATE_VERSION,
    data: { d: encodeDraft(state.draft), g: state.guesses.map((record) => encodeCodeString(record.code)) },
  };
}

function deserialize(puzzle: CipherPuzzle, raw: SerializedState): Result<CipherState, StateFailure> {
  if (raw.v !== STATE_VERSION || typeof raw.data !== "object" || raw.data === null) {
    return err({ code: "unsupported-version", detail: `v${String(raw.v)}` });
  }
  const data = raw.data as { d?: unknown; g?: unknown };
  const draft = decodeDraft(data.d);
  if (draft === null || !Array.isArray(data.g) || data.g.length > MAX_GUESSES) {
    return err({ code: "malformed", detail: "invalid cipher state" });
  }
  const guesses = [];
  const seen = new Set<string>();
  for (const rawGuess of data.g) {
    const code = decodeCodeString(rawGuess);
    if (code === null || seen.has(encodeCodeString(code))) {
      return err({ code: "malformed", detail: "guess is invalid or repeated" });
    }
    seen.add(encodeCodeString(code));
    guesses.push({ code, feedback: scoreGuess(puzzle.code, code) });
  }
  const solved = guesses.some((record) => record.feedback.exact === CODE_LENGTH);
  /* No puzzle-mismatch check exists, and none can: every four symbol guess is
     legal against every code, so a save from yesterday deserializes cleanly
     against today's puzzle. The engine knows which puzzle it handed us and
     does not say. Defect 6 of the Phase 11 report. */
  return ok({ code: puzzle.code, draft, guesses, solved });
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no path from v${String(fromVersion)}` });
}

function apply(state: CipherState, action: CipherAction): Result<CipherState, Rejection> {
  return applyCipherAction(state, action);
}

function inspect(state: CipherState): OutcomeV3 {
  if (!isTerminal(state)) return { kind: "ongoing" };
  return finishedOutcomeFor(state);
}

/** v3. Recomputed from the code, never read from `puzzle.best.remaining`.
 *  See difficulty.remainingAfterOpening. */
function difficulty(puzzle: CipherPuzzle): number {
  return difficultyOf(puzzle.code);
}

/** v3. The compact local run log, section 13. */
function telemetry(state: CipherState): RunLog {
  return cipherRunLog(state);
}

/** v3. The pure mapper. It reads the run log and the state's own history, never
 *  a guessed code, which is what the leak probes in telemetry.ts assert. */
function shareArtifact(
  _puzzle: CipherPuzzle,
  state: CipherState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  return cipherArtifact(state, run, context);
}

function mount(
  host: HTMLElement,
  context: MountContext<CipherState, CipherAction, CipherPuzzle>,
): GameView<CipherState> {
  return mountCipher(host, context, { reducedMotion: context.reducedMotion });
}

function help(): HelpContent {
  return CIPHER_HELP;
}

const cipher: GameModuleV3<CipherState, CipherAction, CipherPuzzle> = {
  identity,
  input,
  manifest,
  archiveEnabled: true,
  /* The first true in the project. CIPHER has a real failure state, so the win
     rate row of requirement 3.4 renders for the first time. */
  hasWinLoss: true,
  stateVersion: STATE_VERSION,
  distribution,
  shareCapabilities,
  parsePuzzle,
  generatePuzzle,
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

export default defineGameV3(cipher);

/** Exported for the module tests only. Nothing in the shell reads these. */
export const internals = {
  identity,
  input,
  distribution,
  shareCapabilities,
  parsePuzzle,
  serialize,
  deserialize,
  migrateState,
  difficulty,
  telemetry,
  shareArtifact,
  SHARE_ROW_WIDTH,
  STATE_VERSION,
};

export type { CipherAction, CipherPuzzle, CipherState, Rejection };
