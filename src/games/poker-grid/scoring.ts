import type { HandCategory } from "../../shared/poker-hands.js";
import { HAND_SIZE } from "./evaluator.js";

export type ScoringCategory = Exclude<HandCategory, "high-card">;

/* Locked decision 5. These values are not poker odds. They are derived from
   the measured availability of each category among connected five cell
   selections, which is a different distribution: 84.7 percent of all legal
   selections on a fresh board are a bare pair, and a straight flush appears
   in three legal selections in every hundred thousand.
   
   Raw inverse availability spans four orders of magnitude and would let one
   premium hand outweigh clearing the board, so the ratios are compressed by
   the exponent below and then rounded for feel. The exponent is chosen so the
   rarest category lands at STRAIGHT_FLUSH_CEILING, which is the largest value
   the clearing dominance invariant in POKER-GRID.md admits.
   
   Regenerate with `npm run poker-grid:calibrate`. The study that produced
   these numbers is checked in at data/poker-grid/calibration.json. */
export const CALIBRATION = {
  samples: 10_000,
  selections: 9_610_000,
  compressionExponent: 0.2583,
  measuredShareOfLegal: {
    "one-pair": 0.846752,
    "two-pair": 0.095432,
    "three-of-a-kind": 0.042617,
    straight: 0.007833,
    flush: 0.003910,
    "full-house": 0.002934,
    "four-of-a-kind": 0.000491,
    "straight-flush": 0.000031,
  },
} as const;

export const HAND_POINTS: Readonly<Record<ScoringCategory, number>> = {
  "one-pair": 10,
  "two-pair": 18,
  "three-of-a-kind": 22,
  straight: 34,
  flush: 40,
  "full-house": 45,
  "four-of-a-kind": 70,
  "straight-flush": 140,
};

export const HAND_POINTS_FLOOR = HAND_POINTS["one-pair"];
export const HAND_POINTS_CEILING = HAND_POINTS["straight-flush"];

/* Locked decision 5, second sub rule. Clearing five more cards must beat any
   quality advantage available to a shorter game. Asserted in scoring.test.ts
   for every hand count, where the binding case is a seventh hand of bare pairs
   against six straight flushes. */
export const CARD_CLEAR_POINTS = 160;
export const CLEAR_VALUE_PER_HAND = CARD_CLEAR_POINTS * HAND_SIZE;
export const TIER_QUALITY_THRESHOLD = 0.85;

export function pointsFor(category: ScoringCategory): number {
  return HAND_POINTS[category];
}

export function scoreHands(
  hands: readonly { readonly category: ScoringCategory; readonly points: number }[],
): number {
  return hands.reduce((score, hand) => score + hand.points + CLEAR_VALUE_PER_HAND, 0);
}

export function tierFor(
  best: { readonly score: number; readonly hands: number } | null,
  playedHands: readonly { readonly points: number }[],
  score: number,
): 0 | 1 | 2 | 3 | 4 | null {
  if (best === null) return null;
  const deficit = Math.max(0, best.hands - playedHands.length);
  if (deficit >= 3) return 4;
  if (deficit === 2) return 3;
  if (deficit === 1) return 2;
  const playerHandPoints = score - CLEAR_VALUE_PER_HAND * playedHands.length;
  const bestHandPoints = best.score - CLEAR_VALUE_PER_HAND * best.hands;
  const quality = bestHandPoints <= 0 ? 1 : Math.min(1, playerHandPoints / bestHandPoints);
  return quality >= TIER_QUALITY_THRESHOLD ? 0 : 1;
}
