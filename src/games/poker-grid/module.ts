/**
 * Layer 4. The POKER GRID GameModule, implementing v2 and v3 at once.
 *
 * One implementation object satisfies both contracts, because FinishedOutcomeV3
 * is FinishedOutcome plus two fields and is therefore assignable to it. The
 * default export stays the v2 module so the shell, the entry and the build are
 * untouched; `pokerGridV3` is the same object seen through the v3 seam. This is
 * the shape phases 2 and 3 established. ARCHITECTURE2 sections 47 and 56.
 *
 * Deliberately imports `greedy.ts` and never `solver.ts`. The greedy player is
 * a few dozen lines over modules the board already loads, and it is half of the
 * difficulty measure; the solver is the half that stays in Node. See
 * difficulty.ts for which half is measured and which is read.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  DistributionSpec,
  FinishedOutcome,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareBlock,
  ShareContext,
  TierOrdinal,
} from "../../core/types.js";
import { defineGame, type GameModule } from "../../contract/game-module.js";
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
import { HAND_ORDINAL, categoryFromOrdinal } from "../../shared/poker-hands.js";
import { difficultyOf } from "./difficulty.js";
import { HAND_SIZE } from "./evaluator.js";
import { generatePuzzle as makePuzzle, isValidBoard, type Lever, type PokerPuzzle } from "./generator.js";
import { POKER_GRID_HELP } from "./help.js";
import { decodeBoard } from "./manifest-codec.js";
import { mountPokerGrid } from "./render.js";
import {
  BOARD_CELLS,
  EMPTY_EFFORT,
  MAX_HANDS,
  applyPokerAction,
  bucketFor,
  hasLegalMove,
  type HandRecord,
  type PokerAction,
  type PokerEffort,
  type PokerState,
} from "./rules.js";
import { CLEAR_VALUE_PER_HAND, scoreHands, tierFor } from "./scoring.js";
import {
  SHARE_ROW_WIDTH,
  artifactRows,
  artifactTitle,
  finishedOutcomeFor,
  pokerArtifact,
  pokerRunLog,
  readEntries,
} from "./telemetry.js";
import { tutorialPuzzle } from "./tutorial.js";

/**
 * 2 since phase 4. The effort record is new state, and it is the only way this
 * game can say anything about a run, so there is no migration from 1 that is
 * not an invention. Filling zeros for hands whose effort was never recorded
 * would put a false statement about the player's run into a shareable artifact,
 * and engine decision 10 already prices the refusal at one unfinished board and
 * never a streak. Phase 2 made the same call for VECTOR and for the same reason.
 */
const STATE_VERSION = 2;

const CARD_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";

function validPuzzleBest(value: unknown): value is PokerPuzzle["best"] {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const best = value as { score?: unknown; hands?: unknown; method?: unknown; width?: unknown };
  if (best.width !== undefined && !Number.isInteger(best.width)) return false;
  return Number.isInteger(best.score)
    && Number.isInteger(best.hands)
    && (best.method === "exact" || best.method === "beam");
}

function encodeCard(card: number): string {
  const encoded = CARD_ALPHABET[card];
  if (encoded === undefined) throw new RangeError("card is outside the serialization alphabet");
  return encoded;
}

function decodeCard(value: string): number | null {
  if (value === ".") return null;
  const card = CARD_ALPHABET.indexOf(value);
  return card < 0 ? null : card;
}

function encodeGrid(grid: readonly (number | null)[]): string {
  return grid.map((card) => card === null ? "." : encodeCard(card)).join("");
}

function decodeGrid(value: unknown): readonly (number | null)[] | null {
  if (typeof value !== "string" || value.length !== BOARD_CELLS) return null;
  const grid = [...value].map(decodeCard);
  if (grid.some((card, index) => value[index] !== "." && card === null)) return null;
  return grid;
}

function isValidSelection(selection: readonly number[], grid: readonly (number | null)[]): boolean {
  if (selection.length > HAND_SIZE || new Set(selection).size !== selection.length) return false;
  return selection.every((cell, index) => Number.isInteger(cell)
    && cell >= 0
    && cell < BOARD_CELLS
    && grid[cell] !== null
    && (index === 0 || selection.slice(0, index).some((previous) => {
      const rowDelta = Math.abs(Math.floor(previous / 5) - Math.floor(cell / 5));
      const colDelta = Math.abs((previous % 5) - (cell % 5));
      return rowDelta + colDelta === 1;
    })));
}

function cardsMatchPuzzle(grid: readonly (number | null)[], puzzle: PokerPuzzle, handCount: number): boolean {
  const puzzleCards = new Set(puzzle.cells);
  const remaining = grid.filter((card): card is number => card !== null);
  return remaining.every((card) => puzzleCards.has(card))
    && new Set(remaining).size === remaining.length
    && remaining.length + handCount * HAND_SIZE === BOARD_CELLS;
}

/* Two small non negative integers per hand, so a pair of numbers costs less
   than an object with two keys repeated seven times. Storage budget, section
   37: the whole record is well under a hundred bytes. */
function encodeEffort(effort: PokerEffort): readonly number[] {
  return [effort.taps, effort.backs];
}

function decodeEffort(value: unknown): PokerEffort | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [taps, backs] = value as unknown[];
  if (!Number.isInteger(taps) || !Number.isInteger(backs)) return null;
  if ((taps as number) < 0 || (backs as number) < 0) return null;
  return { taps: taps as number, backs: backs as number };
}

const identity: GameIdentity = {
  id: "poker-grid",
  displayName: "POKER GRID",
  epoch: { year: 2026, month: 1, day: 1 },
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "148", boardFontStack: "ui-monospace, monospace" },
  oneLineRule: "Clear the board with connected five card poker hands.",
};

const input: InputDescriptor = { kind: "grid", cols: 5, rows: 7, pointer: "drag" };

const manifest: ManifestDescriptor = {
  indexUrl: "/data/poker-grid/manifest.index.json",
  lookaheadDays: 7,
};

/**
 * Section 13. Two patterns, both computed from the player's own actions: the
 * ladder replays the run without naming a card or a cell, and the friction is
 * what the run cost in rebuilding.
 *
 * `maxRows` is 7 and this is the first game in the suite to sit exactly on
 * section 49's cap: seven hands plus a title plus a URL is nine lines. There is
 * no headroom, so the test that renders a perfect clear through the grammar is
 * load bearing rather than a formality.
 */
const shareCapabilities: ShareCapabilities = {
  grammar: "A",
  patterns: ["emergent-fingerprint", "comparative-friction"],
  maxRows: MAX_HANDS,
};

const distribution: DistributionSpec = {
  labels: ["Perfect Clear", "5 left", "10 left", "15 left", "20 left", "25 left", "30 left", "35 left"],
  distinguishedIndex: 0,
};

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<PokerPuzzle, PuzzleFailure> {
  if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "puzzle must be an object" });
  const value = raw as { board?: unknown; best?: unknown; levers?: unknown; attempt?: unknown };
  const cells = decodeBoard(puzzleNumber, value.board);
  if (cells === null || !isValidBoard(cells)) return err({ code: "malformed", detail: "board does not decode to 35 distinct cards" });
  if (!validPuzzleBest(value.best)) return err({ code: "malformed", detail: "best is invalid" });
  const levers = value.levers === undefined ? ["none"] : value.levers;
  if (!Array.isArray(levers) || !levers.every((lever) => typeof lever === "string")) return err({ code: "malformed", detail: "levers must be strings" });
  /* Generation decision 10 has recorded the attempt since Phase 7; phase 4 is
     the first thing to read it, because the greedy salt is keyed by it. Absent
     means attempt 0, which is what a past horizon board is. */
  const attempt = value.attempt === undefined ? 0 : value.attempt;
  if (!Number.isInteger(attempt) || (attempt as number) < 0) return err({ code: "malformed", detail: "attempt must be a non negative integer" });
  return ok({
    number: puzzleNumber,
    cells,
    best: value.best as PokerPuzzle["best"],
    levers: levers as readonly Lever[],
    attempt: attempt as number,
  });
}

function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<PokerPuzzle, PuzzleFailure> {
  return ok(makePuzzle(puzzleNumber, seed));
}

/* Charter decision 2. A fixed easy board played before the first real puzzle,
   never graded and never recorded. */
function firstSessionPuzzle(): PokerPuzzle {
  return tutorialPuzzle();
}

function initialState(puzzle: PokerPuzzle): PokerState {
  const grid = puzzle.cells.slice();
  return {
    grid,
    puzzle,
    selection: [],
    hands: [],
    score: 0,
    terminal: !hasLegalMove(grid),
    effort: [],
    pending: EMPTY_EFFORT,
  };
}

function serialize(state: PokerState): SerializedState {
  return {
    v: STATE_VERSION,
    data: {
      g: encodeGrid(state.grid),
      s: [...state.selection],
      h: state.hands.map((hand) => [HAND_ORDINAL[hand.category], hand.points]),
      e: state.effort.map(encodeEffort),
      p: encodeEffort(state.pending),
    },
  };
}

function deserialize(puzzle: PokerPuzzle, raw: SerializedState): Result<PokerState, StateFailure> {
  if (raw.v !== STATE_VERSION || typeof raw.data !== "object" || raw.data === null) {
    return err({ code: "unsupported-version", detail: `v${String(raw.v)}` });
  }
  const data = raw.data as { g?: unknown; s?: unknown; h?: unknown; e?: unknown; p?: unknown };
  const grid = decodeGrid(data.g);
  if (grid === null || !Array.isArray(data.s) || !Array.isArray(data.h) || !Array.isArray(data.e)) {
    return err({ code: "malformed", detail: "invalid poker grid state" });
  }
  if (!data.s.every((cell): cell is number => Number.isInteger(cell)) || !isValidSelection(data.s, grid)) {
    return err({ code: "malformed", detail: "selection is invalid" });
  }

  const hands: HandRecord[] = [];
  for (const rawHand of data.h) {
    if (!Array.isArray(rawHand) || rawHand.length !== 2 || !Number.isInteger(rawHand[0]) || !Number.isInteger(rawHand[1])) {
      return err({ code: "malformed", detail: "hand is invalid" });
    }
    const category = categoryFromOrdinal(rawHand[0] as number);
    if (category === null || category === "high-card" || rawHand[1] !== scoreHands([{ category, points: rawHand[1] as number }]) - CLEAR_VALUE_PER_HAND) {
      return err({ code: "malformed", detail: "hand points are invalid" });
    }
    hands.push({ category, points: rawHand[1] as number });
  }

  /* One effort record per committed hand, and each one has to account for at
     least the five taps that hand took. A record that does not is not a run
     this game could have produced, and a run log built from it would be a
     false statement in a shareable artifact. */
  const effort: PokerEffort[] = [];
  for (const rawEffort of data.e) {
    const record = decodeEffort(rawEffort);
    if (record === null || record.taps < HAND_SIZE) return err({ code: "malformed", detail: "effort record is invalid" });
    effort.push(record);
  }
  if (effort.length !== hands.length) return err({ code: "malformed", detail: "effort does not match the hands played" });

  const pending = decodeEffort(data.p);
  if (pending === null || pending.taps < data.s.length) return err({ code: "malformed", detail: "pending effort is invalid" });

  if (hands.length > MAX_HANDS || !cardsMatchPuzzle(grid, puzzle, hands.length)) {
    return err({ code: "puzzle-mismatch", detail: "saved cards do not match this puzzle" });
  }
  return {
    ok: true,
    value: {
      grid,
      puzzle,
      selection: data.s,
      hands,
      score: scoreHands(hands),
      terminal: !hasLegalMove(grid),
      effort,
      pending,
    },
  };
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: `no path from v${String(fromVersion)}` });
}

function apply(state: PokerState, action: PokerAction): Result<PokerState, Rejection> {
  return applyPokerAction(state, action);
}

function inspect(state: PokerState): OutcomeV3 {
  if (!state.terminal) return { kind: "ongoing" };
  return finishedOutcomeFor(state);
}

function bucketOf(_outcome: FinishedOutcome, state: PokerState): number {
  return bucketFor(state.grid);
}

/** v3. Split from bucketOf. Both read the state, because both are facts about
 *  how the player finished and neither needs the outcome to restate them. */
function tierOf(_outcome: FinishedOutcome, state: PokerState): TierOrdinal | null {
  return tierFor(state.puzzle.best, state.hands, state.score);
}

/** v3. Measured from the board, never read from a stored field. The stored
 *  optimum is the denominator and that is read; see difficulty.ts. */
function difficulty(puzzle: PokerPuzzle): number {
  return difficultyOf(puzzle);
}

/** v3. The compact local run log, section 13. */
function telemetry(state: PokerState): RunLog {
  return pokerRunLog(state);
}

/** v3. The pure mapper. It reads the run log and the state, never a card and
 *  never a cell, which is what the leak probes in telemetry.ts assert. */
/* The contract hands the puzzle in and the state carries the same object, so
   the mapper reads one of them rather than being trusted to keep two agreed.
   The state is the one it reads, because that is the object every other
   telemetry function here already works from. */
function shareArtifact(
  _puzzle: PokerPuzzle,
  state: PokerState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  return pokerArtifact(state, run, context);
}

/**
 * The v2 block. It is the v3 artifact's title and rows with the fingerprint and
 * the outcome dropped, built from the same two functions, so the two cannot
 * drift apart and POKER-GRID.md section 14.1 is not reopened.
 */
function shareBlock(state: PokerState, context: ShareContext): ShareBlock {
  return {
    title: artifactTitle(state, context),
    rows: artifactRows(readEntries(pokerRunLog(state))),
  };
}

function mount(
  host: HTMLElement,
  context: MountContext<PokerState, PokerAction, PokerPuzzle>,
): GameView<PokerState> {
  return mountPokerGrid(host, context, { reducedMotion: context.reducedMotion });
}

function help(): HelpContent {
  return POKER_GRID_HELP;
}

/* Not annotated, so the two typed views below can each take the members they
   need without an excess property error on a fresh object literal. */
const pokerGrid = {
  identity,
  input,
  manifest,
  archiveEnabled: true,
  /* Locked decision 4 removes the failure state, so there is no win rate row.
     Recorded conflict resolution 1. */
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
  bucketOf,
  tierOf,
  telemetry,
  shareArtifact,
  shareBlock,
  mount,
  help,
};

const asV2: GameModule<PokerState, PokerAction, PokerPuzzle> = pokerGrid;
const asV3: GameModuleV3<PokerState, PokerAction, PokerPuzzle> = pokerGrid;

export default defineGame(asV2);

/** The same module through the v3 seam. Nothing imports it yet; the shell is
 *  still v2 and a game cannot lead it. ARCHITECTURE2 section 56, phase 4. */
export const pokerGridV3 = defineGameV3(asV3);

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
  shareBlock,
  difficulty,
  bucketOf,
  tierOf,
  telemetry,
  shareArtifact,
  SHARE_ROW_WIDTH,
  STATE_VERSION,
};

export type { PokerAction, PokerPuzzle, PokerState, Rejection };
