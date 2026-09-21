/**
 * Layer 4. The FIVE LETTERS difficulty integer. FIVE-LETTERS.md 14.
 *
 * Candidates left after the fixed opening: how many accepted words earn the same
 * marks against OPENING as the answer does. Computed on the device from the
 * shipped list, never read from the manifest, so a hand edited entry cannot lie
 * about its day (ARCHITECTURE2 section 52, risk 2). The manifest's stored figure
 * is only compared against it.
 */

import { patternOf } from "./feedback.js";

/** The ideal opening over the accepted list, measured in FIVE-LETTERS.md 30. A
 *  constant, because changing it changes every stored difficulty. */
export const OPENING = "tares";

export function candidatesAfterOpening(answer: string, accepted: readonly string[], opening: string = OPENING): number {
  const target = patternOf(answer, opening);
  let count = 0;
  for (const word of accepted) if (patternOf(word, opening) === target) count += 1;
  return count;
}
