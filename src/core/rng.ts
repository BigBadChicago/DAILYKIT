/**
 * Layer 0. Requirement 4.0.1.
 *
 * Every arithmetic operation in this file is defined by ECMAScript on exact
 * 32 bit integer values: Math.imul, addition followed by | 0, <<, >>>, and ^.
 * No step depends on floating point rounding, which is what makes the stream
 * byte identical in Node and in every target browser. Adding an operation
 * outside that set breaks requirement 10.2 silently, so do not.
 */

/**
 * The generator surface. Deliberately one method: every other helper in this
 * file is a pure function over it, so a future generator swap touches one class
 * and the vector table and nothing else.
 */
export interface Rng {
  /** Advances the generator and returns the next value in [0, 2^32). */
  nextUint32(): number;
}

/**
 * sfc32. Chosen over mulberry32 for state size, not for output quality.
 *
 * A 32 bit state generator has 2^32 distinct streams in total. This project
 * consumes seeds across five games, a daily puzzle each, plus a salt per
 * rejected board under requirement 6.3.5, for as long as the suite runs. The
 * 128 bit state removes the collision ceiling permanently at a cost of three
 * extra integer additions per draw, which is invisible against the roughly
 * 10^3 evaluator calls the solver makes per board.
 */
class Sfc32 implements Rng {
  private a: number;

  private b: number;

  private c: number;

  private d: number;

  constructor(a: number, b: number, c: number, d: number) {
    this.a = a | 0;
    this.b = b | 0;
    this.c = c | 0;
    this.d = d | 0;
  }

  nextUint32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }
}

/** Raw construction from four state words. Callers outside seed.ts want
 *  rngFromSeed instead, which warms the state up. */
export function createRng(a: number, b: number, c: number, d: number): Rng {
  return new Sfc32(a, b, c, d);
}

/** Exact: 2^32 is a power of two, so the quotient is representable without
 *  rounding and the result is identical on every engine. */
export function nextFloat(rng: Rng): number {
  return rng.nextUint32() / 4294967296;
}

/**
 * Uniform integer in [0, bound). Rejection sampled, never `% bound`.
 *
 * Modulo skews the low residues whenever bound does not divide 2^32, by about
 * one part in 10^8 for a 52 card draw. That is negligible for play and not
 * negligible for Phase 7, which sets the entire scoring table from measured
 * hand availability over ten thousand boards. A systematic bias does not
 * average out across samples, it accumulates, so HAND_POINTS would inherit the
 * error permanently and nothing downstream would ever catch it. The fix costs
 * one comparison and, on average, well under one extra draw.
 */
export function intBelow(rng: Rng, bound: number): number {
  if (!Number.isInteger(bound) || bound < 1 || bound > 4294967296) {
    throw new RangeError(`intBelow bound must be an integer in [1, 2^32], got ${bound}`);
  }
  const limit = 4294967296 - (4294967296 % bound);
  let x = rng.nextUint32();
  while (x >= limit) x = rng.nextUint32();
  return x % bound;
}

/** Uniform integer in [min, max], both inclusive. */
export function intInRange(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`intInRange needs integers, got ${min}, ${max}`);
  }
  if (max < min) {
    throw new RangeError(`intInRange max below min, got ${min}, ${max}`);
  }
  return min + intBelow(rng, max - min + 1);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError("pick from empty array");
  return items[intBelow(rng, items.length)] as T;
}

/** Fisher Yates, descending. In place. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = intBelow(rng, i + 1);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
}

/** Copying form, for the readonly deck constant the generator draws from. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  return shuffle(rng, items.slice());
}

/**
 * Weights are non negative integers, not floats, so the selection is a single
 * intBelow over the total and no floating point comparison enters a code path
 * that must be reproducible. The generator levers of requirement 6.3.6 are
 * expressed as integer ratios for this reason.
 */
export function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weights: readonly number[],
): T {
  if (items.length !== weights.length) {
    throw new RangeError(`weightedPick length mismatch, ${items.length} vs ${weights.length}`);
  }
  let total = 0;
  for (const w of weights) {
    if (!Number.isInteger(w) || w < 0) {
      throw new RangeError(`weightedPick weights must be non negative integers, got ${w}`);
    }
    total += w;
  }
  if (total === 0) throw new RangeError("weightedPick total weight is zero");

  let target = intBelow(rng, total);
  for (let i = 0; i < items.length; i += 1) {
    target -= weights[i] as number;
    if (target < 0) return items[i] as T;
  }
  /* Unreachable: target starts below total and every weight is subtracted. */
  throw new Error("weightedPick fell through");
}
