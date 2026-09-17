/**
 * Layer 4. The VECTOR GameModule.
 * VECTOR.md sections 1, 6, 11, 12 and 17.
 *
 * The module is written against the v3 contract only. v3 migration phase 6
 * deleted the v2 contract, and with it this module's `bucketOf`, `shareBlock`
 * and v2 default export; the default export is now the v3 module the shell
 * mounts. ARCHITECTURE2 section 56.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  DistributionSpec,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareContext,
} from "../../core/types.js";
import { rngFromSeed } from "../../core/seed.js";
import { intBelow } from "../../core/rng.js";
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
import { decodeSymbols } from "../../engine/manifest-codec.js";
import type { ArtifactModel, RunLog } from "../../engine/telemetry.js";
import {
  MAX_SUBMISSIONS,
  apply,
  bucketFor,
  difficultyFor,
  initialState,
  inspect,
  isSatisfied,
  makePuzzle,
  type Effort,
  type VectorAction,
  type VectorBest,
  type VectorPuzzle,
  type VectorState,
} from "./rules.js";
import {
  SHARE_ROW_WIDTH,
  vectorArtifact,
  vectorRunLog,
} from "./telemetry.js";
import {
  CELLS,
  candidateList,
  isCandidate,
  type Direction,
} from "./propagate.js";
import { firstSessionBoard, generateUnrated } from "./generator.js";
import { helpContent } from "./help.js";
import { mountVector } from "./render.js";

/** Index 0 is a blank cell, index v + 1 is a clue of value v. Must match
 *  LAYOUT_RADIX in tools/vector-generate.ts. */
const LAYOUT_RADIX = 32;
/** Version 2 adds the per submission effort record of VECTOR.md 17.1. */
const STATE_VERSION = 2;

const identity: GameIdentity = {
  id: "vector",
  displayName: "VECTOR",
  epoch: { year: 2026, month: 1, day: 5 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "28", boardFontStack: "ui-monospace, 'SF Mono', Menlo, monospace" },
  oneLineRule:
    "Point every arrow so each numbered cell is the first one that exactly that many arrows reach.",
};

const input: InputDescriptor = { kind: "grid", cols: 6, rows: 6, pointer: "tap" };

const manifest: ManifestDescriptor = {
  indexUrl: "/data/vector/manifest.index.json",
  lookaheadDays: 7,
};

/** Section 13. Two patterns, both computed from the player's own actions: the
 *  fingerprint is the shape of the run and the friction is what it cost. */
const shareCapabilities: ShareCapabilities = {
  grammar: "A",
  patterns: ["emergent-fingerprint", "comparative-friction"],
  maxRows: MAX_SUBMISSIONS,
};

const distribution: DistributionSpec = {
  labels: ["1 submission", "2 submissions", "3 submissions", "Not solved"],
  distinguishedIndex: 0,
};

interface RawEntry {
  readonly layout: unknown;
  readonly best?: { readonly difficulty?: unknown; readonly opening?: unknown };
  readonly levers?: unknown;
}

interface RawState {
  readonly a?: unknown;
  readonly n?: unknown;
  readonly s?: unknown;
  readonly e?: unknown;
  readonly p?: unknown;
}

function parsePuzzle(
  puzzleNumber: PuzzleNumber,
  raw: unknown,
): Result<VectorPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) {
    return err({ code: "malformed", detail: "entry is not an object" });
  }
  const entry = raw as RawEntry;
  const symbols = decodeSymbols(puzzleNumber, entry.layout, LAYOUT_RADIX, CELLS);
  if (symbols === null) {
    return err({ code: "malformed", detail: "layout does not decode" });
  }

  const clues: (number | null)[] = symbols.map((symbol) => (symbol === 0 ? null : symbol - 1));
  let blanks = 0;
  let total = 0;
  for (const clue of clues) {
    if (clue === null) blanks += 1;
    else total += clue;
  }
  // The closed system, checked on data rather than assumed. VECTOR.md 3.1.
  if (total !== blanks) {
    return err({ code: "malformed", detail: "clue values do not sum to the blank count" });
  }

  const best: VectorBest | null =
    typeof entry.best?.difficulty === "number" && typeof entry.best.opening === "number"
      ? { difficulty: entry.best.difficulty, opening: entry.best.opening }
      : null;
  const levers = Array.isArray(entry.levers)
    ? entry.levers.filter((lever): lever is string => typeof lever === "string")
    : [];

  const puzzle = makePuzzle(puzzleNumber, clues, best, levers);
  for (const cell of puzzle.geometry.blankCells) {
    if (puzzle.geometry.candidates[cell] === 0) {
      return err({ code: "malformed", detail: `cell ${String(cell)} has no candidate direction` });
    }
  }
  return ok(puzzle);
}

/**
 * Past the horizon. The whole pipeline runs here, propagation included, because
 * it is 36 cells and three rules with no table. A board generated on a phone
 * carries the same solvability and uniqueness proof as one from the manifest.
 * VECTOR.md 9.4.
 */
function generatePuzzle(
  puzzleNumber: PuzzleNumber,
  seed: Seed,
): Result<VectorPuzzle, PuzzleFailure> {
  const rng = rngFromSeed(seed);
  const board = generateUnrated({ intBelow: (bound: number): number => intBelow(rng, bound) });
  if (board === null) {
    return err({ code: "missing", detail: "no board passed the screens before the attempt ceiling" });
  }
  return ok(makePuzzle(puzzleNumber, board.clues, null, board.levers));
}

function firstSessionPuzzle(): VectorPuzzle {
  const board = firstSessionBoard();
  return makePuzzle(0, board.clues, null, board.levers);
}

const ARROW_CHARS = "0123";

function serialize(state: VectorState): SerializedState {
  let arrows = "";
  for (let cell = 0; cell < CELLS; cell += 1) {
    const dir = state.arrows[cell] ?? null;
    arrows += dir === null ? "." : (ARROW_CHARS[dir] as string);
  }
  return {
    v: STATE_VERSION,
    data: {
      a: arrows,
      n: state.submissions,
      s: state.solved,
      e: state.effort.map((effort) => [effort.cycles, effort.changes]),
      p: [state.pending.cycles, state.pending.changes],
    },
  };
}

function readPair(raw: unknown): Effort | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const cycles: unknown = raw[0];
  const changes: unknown = raw[1];
  if (typeof cycles !== "number" || !Number.isInteger(cycles) || cycles < 0) return null;
  if (typeof changes !== "number" || !Number.isInteger(changes) || changes < 0) return null;
  // A correction is one of the actions counted, never an extra one.
  if (changes > cycles) return null;
  return { cycles, changes };
}

function readEffort(raw: unknown, submissions: number): readonly Effort[] | null {
  if (!Array.isArray(raw) || raw.length !== submissions) return null;
  const out: Effort[] = [];
  for (const item of raw) {
    const pair = readPair(item);
    if (pair === null) return null;
    out.push(pair);
  }
  return out;
}

function deserialize(
  puzzle: VectorPuzzle,
  raw: SerializedState,
): Result<VectorState, StateFailure> {
  if (raw.v !== STATE_VERSION) {
    return err({ code: "unsupported-version", detail: `payload version ${String(raw.v)}` });
  }
  if (typeof raw.data !== "object" || raw.data === null) {
    return err({ code: "malformed", detail: "payload is not an object" });
  }
  const data = raw.data as RawState;
  if (typeof data.a !== "string" || data.a.length !== CELLS) {
    return err({ code: "malformed", detail: "arrow string is the wrong shape" });
  }
  if (typeof data.n !== "number" || !Number.isInteger(data.n) || data.n < 0 || data.n > MAX_SUBMISSIONS) {
    return err({ code: "malformed", detail: "submission count out of range" });
  }
  if (typeof data.s !== "boolean") {
    return err({ code: "malformed", detail: "solved flag is not a boolean" });
  }

  const arrows: (Direction | null)[] = new Array<Direction | null>(CELLS).fill(null);
  for (let cell = 0; cell < CELLS; cell += 1) {
    const char = data.a[cell] as string;
    const isClue = puzzle.clues[cell] !== null;
    if (char === ".") {
      if (isClue) continue;
      continue;
    }
    if (isClue) {
      return err({ code: "puzzle-mismatch", detail: `an arrow sits on the clue at ${String(cell)}` });
    }
    const dir = ARROW_CHARS.indexOf(char);
    if (dir < 0) return err({ code: "malformed", detail: `bad arrow character at ${String(cell)}` });
    // Defence in depth against a stale save, not a reliable mismatch detector.
    // Contract decision 14: the engine owns puzzle identity.
    if (!isCandidate(puzzle.geometry, cell, dir as Direction)) {
      return err({ code: "puzzle-mismatch", detail: `arrow at ${String(cell)} reaches no number` });
    }
    arrows[cell] = dir as Direction;
  }

  const effort = readEffort(data.e, data.n);
  if (effort === null) {
    return err({ code: "malformed", detail: "effort record does not match the submission count" });
  }
  const pending = readPair(data.p);
  if (pending === null) {
    return err({ code: "malformed", detail: "pending effort is the wrong shape" });
  }

  const state: VectorState = {
    puzzle,
    arrows,
    submissions: data.n,
    solved: data.s,
    effort,
    pending,
  };
  // A stored flag that disagrees with the board is impossible rather than
  // undetectable. VECTOR.md 4.1.
  if (state.solved && (state.submissions < 1 || !isSatisfied(state))) {
    return err({ code: "malformed", detail: "solved flag disagrees with the board" });
  }
  return ok(state);
}

/**
 * Version 1 is refused rather than upgraded. A v1 payload carries no effort
 * record, and filling zeros would put a false statement about the player's run
 * into a shareable artifact. Engine decision 10 makes the refusal cost exactly
 * one unfinished board and never a streak, and VECTOR has not launched, so the
 * real cost is a development save.
 */
function migrateState(
  fromVersion: number,
  _raw: SerializedState,
): Result<SerializedState, StateFailure> {
  return err({
    code: "unsupported-version",
    detail: `no migration from version ${String(fromVersion)}`,
  });
}

/** v3. Recomputed, never read from the manifest. See rules.difficultyFor. */
function difficulty(puzzle: VectorPuzzle): number {
  return difficultyFor(puzzle);
}

/** v3. The compact local run log, section 13. */
function telemetry(state: VectorState): RunLog {
  return vectorRunLog(state);
}

/** v3. The pure mapper. It reads the run log and the outcome, never the board,
 *  which is what the answer property probe in telemetry.ts asserts. */
function shareArtifact(
  _puzzle: VectorPuzzle,
  state: VectorState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  return vectorArtifact(state, run, context);
}

function mount(
  host: HTMLElement,
  context: MountContext<VectorState, VectorAction, VectorPuzzle>,
): GameView<VectorState> {
  return mountVector(host, context, { reducedMotion: context.reducedMotion });
}

function help(): HelpContent {
  return helpContent();
}

const vector: GameModuleV3<VectorState, VectorAction, VectorPuzzle> = {
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

export default defineGameV3(vector);

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
  LAYOUT_RADIX,
  SHARE_ROW_WIDTH,
  STATE_VERSION,
};

export type { Rejection, VectorAction, VectorPuzzle, VectorState };
export { candidateList };
