/**
 * Layer 4. DIFFERENCE RELAY primitives. DIFFERENCE-RELAY.md sections 6.1 and 6.2.
 *
 * Pure geometry of a line of stations and the differences between them. No DOM,
 * no clock, no randomness. The relay walk, the difference reading, and the
 * permutation enumeration live here so that both the solver and the independent
 * verifier can read the same rule without importing each other.
 */

export const STATIONS = 6;
export const GAPS = STATIONS - 1;
export const MAX_RUNS = 6;
export const VALUE_MIN = 1;
export const VALUE_MAX = 9;

/** A hidden gap carries no readable difference. Distinct numbers never differ
 *  by zero, so 0 is a safe hidden sentinel in the obfuscated manifest payload. */
export const HIDDEN = null;

/** The five absolute neighbour differences of an order, left to right. */
export function diffsOf(order: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < GAPS; i += 1) out.push(Math.abs((order[i] as number) - (order[i + 1] as number)));
  return out;
}

/**
 * DIFFERENCE-RELAY.md 6.2. The baton crosses gaps left to right while each
 * neighbour difference matches the true difference, and stops at the first that
 * does not. Depth is the count of gaps crossed, so a full crossing is GAPS.
 */
export function relayDepth(order: readonly number[], trueDiffs: readonly number[]): number {
  for (let i = 0; i < GAPS; i += 1) {
    if (Math.abs((order[i] as number) - (order[i + 1] as number)) !== (trueDiffs[i] as number)) return i;
  }
  return GAPS;
}

/** True when `order` satisfies every visible mark, ignoring the hidden gaps. */
export function satisfiesVisible(order: readonly number[], marks: readonly (number | null)[]): boolean {
  for (let i = 0; i < GAPS; i += 1) {
    const mark = marks[i];
    if (mark === null) continue;
    if (Math.abs((order[i] as number) - (order[i + 1] as number)) !== mark) return false;
  }
  return true;
}

/** All orders of the numbers, 720 of them for six distinct values. */
export function permutations(numbers: readonly number[]): number[][] {
  const out: number[][] = [];
  const current: number[] = [];
  const used = new Array<boolean>(numbers.length).fill(false);
  const walk = (): void => {
    if (current.length === numbers.length) {
      out.push(current.slice());
      return;
    }
    for (let i = 0; i < numbers.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      current.push(numbers[i] as number);
      walk();
      current.pop();
      used[i] = false;
    }
  };
  walk();
  return out;
}

/** A stable key for an order, used to compare and to reject a repeated run. */
export function orderKey(order: readonly number[]): string {
  return order.join(",");
}

export function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function sameDiffs(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < GAPS; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/** True when `order` is a permutation of exactly the multiset `numbers`. */
export function isPermutationOf(order: readonly number[], numbers: readonly number[]): boolean {
  if (order.length !== numbers.length) return false;
  const want = [...numbers].sort((x, y) => x - y);
  const have = [...order].sort((x, y) => x - y);
  for (let i = 0; i < want.length; i += 1) if (want[i] !== have[i]) return false;
  return true;
}

/** The distinct values of a valid puzzle, sorted, derived from its target. */
export function numbersOf(target: readonly number[]): number[] {
  return [...target].sort((a, b) => a - b);
}
