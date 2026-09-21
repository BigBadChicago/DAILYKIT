/**
 * Layer 4. The FIVE LETTERS witness solver. FIVE-LETTERS.md sections 9 to 11.
 * Node only: the generator and the calibration study import it, the module
 * never does, and the independent verifier writes its own copy of the search.
 *
 * The candidate space is the accepted list, the same list the browser accepts
 * guesses from, because a player knows only that the answer is a word. The
 * witness opens with the fixed opening, then plays greedily: the guess, from the
 * whole accepted list, that minimises the sum of squared partition sizes over
 * the candidates still consistent, ties to a guess that could itself be the
 * answer, then to the earlier word alphabetically. Deterministic, so a day's
 * witness path is a fact the verifier can recompute.
 */

import { MAX_GUESSES, SOLVED_PATTERN, PATTERN_COUNT, patternOf } from "./feedback.js";

export interface Search {
  readonly words: readonly string[];
  readonly index: ReadonlyMap<string, number>;
  /** patterns[g * n + a]: the pattern guess g earns against answer a. */
  readonly patterns: Uint8Array;
}

export function buildSearch(words: readonly string[]): Search {
  const n = words.length;
  const patterns = new Uint8Array(n * n);
  for (let g = 0; g < n; g += 1) {
    const guess = words[g] as string;
    for (let a = 0; a < n; a += 1) patterns[g * n + a] = patternOf(words[a] as string, guess);
  }
  return { words, index: new Map(words.map((word, i) => [word, i])), patterns };
}

/** Candidates that answer every step of the given history the same way. */
export function partition(search: Search, guess: number, candidates: readonly number[]): Map<number, number[]> {
  const n = search.words.length;
  const parts = new Map<number, number[]>();
  for (const a of candidates) {
    const pattern = search.patterns[guess * n + a] as number;
    const part = parts.get(pattern);
    if (part === undefined) parts.set(pattern, [a]);
    else part.push(a);
  }
  return parts;
}

/** Sum of squared partition sizes: n times the expected candidates left. */
export function spread(search: Search, guess: number, candidates: readonly number[], counts: Int32Array): number {
  const n = search.words.length;
  counts.fill(0);
  let sum = 0;
  for (const a of candidates) {
    const pattern = search.patterns[guess * n + a] as number;
    const before = counts[pattern] as number;
    sum += 2 * before + 1;
    counts[pattern] = before + 1;
  }
  return sum;
}

export function bestGuess(search: Search, candidates: readonly number[]): number {
  if (candidates.length <= 2) return candidates[0] as number;
  const counts = new Int32Array(PATTERN_COUNT);
  const inSet = new Set(candidates);
  let best = -1;
  let bestSpread = Infinity;
  for (let g = 0; g < search.words.length; g += 1) {
    const value = spread(search, g, candidates, counts);
    if (value < bestSpread || (value === bestSpread && inSet.has(g) && !inSet.has(best))) {
      best = g;
      bestSpread = value;
    }
  }
  return best;
}

export interface Opening {
  readonly word: string;
  /** Expected candidates left, over the whole accepted list. */
  readonly expected: number;
}

/** The ideal opening: the guess with the smallest expected candidates left. */
export function idealOpening(search: Search): Opening {
  const all = search.words.map((_, i) => i);
  const g = bestGuess(search, all);
  const counts = new Int32Array(PATTERN_COUNT);
  return { word: search.words[g] as string, expected: spread(search, g, all, counts) / all.length };
}

/** Candidates left after the opening, for one answer: the section 14 integer. */
export function candidatesAfter(search: Search, opening: string, answer: string): number {
  const n = search.words.length;
  const g = search.index.get(opening) as number;
  const a = search.index.get(answer) as number;
  const target = search.patterns[g * n + a];
  let count = 0;
  for (let c = 0; c < n; c += 1) if (search.patterns[g * n + c] === target) count += 1;
  return count;
}

/**
 * A memoised greedy tree, so every answer's path is read off one tree rather
 * than searched again: a node is keyed by the history of patterns that led to it.
 */
export class Witness {
  private readonly next = new Map<string, number>();

  constructor(
    readonly search: Search,
    readonly opening: string,
  ) {}

  /** The witness's guesses for one answer, ending on the answer itself. */
  path(answer: string): string[] {
    const n = this.search.words.length;
    const a = this.search.index.get(answer);
    if (a === undefined) throw new Error(`${answer} is not in the search list`);
    let candidates = this.search.words.map((_, i) => i);
    let guess = this.search.index.get(this.opening) as number;
    let key = "";
    const out: string[] = [];
    for (;;) {
      out.push(this.search.words[guess] as string);
      const pattern = this.search.patterns[guess * n + a] as number;
      if (pattern === SOLVED_PATTERN) return out;
      if (out.length > 2 * MAX_GUESSES) throw new Error(`no convergence on ${answer}`);
      candidates = candidates.filter((c) => this.search.patterns[guess * n + c] === pattern);
      key += `${String(pattern)},`;
      let chosen = this.next.get(key);
      if (chosen === undefined) {
        chosen = bestGuess(this.search, candidates);
        this.next.set(key, chosen);
      }
      guess = chosen;
    }
  }
}
