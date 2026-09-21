/**
 * Layer 4. FIVE LETTERS difficulty bands and the weekly curve. FIVE-LETTERS.md 14 to 16.
 *
 * Shared by the generator and the tests; the module needs neither. The
 * independent verifier reads the edges from data/five-letters/study.json, and a
 * generator test holds these to that file.
 */

/** Upper edges of bands 0 to 5 over candidates left after the opening; band 6 is
 *  everything above. Septiles over the whole answer pool, written by
 *  tools/five-letters-calibrate.ts. Changing one is a manifest regeneration. */
export const BAND_EDGES: readonly number[] = [15, 28, 56, 90, 109, 174];

/** Band per weekday, 0 Monday through 6 Sunday, the suite's weekly curve. */
export const WEEKDAY_BAND: readonly number[] = [0, 1, 2, 3, 5, 6, 4];

/** Epoch 2026-01-05 is a Monday, so puzzle 1 is a Monday. */
export function weekdayOf(puzzleNumber: number): number {
  return (puzzleNumber - 1) % 7;
}

export function bandOfWith(edges: readonly number[], difficulty: number): number {
  let band = 0;
  while (band < edges.length && difficulty > (edges[band] as number)) band += 1;
  return band;
}

export function bandOf(difficulty: number): number {
  return bandOfWith(BAND_EDGES, difficulty);
}

export function bandForPuzzle(puzzleNumber: number): number {
  return WEEKDAY_BAND[weekdayOf(puzzleNumber)] as number;
}

/** Septile edges of a sample, the rule the study applies. */
export function septiles(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return [1, 2, 3, 4, 5, 6].map((k) => sorted[Math.floor((k * sorted.length) / 7)] as number);
}
