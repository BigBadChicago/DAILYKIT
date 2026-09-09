/**
 * Layer 4. The only export the shell sees for CIPHER.
 *
 * Deliberately imports the generator and never the solver: the solver's
 * precomputed table is 1.7 megabytes and belongs to Node, which is why a
 * puzzle's difficulty and line length are read from the manifest rather than
 * computed here.
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
  ShareRow,
} from "../../core/types.js";
import { tierLabel } from "../../engine/tiers.js";
import { defineGame } from "../../contract/game-module.js";
import type { GameView, HelpContent, MountContext, PuzzleFailure, StateFailure } from "../../contract/types.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { LEVERS, generatePuzzle as makePuzzle, type CipherLever, type CipherPuzzle } from "./generator.js";
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
import { tierFor } from "./rules.js";


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

/** Rows are sorted so a reader cannot recover which slot was right. Rules
 *  decision 1 of the phase plan, carried into the share block. */
function shareRow(exact: number, misplaced: number): ShareRow {
  const cells: ShareToken[] = [];
  for (let i = 0; i < exact; i += 1) cells.push("best");
  for (let i = 0; i < misplaced; i += 1) cells.push("partial");
  while (cells.length < CODE_LENGTH) cells.push("miss");
  return cells;
}

export default defineGame<CipherState, CipherAction, CipherPuzzle>({
  identity: {
    id: "cipher",
    displayName: "CIPHER",
    /* The first Monday of the epoch year, so puzzle 1 lands in the gentlest
       weekday band. Four days after POKER GRID's, which the contract's per game
       epoch has always allowed. */
    epoch: { year: 2026, month: 1, day: 5 },
    shareUrl: "dailykit.providentia.games",
    accent: { hue: "268", boardFontStack: "ui-monospace, monospace" },
    oneLineRule: "Break a four symbol code in six guesses from exact and misplaced counts.",
  },

  input: {
    kind: "custom",
    pointer: "tap",
    keys: ["1", "2", "3", "4", "5", "6", "Backspace", "Enter", "ArrowLeft", "ArrowRight"],
  },

  /* A year of CIPHER is 36 kilobytes and wants one file, so the index carries a
     single pointer covering the whole horizon. */
  manifest: {
    indexUrl: "/data/cipher/manifest.index.json",
    lookaheadDays: 7,
  },

  archiveEnabled: true,
  /* The first true in the project. CIPHER has a real failure state, so the win
     rate row of requirement 3.4 renders for the first time. */
  hasWinLoss: true,
  stateVersion: 1,

  distribution: {
    labels: ["1 guess", "2 guesses", "3 guesses", "4 guesses", "5 guesses", "6 guesses", "Not solved"],
    distinguishedIndex: 0,
  },

  parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<CipherPuzzle, PuzzleFailure> {
    if (typeof raw !== "object" || raw === null) return err({ code: "malformed", detail: "puzzle must be an object" });
    const value = raw as { code?: unknown; best?: unknown; levers?: unknown };
    const code = decodeCode(puzzleNumber, value.code);
    if (code === null) return err({ code: "malformed", detail: "code does not decode to four symbols" });
    if (!validBest(value.best)) return err({ code: "malformed", detail: "best is invalid" });
    const levers = value.levers === undefined ? [] : value.levers;
    if (!Array.isArray(levers) || !levers.every((lever) => (LEVERS as readonly string[]).includes(lever as string))) {
      return err({ code: "malformed", detail: "levers are invalid" });
    }
    return {
      ok: true,
      value: {
        number: puzzleNumber,
        code,
        levers: levers as readonly CipherLever[],
        best: (value.best ?? null) as CipherPuzzle["best"],
      },
    };
  },

  generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<CipherPuzzle, PuzzleFailure> {
    return ok(makePuzzle(puzzleNumber, seed));
  },

  initialState: (puzzle): CipherState => initialCipherState(puzzle.code),

  /* The code is stripped here and restored from the puzzle on the way back, so
     the answer never reaches localStorage. Feedback is not stored either: it is
     recomputed, which makes a stored pair that disagrees with the code
     impossible rather than undetectable. */
  serialize: (state): SerializedState => ({
    v: 1,
    data: { d: encodeDraft(state.draft), g: state.guesses.map((record) => encodeCodeString(record.code)) },
  }),

  deserialize(puzzle, raw): Result<CipherState, StateFailure> {
    if (raw.v !== 1 || typeof raw.data !== "object" || raw.data === null) {
      return err({ code: "unsupported-version", detail: `v${raw.v}` });
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
  },

  migrateState: (fromVersion) => err({ code: "unsupported-version", detail: `no path from v${fromVersion}` }),

  apply: (state, action): Result<CipherState, Rejection> => applyCipherAction(state, action),

  inspect(state): Outcome {
    if (!isTerminal(state)) return { kind: "ongoing" };
    const guesses = state.guesses.length;
    return {
      kind: "finished",
      score: state.solved ? guesses : 0,
      won: state.solved,
      detail: state.solved ? `Solved in ${guesses}` : "Not solved",
      /* Derived from the guess count, so it is correct past the manifest
         horizon, where CIPHER owes the stored optimum nothing. Engine decision
         16 leaves it to the module. */
      tier: tierFor(guesses, state.solved),
    };
  },

  bucketOf: (_outcome: FinishedOutcome, state): number => bucketFor(state.guesses.length, state.solved),

  shareBlock(state, context: ShareContext): ShareBlock {
    /* The tier is written into the title by the module, which owns its own
       grade. Requirement 3.5.1 puts the result summary on the title line. */
    const label = tierLabel(tierFor(state.guesses.length, state.solved));
    const streak = context.currentStreak >= 2 ? `, streak ${context.currentStreak}` : "";
    return {
      title: `CIPHER #${context.puzzleNumber} ${label}${streak}`,
      rows: state.guesses.map((record) => shareRow(record.feedback.exact, record.feedback.misplaced)),
    };
  },

  mount(host: HTMLElement, context: MountContext<CipherState, CipherAction, CipherPuzzle>): GameView<CipherState> {
    return mountCipher(host, context, { reducedMotion: context.reducedMotion });
  },

  help(): HelpContent {
    return CIPHER_HELP;
  },
});
