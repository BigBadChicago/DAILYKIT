import { err, ok, type Result } from "../../core/result.js";
import type {
  FinishedOutcome,
  Outcome,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareBlock,
  ShareContext,
} from "../../core/types.js";
import { tierLabel } from "../../engine/tiers.js";
import { HAND_SHARE_TIER, categoryFromOrdinal, HAND_ORDINAL, type HandCategory } from "../../shared/poker-hands.js";
import { defineGame } from "../../contract/game-module.js";
import type { GameView, HelpContent, MountContext, PuzzleFailure, StateFailure } from "../../contract/types.js";
import { generatePuzzle as makePuzzle, isValidBoard, type PokerPuzzle } from "./generator.js";
import {
  BOARD_CELLS,
  applyPokerAction,
  hasLegalMove,
  type HandRecord,
  type PokerAction,
  type PokerState,
} from "./rules.js";
import { scoreHands, tierFor } from "./scoring.js";
import { CARD_CLEAR_POINTS } from "./scoring.js";

const CARD_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";
const HAND_COUNT_LIMIT = 7;

function validPuzzleBest(value: unknown): value is PokerPuzzle["best"] {
  if (value === null) return true;
  if (typeof value !== "object" || value === null) return false;
  const best = value as { score?: unknown; hands?: unknown; method?: unknown };
  return Number.isInteger(best.score) && Number.isInteger(best.hands) && (best.method === "exact" || best.method === "beam");
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
  if (selection.length > 5 || new Set(selection).size !== selection.length) return false;
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
    && remaining.length + handCount * 5 === BOARD_CELLS;
}

export default defineGame<PokerState, PokerAction, PokerPuzzle>({
  identity: {
    id: "poker-grid",
    displayName: "POKER GRID",
    epoch: { year: 2026, month: 1, day: 1 },
    shareUrl: "dailykit.providentia.games",
    accent: { hue: "148", boardFontStack: "ui-monospace, monospace" },
    oneLineRule: "Clear the board with connected five card poker hands.",
  },
  input: { kind: "grid", cols: 5, rows: 7, pointer: "drag" },
  manifest: {
    granularity: "month",
    urlForChunk: (number) => `/poker-grid/manifest.${number}.json`,
    indexUrl: "/poker-grid/manifest.index.json",
    lookaheadDays: 7,
  },
  archiveEnabled: true,
  hasWinLoss: false,
  stateVersion: 1,
  distribution: {
    labels: ["Perfect Clear", "5 left", "10 left", "15 left", "20 left", "25 left", "30 left", "35 left"],
    distinguishedIndex: 0,
  },

  parsePuzzle(puzzleNumber, raw): Result<PokerPuzzle, PuzzleFailure> {
    if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "puzzle must be an object" });
    const value = raw as { cells?: unknown; best?: unknown; levers?: unknown };
    if (!Array.isArray(value.cells) || !isValidBoard(value.cells)) return err({ code: "malformed", detail: "cells must contain 35 distinct cards" });
    if (!validPuzzleBest(value.best)) return err({ code: "malformed", detail: "best is invalid" });
    const levers = value.levers === undefined ? ["none"] : value.levers;
    if (!Array.isArray(levers) || !levers.every((lever) => typeof lever === "string")) return err({ code: "malformed", detail: "levers must be strings" });
    return ok({ number: puzzleNumber, cells: value.cells, best: value.best, levers });
  },

  generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<PokerPuzzle, PuzzleFailure> {
    return ok(makePuzzle(puzzleNumber, seed));
  },

  initialState: (puzzle): PokerState => {
    const grid = puzzle.cells.slice();
    return { grid, best: puzzle.best, selection: [], hands: [], score: 0, terminal: !hasLegalMove(grid), exceededStoredBest: false };
  },

  serialize: (state): SerializedState => ({
    v: 1,
    data: {
      g: encodeGrid(state.grid),
      s: [...state.selection],
      h: state.hands.map((hand) => [HAND_ORDINAL[hand.category], hand.points]),
      x: state.exceededStoredBest,
    },
  }),

  deserialize(puzzle, raw): Result<PokerState, StateFailure> {
    if (raw.v !== 1 || typeof raw.data !== "object" || raw.data === null) return err({ code: "unsupported-version", detail: `v${raw.v}` });
    const data = raw.data as { g?: unknown; s?: unknown; h?: unknown; x?: unknown };
    const grid = decodeGrid(data.g);
    if (grid === null || !Array.isArray(data.s) || !Array.isArray(data.h) || typeof data.x !== "boolean") return err({ code: "malformed", detail: "invalid poker grid state" });
    if (!data.s.every((cell): cell is number => Number.isInteger(cell)) || !isValidSelection(data.s, grid)) return err({ code: "malformed", detail: "selection is invalid" });
    const hands: HandRecord[] = [];
    for (const rawHand of data.h) {
      if (!Array.isArray(rawHand) || rawHand.length !== 2 || !Number.isInteger(rawHand[0]) || !Number.isInteger(rawHand[1])) return err({ code: "malformed", detail: "hand is invalid" });
      const category = categoryFromOrdinal(rawHand[0]);
      if (category === null || category === "high-card" || rawHand[1] !== scoreHands([{ category, points: rawHand[1] }]) - CARD_CLEAR_POINTS * 5) return err({ code: "malformed", detail: "hand points are invalid" });
      hands.push({ category, points: rawHand[1] });
    }
    if (hands.length > HAND_COUNT_LIMIT || !cardsMatchPuzzle(grid, puzzle, hands.length)) return err({ code: "puzzle-mismatch", detail: "saved cards do not match this puzzle" });
    const score = scoreHands(hands);
    return ok({ grid, best: puzzle.best, selection: data.s, hands, score, terminal: !hasLegalMove(grid), exceededStoredBest: data.x });
  },

  migrateState: (fromVersion) => err({ code: "unsupported-version", detail: `no path from v${fromVersion}` }),

  apply: applyPokerAction,

  inspect(state): Outcome {
    if (!state.terminal) return { kind: "ongoing" };
    const remaining = state.grid.filter((card) => card !== null).length;
    return { kind: "finished", score: state.score, won: null, detail: `${remaining} cards remaining` };
  },

  bucketOf: (_outcome: FinishedOutcome, state): number => Math.min(7, Math.floor(state.grid.filter((card) => card !== null).length / 5)),

  shareBlock(state, context: ShareContext): ShareBlock {
    const tier = tierFor(state.best, state.hands, state.score);
    const label = context.rated ? tierLabel(tier) : "unrated";
    const streak = context.rated && context.currentStreak >= 2 ? ` streak ${context.currentStreak}` : "";
    return {
      title: `POKER GRID #${context.puzzleNumber} ${label}${streak}`,
      rows: state.hands.map((hand) => [HAND_SHARE_TIER[hand.category]]),
    };
  },

  mount(host: HTMLElement, context: MountContext<PokerState, PokerAction, PokerPuzzle>): GameView<PokerState> {
    host.textContent = `POKER GRID #${context.puzzle.number}`;
    return {
      update(state): void { host.textContent = `${state.hands.length} hands, ${state.grid.filter((card) => card !== null).length} cards remaining`; },
      unmount(): void { host.textContent = ""; },
    };
  },

  help(): HelpContent {
    return {
      headline: "Clear the board by selecting five connected cards that make a poker hand.",
      steps: [
        "Drag across five cards that touch edge to edge. Diagonals do not count.",
        "Tap a card to add it. Tap a card already in your path to take back that card and everything after it.",
        "The five must make a pair or better. High card is not a hand.",
        "Cleared cards vanish, the columns fall, and no new cards arrive.",
        "Play until no five connected cards make a hand. There is no losing.",
      ],
      example: { caption: "two nines and three others, a pair, legal", lines: ["..x", "xxx", "..x"] },
    };
  },
});
