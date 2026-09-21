/**
 * Layer 4. PANGRAM difficulty bands and the weekly curve. PANGRAM.md 14 to 16.
 *
 * Its own file so the generator and the tests share one copy and the module,
 * which needs neither, imports nothing it does not use. The independent
 * verifier reads the edges from data/pangram/study.json instead, and a
 * generator test holds these to that file.
 */

/**
 * Upper edges of bands 0 to 5 over the total available score; band 6 is
 * everything above. Septiles of the screened sample written by
 * tools/pangram-calibrate.ts. Changing an edge invalidates every stored band,
 * so it is a manifest regeneration, not a tweak.
 */
export const BAND_EDGES: readonly number[] = [75, 96, 120, 145, 171, 207];

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
