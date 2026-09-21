/**
 * Layer 4. FIVE LETTERS feedback. FIVE-LETTERS.md section 1.
 *
 * Pure. A guess is marked against the answer in two passes, the order that makes
 * repeated letters come out right:
 *
 *   1. every position where the guess letter equals the answer letter is marked
 *      right, and each answer letter not matched that way is counted
 *   2. then, left to right over the positions not marked right, a guess letter is
 *      marked present while the count of that letter is above zero, and the count
 *      falls by one; otherwise it is absent
 *
 * So a letter is marked right or present at most as many times as the answer
 * holds it, exact matches claim their copies first, and among surplus copies
 * the leftmost is the one marked present. Naive single pass marking gets both
 * of those wrong (tests/games/five-letters/feedback.test.ts).
 */

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** 0 absent, 1 present elsewhere, 2 right in this position. */
export type Mark = 0 | 1 | 2;

/** Every mark pattern as one integer, position i weighted by 3^i: 0 to 242. */
export const PATTERN_COUNT = 243;
export const SOLVED_PATTERN = 242;

const CODE_A = 97;

/** Marks for a guess against an answer, both five lowercase letters. */
export function marksFor(answer: string, guess: string): Mark[] {
  const marks: Mark[] = [0, 0, 0, 0, 0];
  const unmatched = new Array<number>(26).fill(0);
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess.charCodeAt(i) === answer.charCodeAt(i)) marks[i] = 2;
    else unmatched[answer.charCodeAt(i) - CODE_A] = (unmatched[answer.charCodeAt(i) - CODE_A] as number) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (marks[i] === 2) continue;
    const letter = guess.charCodeAt(i) - CODE_A;
    const left = unmatched[letter] as number;
    if (left > 0) {
      marks[i] = 1;
      unmatched[letter] = left - 1;
    }
  }
  return marks;
}

export function patternOfMarks(marks: readonly Mark[]): number {
  let pattern = 0;
  for (let i = WORD_LENGTH - 1; i >= 0; i -= 1) pattern = pattern * 3 + (marks[i] as number);
  return pattern;
}

export function marksOfPattern(pattern: number): Mark[] {
  const marks: Mark[] = [];
  let rest = pattern;
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    marks.push((rest % 3) as Mark);
    rest = Math.floor(rest / 3);
  }
  return marks;
}

/** The same two passes without allocating, for the offline search. */
export function patternOf(answer: string, guess: string): number {
  return patternOfMarks(marksFor(answer, guess));
}

/** How many right and how many present, which is all the share row carries. */
export function countsOf(marks: readonly Mark[]): { readonly right: number; readonly present: number } {
  let right = 0;
  let present = 0;
  for (const mark of marks) {
    if (mark === 2) right += 1;
    else if (mark === 1) present += 1;
  }
  return { right, present };
}

export function isWordShape(word: string): boolean {
  return /^[a-z]{5}$/.test(word);
}
