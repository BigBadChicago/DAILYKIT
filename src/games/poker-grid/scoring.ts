import type { HandCategory } from "../../shared/poker-hands.js";

export const HAND_POINTS: Readonly<Record<Exclude<HandCategory, "high-card">, number>> = {
  "one-pair": 10,
  "two-pair": 25,
  "three-of-a-kind": 40,
  straight: 55,
  flush: 70,
  "full-house": 80,
  "four-of-a-kind": 90,
  "straight-flush": 100,
};

export const CARD_CLEAR_POINTS = 160;
export const TIER_QUALITY_THRESHOLD = 0.85;

export function pointsFor(category: Exclude<HandCategory, "high-card">): number {
  return HAND_POINTS[category];
}

export function scoreHands(
  hands: readonly { readonly category: Exclude<HandCategory, "high-card">; readonly points: number }[],
): number {
  return hands.reduce((score, hand) => score + hand.points + CARD_CLEAR_POINTS * 5, 0);
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
  const playerHandPoints = score - CARD_CLEAR_POINTS * 5 * playedHands.length;
  const bestHandPoints = best.score - CARD_CLEAR_POINTS * 5 * best.hands;
  const quality = bestHandPoints <= 0 ? 1 : Math.min(1, playerHandPoints / bestHandPoints);
  return quality >= TIER_QUALITY_THRESHOLD ? 0 : 1;
}
