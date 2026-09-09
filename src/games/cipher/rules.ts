/**
 * Layer 4. CIPHER rules. Pure, no DOM, no clock, no randomness.
 *
 * The code lives in state rather than being passed to apply, because the
 * contract's apply sees only state and an action. It is stripped by the
 * module's serialize, so it never reaches localStorage. See CIPHER.md
 * section 9.2.
 */

import { err, ok, type Result } from "../../core/result.js";
import type { Rejection, TierOrdinal } from "../../core/types.js";

export const CODE_LENGTH = 4;
export const SYMBOL_COUNT = 6;
export const MAX_GUESSES = 6;
/** 6^4. Asserted against SYMBOL_COUNT and CODE_LENGTH by test. */
export const CODE_SPACE = 1296;

/** Index into the six shapes. Drawing is presentation, the index is data. */
export type CipherSymbol = number;
export type Code = readonly CipherSymbol[];

export interface Feedback {
  readonly exact: number;
  readonly misplaced: number;
}

export interface GuessRecord {
  readonly code: Code;
  readonly feedback: Feedback;
}

export interface CipherState {
  readonly code: Code;
  readonly draft: readonly (CipherSymbol | null)[];
  readonly guesses: readonly GuessRecord[];
  readonly solved: boolean;
}

export type CipherAction =
  | { readonly kind: "set"; readonly slot: number; readonly symbol: CipherSymbol }
  | { readonly kind: "clear"; readonly slot: number }
  | { readonly kind: "submit" };

export function isSymbol(value: unknown): value is CipherSymbol {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < SYMBOL_COUNT;
}

export function isCode(value: unknown): value is Code {
  return Array.isArray(value) && value.length === CODE_LENGTH && value.every(isSymbol);
}

/**
 * Exacts are removed from both sides first, then misplaced is a multiset
 * intersection of the remainder. The removal order is the whole algorithm:
 * counting before it double counts a symbol that is already matched in place.
 * CIPHER.md section 4.
 */
export function scoreGuess(code: Code, guess: Code): Feedback {
  if (!isCode(code) || !isCode(guess)) throw new RangeError("code and guess must be four symbols");
  const codeCounts = new Array<number>(SYMBOL_COUNT).fill(0);
  const guessCounts = new Array<number>(SYMBOL_COUNT).fill(0);
  let exact = 0;
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const c = code[i] as number;
    const g = guess[i] as number;
    if (c === g) {
      exact += 1;
    } else {
      codeCounts[c] = (codeCounts[c] as number) + 1;
      guessCounts[g] = (guessCounts[g] as number) + 1;
    }
  }
  let misplaced = 0;
  for (let s = 0; s < SYMBOL_COUNT; s += 1) {
    misplaced += Math.min(codeCounts[s] as number, guessCounts[s] as number);
  }
  return { exact, misplaced };
}

export function solvedBy(feedback: Feedback): boolean {
  return feedback.exact === CODE_LENGTH;
}

export function initialCipherState(code: Code): CipherState {
  if (!isCode(code)) throw new RangeError("code must be four symbols");
  return {
    code,
    draft: new Array<CipherSymbol | null>(CODE_LENGTH).fill(null),
    guesses: [],
    solved: false,
  };
}

export function isTerminal(state: CipherState): boolean {
  return state.solved || state.guesses.length >= MAX_GUESSES;
}

export function draftCode(state: CipherState): Code | null {
  return state.draft.every(isSymbol) ? (state.draft as Code) : null;
}

function sameCode(left: Code, right: Code): boolean {
  return left.every((symbol, index) => symbol === right[index]);
}

const REJECT = {
  slotRange: { code: "slot-range", announce: "That slot does not exist." },
  symbolRange: { code: "symbol-range", announce: "That is not one of the six shapes." },
  incomplete: { code: "incomplete", announce: "Fill all four slots before you submit." },
  repeat: { code: "repeat-guess", announce: "You have already tried that code." },
  over: { code: "game-over", announce: "This puzzle is finished." },
} as const satisfies Record<string, Rejection>;

export function applyCipherAction(
  state: CipherState,
  action: CipherAction,
): Result<CipherState, Rejection> {
  if (isTerminal(state)) return err(REJECT.over);

  if (action.kind === "set") {
    if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= CODE_LENGTH) {
      return err(REJECT.slotRange);
    }
    if (!isSymbol(action.symbol)) return err(REJECT.symbolRange);
    const draft = [...state.draft];
    draft[action.slot] = action.symbol;
    return ok({ ...state, draft });
  }

  if (action.kind === "clear") {
    if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= CODE_LENGTH) {
      return err(REJECT.slotRange);
    }
    const draft = [...state.draft];
    draft[action.slot] = null;
    return ok({ ...state, draft });
  }

  const guess = draftCode(state);
  if (guess === null) return err(REJECT.incomplete);
  if (state.guesses.some((record) => sameCode(record.code, guess))) return err(REJECT.repeat);

  const feedback = scoreGuess(state.code, guess);
  return ok({
    ...state,
    draft: new Array<CipherSymbol | null>(CODE_LENGTH).fill(null),
    guesses: [...state.guesses, { code: guess, feedback }],
    solved: solvedBy(feedback),
  });
}

/** CIPHER.md section 6.1. One and two share a band because the fairness floor
 *  makes a sub four solve luck rather than skill. */
export function tierFor(guesses: number, solved: boolean): TierOrdinal {
  if (!solved) return 4;
  if (guesses <= 2) return 0;
  if (guesses === 3) return 1;
  if (guesses === 4) return 2;
  if (guesses === 5) return 3;
  return 4;
}

/** Index into the module's seven distribution labels. */
export function bucketFor(guesses: number, solved: boolean): number {
  return solved ? guesses - 1 : MAX_GUESSES;
}
