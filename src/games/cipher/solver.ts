/**
 * Layer 4. Knuth style minimax over the 1,296 code space, used by the
 * generator, by verification, and by nothing in the browser.
 *
 * The whole feedback relation is 1,296 by 1,296, which is under two megabytes
 * as bytes. Precomputing it turns every later ply into array indexing, which is
 * what makes verifying a full year take seconds and lets the tests cover the
 * entire code space rather than a sample.
 */

import {
  CODE_LENGTH,
  CODE_SPACE,
  MAX_GUESSES,
  SYMBOL_COUNT,
  scoreGuess,
  solvedBy,
  type Code,
  type Feedback,
} from "./rules.js";

/**
 * Fixed before the horizon was generated. Changing it invalidates every stored
 * difficulty in data/cipher, because difficulty is defined as the size of the
 * consistent set it leaves. CIPHER.md section 8.
 */
export const OPENING_GUESS: Code = [0, 0, 1, 2];

/** exact and misplaced both fit in 0..4, so five buckets each. */
const FEEDBACK_KEYS = (CODE_LENGTH + 1) * (CODE_LENGTH + 1);

export function feedbackKey(feedback: Feedback): number {
  return feedback.exact * (CODE_LENGTH + 1) + feedback.misplaced;
}

export function codeIndex(code: Code): number {
  let index = 0;
  for (let i = 0; i < CODE_LENGTH; i += 1) index = index * SYMBOL_COUNT + (code[i] as number);
  return index;
}

export function codeAt(index: number): Code {
  if (!Number.isInteger(index) || index < 0 || index >= CODE_SPACE) {
    throw new RangeError(`code index out of range: ${index}`);
  }
  const code: number[] = [];
  let rest = index;
  for (let i = CODE_LENGTH - 1; i >= 0; i -= 1) {
    code[i] = rest % SYMBOL_COUNT;
    rest = Math.floor(rest / SYMBOL_COUNT);
  }
  return code;
}

export const ALL_CODES: readonly Code[] = Array.from({ length: CODE_SPACE }, (_, i) => codeAt(i));

let table: Uint8Array | null = null;

/** Built once per process. Row is the answer, column is the guess. */
function feedbackTable(): Uint8Array {
  if (table !== null) return table;
  const built = new Uint8Array(CODE_SPACE * CODE_SPACE);
  for (let answer = 0; answer < CODE_SPACE; answer += 1) {
    const answerCode = ALL_CODES[answer] as Code;
    for (let guess = answer; guess < CODE_SPACE; guess += 1) {
      const key = feedbackKey(scoreGuess(answerCode, ALL_CODES[guess] as Code));
      built[answer * CODE_SPACE + guess] = key;
      // Feedback is symmetric in exact and in misplaced, so half the work.
      built[guess * CODE_SPACE + answer] = key;
    }
  }
  table = built;
  return built;
}

export function keyFor(answer: number, guess: number): number {
  return feedbackTable()[answer * CODE_SPACE + guess] as number;
}

export function filterConsistent(
  candidates: readonly number[],
  guess: number,
  key: number,
): number[] {
  return candidates.filter((candidate) => keyFor(candidate, guess) === key);
}

/**
 * Knuth minimax with two deterministic tie breaks: a guess that could itself be
 * the answer wins, then the lower code index wins. Determinism matters more
 * than strength here, because the stored difficulty and the stored line length
 * must be reproducible by verification.
 */
export function chooseGuess(candidates: readonly number[]): number {
  if (candidates.length === 0) throw new RangeError("no candidates remain");
  if (candidates.length === 1) return candidates[0] as number;

  const counts = new Int32Array(FEEDBACK_KEYS);
  const candidateSet = new Set(candidates);
  let bestGuess = -1;
  let bestWorst = Number.POSITIVE_INFINITY;
  let bestIsCandidate = false;

  for (let guess = 0; guess < CODE_SPACE; guess += 1) {
    counts.fill(0);
    let worst = 0;
    for (const candidate of candidates) {
      const key = keyFor(candidate, guess);
      const next = (counts[key] as number) + 1;
      counts[key] = next;
      if (next > worst) worst = next;
    }
    const isCandidate = candidateSet.has(guess);
    if (worst < bestWorst || (worst === bestWorst && isCandidate && !bestIsCandidate)) {
      bestGuess = guess;
      bestWorst = worst;
      bestIsCandidate = isCandidate;
    }
  }
  return bestGuess;
}

/** The guesses the solver makes, opening included, ending with the answer. */
export function solveLine(answer: number, opening: Code = OPENING_GUESS): readonly number[] {
  const openingIndex = codeIndex(opening);
  const line: number[] = [openingIndex];
  if (openingIndex === answer) return line;

  let candidates = filterConsistent(
    ALL_CODES.map((_, index) => index),
    openingIndex,
    keyFor(answer, openingIndex),
  );

  while (line.length < MAX_GUESSES) {
    const guess = chooseGuess(candidates);
    line.push(guess);
    if (guess === answer) return line;
    candidates = filterConsistent(candidates, guess, keyFor(answer, guess));
  }
  // Unreachable for the four by six game, where Knuth's bound is five. Returned
  // rather than thrown so verification reports it as an assertion failure with
  // the day attached instead of a stack trace.
  return line;
}

/** Assertion 3's difficulty integer: codes still consistent after the opening. */
export function remainingAfterOpening(answer: number, opening: Code = OPENING_GUESS): number {
  const openingIndex = codeIndex(opening);
  const key = keyFor(answer, openingIndex);
  let count = 0;
  for (let candidate = 0; candidate < CODE_SPACE; candidate += 1) {
    if (keyFor(candidate, openingIndex) === key) count += 1;
  }
  return count;
}

export function isSolvedLine(answer: number, line: readonly number[]): boolean {
  return line.length > 0 && line[line.length - 1] === answer && line.length <= MAX_GUESSES;
}

export function feedbackFor(answer: number, guess: number): Feedback {
  const key = keyFor(answer, guess);
  return { exact: Math.floor(key / (CODE_LENGTH + 1)), misplaced: key % (CODE_LENGTH + 1) };
}

export function lineSolves(answer: number, opening: Code = OPENING_GUESS): boolean {
  return isSolvedLine(answer, solveLine(answer, opening));
}

export function opensSolved(answer: number, opening: Code = OPENING_GUESS): boolean {
  return solvedBy(feedbackFor(answer, codeIndex(opening)));
}
