import { err, ok, type Result } from "../../core/result.js";
import type { FinishedOutcome, Outcome, PuzzleNumber, Rejection, Seed, SerializedState, ShareBlock, ShareContext } from "../../core/types.js";
import { defineGame } from "../../contract/game-module.js";
import type { GameView, HelpContent, MountContext, PuzzleFailure, StateFailure } from "../../contract/types.js";
import { renderGridBoard } from "./render.js";
import { generatePuzzle } from "./generator.js";
import { applyAction, bucketOf, initialState, inspect, type Action, type Puzzle, type State } from "./rules.js";

const gameTitle = "SCAFFOLD CHECK";

function parsePuzzleNumber(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : null;
}

export default defineGame<State, Action, Puzzle>({
  identity: {
    id: "scaffold-check",
    displayName: "SCAFFOLD CHECK",
    epoch: { year: 2026, month: 1, day: 1 },
    shareUrl: "dailykit.providentia.games",
    accent: { hue: "96", boardFontStack: "ui-monospace, monospace" },
    oneLineRule: "Tap the target cell before the board says no.",
  },
  input: { kind: "grid", cols: 3, rows: 3, pointer: "tap" },
  manifest: { indexUrl: "/data/scaffold-check/manifest.index.json", lookaheadDays: 7 },
  archiveEnabled: true,
  hasWinLoss: true,
  stateVersion: 1,
  distribution: { labels: ["0 misses", "1 miss", "2 misses", "3 or more"], distinguishedIndex: 0 },

  parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<Puzzle, PuzzleFailure> {
    if (typeof raw !== "object" || raw === null) {
      return err({ code: "malformed", detail: "puzzle must be an object" });
    }
    const value = raw as { target?: unknown; number?: unknown };
    const target = typeof value.target === "number" && Number.isInteger(value.target) && value.target >= 0 && value.target < 9 ? value.target : null;
    if (target === null) {
      return err({ code: "malformed", detail: "target must be a cell index" });
    }
    const parsed = parsePuzzleNumber(value.number ?? puzzleNumber);
    if (parsed === null) {
      return err({ code: "malformed", detail: "number must be a positive integer" });
    }
    return ok({ number: parsed, target });
  },

  generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<Puzzle, PuzzleFailure> {
    return ok(generatePuzzle(puzzleNumber, seed));
  },

  initialState: (puzzle) => initialState(puzzle),

  serialize: (state) => ({ v: 1, data: { target: state.target, t: state.tapped, m: state.misses } }),

  deserialize(puzzle, raw): Result<State, StateFailure> {
    if (raw.v !== 1 || typeof raw.data !== "object" || raw.data === null) {
      return err({ code: "unsupported-version", detail: `v${raw.v}` });
    }
    const data = raw.data as { target?: unknown; t?: unknown; m?: unknown };
    if (!Number.isInteger(data.target) || !Array.isArray(data.t) || !Number.isInteger(data.m)) {
      return err({ code: "malformed", detail: "state payload is invalid" });
    }
    return ok({ puzzleNumber: puzzle.number, target: data.target as number, tapped: data.t as number[], misses: data.m as number });
  },

  migrateState: (fromVersion) => err({ code: "unsupported-version", detail: `no path from v${fromVersion}` }),

  apply: (state, action) => applyAction(state, action),

  inspect: (state) => inspect(state),

  bucketOf: (_outcome: FinishedOutcome, state) => bucketOf(state),

  shareBlock(state, context: ShareContext): ShareBlock {
    const label = state.tapped.includes(state.target) ? "won" : "play";
    return {
      title: `${gameTitle} #${context.puzzleNumber} ${label}`,
      rows: [["best", "best", "best"]],
    };
  },

  mount(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
    return renderGridBoard(host, context);
  },

  help(): HelpContent {
    return {
      headline: "Tap the target cell.",
      steps: ["The target is fixed for the day.", "Wrong cells count as misses.", "Tap the right cell to finish."],
      example: {
        caption: "Find the target before the misses pile up.",
        lines: ["1 2 3", "4 5 6", "7 8 9"],
      },
    };
  },
});
