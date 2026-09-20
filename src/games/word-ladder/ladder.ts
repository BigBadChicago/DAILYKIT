/**
 * Layer 4. WORD LADDER primitives. WORD-LADDER.md sections 3, 8 and 9.
 *
 * Pure graph of four letter words under the one letter change relation. No DOM,
 * no clock, no randomness. The graph build, the breadth first search and the
 * rung test live here so the rules, the solver and the independent verifier can
 * read the same relation without importing each other.
 */

export const WORD_LENGTH = 4;
/** Rungs shown in the share block, and the artifact row cap. WORD-LADDER.md 21. */
export const MAX_SHARE_ROWS = 7;
/** Difficulty band count, the suite's seven day curve. */
export const BANDS = 7;

/** True when a and b are both length four and differ in exactly one position. */
export function isOneChange(a: string, b: string): boolean {
  if (a.length !== WORD_LENGTH || b.length !== WORD_LENGTH) return false;
  let diff = 0;
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (a[i] !== b[i]) diff += 1;
    if (diff > 1) return false;
  }
  return diff === 1;
}

/**
 * The one letter change adjacency over a word set. Built once per day and reused
 * by every breadth first search. Keys and values are members of the set only.
 */
export type WordGraph = ReadonlyMap<string, readonly string[]>;

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function buildGraph(words: readonly string[]): WordGraph {
  const set = new Set(words);
  const graph = new Map<string, string[]>();
  for (const word of words) {
    const neighbours: string[] = [];
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      for (const letter of LETTERS) {
        if (letter === word[i]) continue;
        const candidate = word.slice(0, i) + letter + word.slice(i + 1);
        if (set.has(candidate)) neighbours.push(candidate);
      }
    }
    graph.set(word, neighbours);
  }
  return graph;
}

/** Shortest distance in edges from source to every reachable word. */
export function distancesFrom(graph: WordGraph, source: string): ReadonlyMap<string, number> {
  const dist = new Map<string, number>([[source, 0]]);
  const queue: string[] = [source];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head] as string;
    head += 1;
    const here = dist.get(word) as number;
    for (const next of graph.get(word) ?? []) {
      if (!dist.has(next)) {
        dist.set(next, here + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

/** Shortest distance from source to goal, or null when unreachable. */
export function distance(graph: WordGraph, source: string, goal: string): number | null {
  if (source === goal) return 0;
  const dist = new Map<string, number>([[source, 0]]);
  const queue: string[] = [source];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head] as string;
    head += 1;
    const here = dist.get(word) as number;
    for (const next of graph.get(word) ?? []) {
      if (dist.has(next)) continue;
      if (next === goal) return here + 1;
      dist.set(next, here + 1);
      queue.push(next);
    }
  }
  return null;
}

/** The count of accepted words within `radius` of source, the search ball of
 *  WORD-LADDER.md 14. Includes the source itself. */
export function ballSize(graph: WordGraph, source: string, radius: number): number {
  if (radius < 0) return 0;
  let count = 0;
  for (const d of distancesFrom(graph, source).values()) {
    if (d <= radius) count += 1;
  }
  return count;
}

/** Positions where start and goal already differ. Par minus this is the detour
 *  count of WORD-LADDER.md 6a: rungs that must step away letter by letter. */
export function differingPositions(a: string, b: string): number {
  let diff = 0;
  for (let i = 0; i < WORD_LENGTH; i += 1) if (a[i] !== b[i]) diff += 1;
  return diff;
}
