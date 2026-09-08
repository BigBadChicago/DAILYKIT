/**
 * Layer 4. Contract regression fixture. Never shipped: vite.config.ts excludes
 * it by an explicit GAME allow list, per contract decision 12.
 *
 * Its only job is to be the smallest thing that satisfies every member of
 * GameModule, so a change to the contract fails here first and in one file
 * rather than inside POKER GRID's several hundred lines. Rules are deliberately
 * trivial. Nothing here is a design reference for a real game.
 */

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
import { defineGame } from "../../contract/game-module.js";
import type {
  GameView,
  HelpContent,
  MountContext,
  PuzzleFailure,
  StateFailure,
} from "../../contract/types.js";
import { intBelow } from "../../core/rng.js";
import { rngFromSeed } from "../../core/seed.js";

const CELLS = 9;

interface Puzzle {
  readonly number: PuzzleNumber;
  /** Cell indices that must be tapped. */
  readonly lit: readonly number[];
}

interface State {
  readonly puzzleNumber: PuzzleNumber;
  readonly lit: readonly number[];
  readonly tapped: readonly number[];
  readonly misses: number;
}

type Action = { readonly kind: "tap"; readonly cell: number };

function isLitList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => Number.isInteger(n) && n >= 0 && n < CELLS);
}

export default defineGame<State, Action, Puzzle>({
  identity: {
    id: "toy-tap",
    displayName: "TOY TAP",
    epoch: { year: 2026, month: 1, day: 1 },
    shareUrl: "dailykit.providentia.games",
    accent: { hue: "200", boardFontStack: "ui-monospace, monospace" },
    oneLineRule: "Tap every lit cell without tapping a dark one.",
  },
  input: { kind: "grid", cols: 3, rows: 3, pointer: "tap" },
  manifest: {
    granularity: "month",
    urlForChunk: (n) => `/toy-tap/manifest.${String(Math.floor(n / 30))}.json`,
    indexUrl: "/toy-tap/manifest.index.json",
    lookaheadDays: 7,
  },
  archiveEnabled: true,
  hasWinLoss: true,
  stateVersion: 1,
  distribution: { labels: ["0 misses", "1 miss", "2 misses", "3 or more"], distinguishedIndex: 0 },

  parsePuzzle(puzzleNumber, raw): Result<Puzzle, PuzzleFailure> {
    if (typeof raw !== "object" || raw === null || !isLitList((raw as { lit?: unknown }).lit)) {
      return err({ code: "malformed", detail: "lit must be a list of cell indices" });
    }
    return ok({ number: puzzleNumber, lit: (raw as { lit: number[] }).lit });
  },

  generatePuzzle(puzzleNumber, seed: Seed): Result<Puzzle, PuzzleFailure> {
    const rng = rngFromSeed(seed);
    const lit = new Set<number>();
    while (lit.size < 3) lit.add(intBelow(rng, CELLS));
    return ok({ number: puzzleNumber, lit: [...lit].sort((a, b) => a - b) });
  },

  firstSessionPuzzle(): Puzzle {
    return { number: 0, lit: [0, 1, 2] };
  },

  initialState: (puzzle) => ({ puzzleNumber: puzzle.number, lit: puzzle.lit, tapped: [], misses: 0 }),

  serialize: (state) => ({ v: 1, data: { t: state.tapped, m: state.misses } }),

  deserialize(puzzle, raw): Result<State, StateFailure> {
    const data = raw.data as { t?: unknown; m?: unknown } | null;
    if (raw.v !== 1) return err({ code: "unsupported-version", detail: `v${raw.v}` });
    if (data === null || !isLitList(data.t) || !Number.isInteger(data.m)) {
      return err({ code: "malformed", detail: "t must be cells and m an integer" });
    }
    if (data.t.some((cell) => !puzzle.lit.includes(cell))) {
      return err({ code: "puzzle-mismatch", detail: "tapped a cell this puzzle does not light" });
    }
    return ok({ puzzleNumber: puzzle.number, lit: puzzle.lit, tapped: data.t, misses: data.m as number });
  },

  migrateState: (fromVersion, raw) =>
    err({ code: "unsupported-version", detail: `no path from v${fromVersion} of ${String(raw.v)}` }),

  apply(state, action): Result<State, Rejection> {
    if (state.tapped.length === state.lit.length) {
      return err({ code: "finished", announce: "Board finished." });
    }
    if (action.cell < 0 || action.cell >= CELLS) {
      return err({ code: "out-of-range", announce: "That cell does not exist." });
    }
    if (state.tapped.includes(action.cell)) {
      return err({ code: "already-tapped", announce: "That cell is already tapped." });
    }
    if (!state.lit.includes(action.cell)) {
      return ok({ ...state, misses: state.misses + 1 });
    }
    return ok({ ...state, tapped: [...state.tapped, action.cell] });
  },

  inspect(state): Outcome {
    if (state.tapped.length < state.lit.length) return { kind: "ongoing" };
    return {
      kind: "finished",
      score: Math.max(0, 100 - state.misses * 10),
      won: state.misses === 0,
      detail: `${state.misses} misses`,
      /* No manifest and no optimum, so nothing to grade. */
      tier: null,
    };
  },

  bucketOf: (_outcome: FinishedOutcome, state) => Math.min(3, state.misses),

  shareBlock(state, context: ShareContext): ShareBlock {
    const title = `TOY TAP #${context.puzzleNumber} ${state.misses === 0 ? "clean" : "messy"}`;
    return { title, rows: state.lit.map(() => [state.misses === 0 ? "best" : "weak"] as const) };
  },

  mount(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
    host.textContent = `toy-tap #${context.puzzle.number}`;
    return {
      update(state) {
        host.textContent = `toy-tap #${state.puzzleNumber} ${state.tapped.length}/${state.lit.length}`;
      },
      unmount() {
        host.textContent = "";
      },
    };
  },

  help(): HelpContent {
    return {
      headline: "Tap every lit cell.",
      steps: ["Lit cells are highlighted.", "Tapping a dark cell costs a miss.", "Clear all three to finish."],
      example: { caption: "three lit cells in the top row", lines: ["xxx", "...", "..."] },
    };
  },
});
