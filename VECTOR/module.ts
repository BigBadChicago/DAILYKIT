/**
 * Layer 4. The VECTOR GameModule. VECTOR.md sections 1, 6, 11 and 12.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  DistributionSpec,
  FinishedOutcome,
  Outcome,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareBlock,
  ShareContext,
  ShareRow,
} from "../../core/types.js";
import { rngFromSeed } from "../../core/rng.js";
import { defineGame, type GameModule } from "../../contract/game-module.js";
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
import { tierLabel } from "../../engine/tiers.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import {
  MAX_SUBMISSIONS,
  apply,
  bucketFor,
  initialState,
  inspect,
  isSatisfied,
  makePuzzle,
  tierFor,
  type VectorAction,
  type VectorBest,
  type VectorPuzzle,
  type VectorState,
} from "./rules.js";
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
const STATE_VERSION = 1;
/** Cells per share row. The suite meter width. VECTOR.md 12. */
const SHARE_ROW_WIDTH = 5;

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
  const board = generateUnrated({ intBelow: (bound: number): number => rng.intBelow(bound) });
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
    const dir = state.arrows[cell];
    arrows += dir === null ? "." : (ARROW_CHARS[dir] as string);
  }
  return { v: STATE_VERSION, data: { a: arrows, n: state.submissions, s: state.solved } };
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

  const state: VectorState = { puzzle, arrows, submissions: data.n, solved: data.s };
  // A stored flag that disagrees with the board is impossible rather than
  // undetectable. VECTOR.md 4.1.
  if (state.solved && (state.submissions < 1 || !isSatisfied(state))) {
    return err({ code: "malformed", detail: "solved flag disagrees with the board" });
  }
  return ok(state);
}

/** Nothing has shipped below version 1, so there is nothing to migrate from. */
function migrateState(
  fromVersion: number,
  _raw: SerializedState,
): Result<SerializedState, StateFailure> {
  return err({
    code: "unsupported-version",
    detail: `no migration from version ${String(fromVersion)}`,
  });
}

function bucketOf(_outcome: FinishedOutcome, state: VectorState): number {
  return bucketFor(state);
}

/**
 * One row per submission, five cells each, best across for the submission that
 * solved it and miss across for one that did not. The engine pads, caps rows and
 * appends the URL. VECTOR.md 12.
 */
function shareBlock(state: VectorState, context: ShareContext): ShareBlock {
  const rows: ShareRow[] = [];
  for (let at = 0; at < state.submissions; at += 1) {
    const solvedHere = state.solved && at === state.submissions - 1;
    const token: ShareToken = solvedHere ? "best" : "miss";
    rows.push(new Array<ShareToken>(SHARE_ROW_WIDTH).fill(token));
  }

  /* Never unrated: the tier is the submission count, not a stored optimum, so
     tierLabel is never handed a null here. Contract decision 16. */
  const label = tierLabel(tierFor(state));
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return {
    title: `VECTOR #${String(context.puzzleNumber)} ${label}${streak}`,
    rows,
  };
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

const vector: GameModule<VectorState, VectorAction, VectorPuzzle> = {
  identity,
  input,
  manifest,
  archiveEnabled: true,
  hasWinLoss: true,
  stateVersion: STATE_VERSION,
  distribution,
  parsePuzzle,
  generatePuzzle,
  firstSessionPuzzle,
  initialState,
  serialize,
  deserialize,
  migrateState,
  apply,
  inspect: (state: VectorState): Outcome => inspect(state),
  bucketOf,
  shareBlock,
  mount,
  help,
};

export default defineGame(vector);

/** Exported for the module tests only. Nothing in the shell reads these. */
export const internals = {
  identity,
  input,
  distribution,
  parsePuzzle,
  serialize,
  deserialize,
  shareBlock,
  LAYOUT_RADIX,
  SHARE_ROW_WIDTH,
};

export type { Rejection, VectorAction, VectorPuzzle, VectorState };
export { candidateList };
