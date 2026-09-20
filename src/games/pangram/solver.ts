/**
 * Layer 4. The day's answers, fairness and difficulty from the word lists.
 * PANGRAM.md sections 8, 9, 11 and 14.
 *
 * Used by the generator, the calibration study and the tests, never by the
 * module: the browser holds no dictionary, only the answers the manifest
 * carries. The enumeration is EXACT, every accepted word checked against the
 * set, so there is no bound and no "best known" label. The independent check is
 * tools/pangram-verify.ts, which never imports this file.
 */

import { SET_SIZE, maskOf, scoreOf } from "./letters.js";

/** The word lists indexed by letter mask, built once per run. */
export interface WordIndex {
  /** Accepted words grouped by the set of letters they use. */
  readonly byMask: ReadonlyMap<number, readonly string[]>;
  readonly familiar: ReadonlySet<string>;
}

export function indexWords(accepted: readonly string[], familiar: readonly string[]): WordIndex {
  const byMask = new Map<number, string[]>();
  for (const word of accepted) {
    const mask = maskOf(word);
    const bucket = byMask.get(mask);
    if (bucket === undefined) byMask.set(mask, [word]);
    else bucket.push(word);
  }
  return { byMask, familiar: new Set(familiar) };
}

export interface DaySolution {
  /** Every accepted word the set admits, alphabetical. */
  readonly answers: readonly string[];
  readonly total: number;
  readonly pangrams: number;
  /** Score available from familiar words alone. */
  readonly familiarTotal: number;
  /** True when at least one pangram is a familiar word. */
  readonly familiarPangram: boolean;
}

/**
 * Every answer for seven letters and a centre. Walks the 64 subsets of the six
 * other letters, each joined with the centre, and reads the words that use
 * exactly that subset, so the cost is 64 map lookups whatever the list size.
 */
export function solveDay(index: WordIndex, letters: string, centre: string): DaySolution {
  const rootMask = maskOf(letters);
  const centreMask = maskOf(centre);
  const others: number[] = [];
  for (const letter of letters) if (letter !== centre) others.push(maskOf(letter));
  const answers: string[] = [];
  for (let pick = 0; pick < 1 << (SET_SIZE - 1); pick += 1) {
    let mask = centreMask;
    for (let i = 0; i < others.length; i += 1) if ((pick >> i) & 1) mask |= others[i] as number;
    for (const word of index.byMask.get(mask) ?? []) answers.push(word);
  }
  answers.sort();
  let total = 0;
  let pangrams = 0;
  let familiarTotal = 0;
  let familiarPangram = false;
  for (const word of answers) {
    const points = scoreOf(word, rootMask);
    total += points;
    const pangram = maskOf(word) === rootMask;
    if (pangram) pangrams += 1;
    if (index.familiar.has(word)) {
      familiarTotal += points;
      if (pangram) familiarPangram = true;
    }
  }
  return { answers, total, pangrams, familiarTotal, familiarPangram };
}

/** Integer percentage test without floating point: familiar at least percent of total. */
export function familiarShareMeets(solution: DaySolution, percent: number): boolean {
  return solution.familiarTotal * 100 >= percent * solution.total;
}

/**
 * Every seven letter set, alphabetical, that some familiar word uses all of and
 * that has no s. These are the only sets a day can be drawn from, because the
 * fairness claim needs a familiar pangram. Sorted, so a draw by index is
 * deterministic.
 */
export function pangramRoots(index: WordIndex, excluded: string): string[] {
  const roots = new Set<string>();
  const excludedMask = maskOf(excluded);
  for (const [mask, words] of index.byMask) {
    if ((mask & excludedMask) !== 0) continue;
    let count = 0;
    for (let rest = mask; rest !== 0; rest &= rest - 1) count += 1;
    if (count !== SET_SIZE) continue;
    if (!words.some((word) => index.familiar.has(word))) continue;
    let letters = "";
    for (let bit = 0; bit < 26; bit += 1) if ((mask >> bit) & 1) letters += String.fromCharCode(97 + bit);
    roots.add(letters);
  }
  return [...roots].sort();
}
