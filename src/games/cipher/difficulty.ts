/**
 * Layer 4. CIPHER's emergent difficulty measure, browser safe.
 *
 * The measure is CIPHER.md section 8 assertion 3: the count of codes still
 * consistent with the feedback from the fixed opening. It lived only in
 * solver.ts, which module.ts deliberately never imports because the solver's
 * feedback table is 1.7 megabytes and belongs to Node. ARCHITECTURE2 section 9
 * requires a module to measure its own difficulty rather than read it from the
 * manifest, so the opening, the code space enumeration and a table free form of
 * the measure live here where both sides can reach them.
 *
 * The solver keeps its table backed `remainingAfterOpening`, because
 * verification runs it beside a full minimax line and wants the array indexing.
 * Two implementations of one measure is the thing that goes wrong quietly, so
 * tests/games/cipher/difficulty.test.ts proves they agree on all 1,296 codes.
 */

import { CODE_LENGTH, CODE_SPACE, SYMBOL_COUNT, scoreGuess, type Code } from "./rules.js";

/**
 * Fixed before the horizon was generated. Changing it invalidates every stored
 * difficulty in data/cipher, because difficulty is defined as the size of the
 * consistent set it leaves. CIPHER.md section 8. Solver.ts re-exports this
 * rather than declaring a second copy.
 */
export const OPENING_GUESS: Code = [0, 0, 1, 2];

export function codeIndex(code: Code): number {
  let index = 0;
  for (let i = 0; i < CODE_LENGTH; i += 1) index = index * SYMBOL_COUNT + (code[i] as number);
  return index;
}

export function codeAt(index: number): Code {
  if (!Number.isInteger(index) || index < 0 || index >= CODE_SPACE) {
    throw new RangeError(`code index out of range: ${String(index)}`);
  }
  const code: number[] = [];
  let rest = index;
  for (let i = CODE_LENGTH - 1; i >= 0; i -= 1) {
    code[i] = rest % SYMBOL_COUNT;
    rest = Math.floor(rest / SYMBOL_COUNT);
  }
  return code;
}

/**
 * The difficulty integer for a code: how many of the 1,296 codes survive the
 * opening's feedback. Table free, so the browser pays 1,296 feedback
 * evaluations, measured at under a millisecond, instead of carrying a 1.7
 * megabyte array it would use once per finished game.
 */
export function remainingAfterOpening(code: Code, opening: Code = OPENING_GUESS): number {
  const target = scoreGuess(code, opening);
  let count = 0;
  for (let index = 0; index < CODE_SPACE; index += 1) {
    const feedback = scoreGuess(codeAt(index), opening);
    if (feedback.exact === target.exact && feedback.misplaced === target.misplaced) count += 1;
  }
  return count;
}

/* One entry deep. inspect computes the difficulty only on the terminal branch,
   but the end screen re-renders, and re-running the measure for a code that has
   not changed is work nobody asked for. */
let memoKey = "";
let memoValue = 0;

/** The memoized measure against the fixed opening. What the module calls. */
export function difficultyOf(code: Code): number {
  const key = code.join("");
  if (key !== memoKey) {
    memoValue = remainingAfterOpening(code);
    memoKey = key;
  }
  return memoValue;
}
