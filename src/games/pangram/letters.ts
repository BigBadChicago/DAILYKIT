/**
 * Layer 4. PANGRAM primitives. PANGRAM.md sections 1, 3 and 18.
 *
 * Pure letter set arithmetic shared by the rules, the solver and the generator,
 * so none of them imports another to reach it. No DOM, no clock, no randomness.
 * The independent verifier reimplements every rule here from the document and
 * never imports this file.
 */

/** Letters in a day's set. */
export const SET_SIZE = 7;
/** Shortest word that counts. */
export const MIN_LENGTH = 4;
/** Longest word the renderer lets a player type. The committed accepted list
 *  tops out at fifteen letters (PANGRAM.md 30), so nothing real is cut off. */
export const MAX_LENGTH = 19;
/** Added to a pangram's length score. */
export const PANGRAM_BONUS = 7;
/** Never in a day's set: every plural would double the day (PANGRAM.md 6a). */
export const EXCLUDED_LETTER = "s";
/** A day's answer count must fall in this window, PANGRAM.md 6 and 7. */
export const COUNT_MIN = 20;
export const COUNT_MAX = 80;
/** Fairness, PANGRAM.md 11: familiar words must carry at least this percentage
 *  of the day's total score, above the top tier's threshold below. */
export const FAMILIAR_SHARE_MIN = 65;

/**
 * Tier thresholds as whole percentages of the day's total. Tier 0 also needs a
 * pangram, which is what makes the game's namesake load bearing. PANGRAM.md 18.
 */
export const TIER_PERCENT: readonly number[] = [60, 40, 25, 10];

/** Bit per letter, a is bit 0. */
export function maskOf(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i += 1) mask |= 1 << (word.charCodeAt(i) - 97);
  return mask;
}

export function bitCount(mask: number): number {
  let count = 0;
  let rest = mask;
  while (rest !== 0) {
    rest &= rest - 1;
    count += 1;
  }
  return count;
}

/** One point per letter beyond three, and seven more for a pangram. */
export function scoreOf(word: string, rootMask: number): number {
  const base = word.length - (MIN_LENGTH - 1);
  return maskOf(word) === rootMask ? base + PANGRAM_BONUS : base;
}

export function isPangram(word: string, rootMask: number): boolean {
  return maskOf(word) === rootMask;
}

/** True when the word could be an answer for this set: long enough, only set
 *  letters, and the centre letter present. Whether it is a real word is the
 *  day's answer list's question. */
export function fitsSet(word: string, rootMask: number, centreMask: number): boolean {
  if (word.length < MIN_LENGTH || !/^[a-z]+$/.test(word)) return false;
  const mask = maskOf(word);
  return (mask & ~rootMask) === 0 && (mask & centreMask) !== 0;
}

/** Score needed for a tier's threshold, rounded up so the threshold is met
 *  exactly when score times 100 reaches percent times total. */
export function thresholdFor(percent: number, total: number): number {
  return Math.ceil((percent * total) / 100);
}
