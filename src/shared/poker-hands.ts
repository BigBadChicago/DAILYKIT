/** Shared poker hand categories. Point values belong to POKER GRID, not here. */

import type { TierToken } from "./share-vocabulary.js";

export const HAND_CATEGORIES = [
  "high-card",
  "one-pair",
  "two-pair",
  "three-of-a-kind",
  "straight",
  "flush",
  "full-house",
  "four-of-a-kind",
  "straight-flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];
export type HandOrdinal = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const HAND_ORDINAL: Readonly<Record<HandCategory, HandOrdinal>> = {
  "high-card": 0,
  "one-pair": 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  "four-of-a-kind": 7,
  "straight-flush": 8,
};

export const HAND_SHARE_TIER: Readonly<Record<Exclude<HandCategory, "high-card">, TierToken>> = {
  "one-pair": "weak",
  "two-pair": "weak",
  "three-of-a-kind": "partial",
  straight: "partial",
  flush: "strong",
  "full-house": "strong",
  "four-of-a-kind": "best",
  "straight-flush": "best",
};

export function categoryFromOrdinal(value: number): HandCategory | null {
  return Number.isInteger(value) && value >= 0 && value < HAND_CATEGORIES.length
    ? HAND_CATEGORIES[value as HandOrdinal] ?? null
    : null;
}

export function isLegalCategory(category: HandCategory): category is Exclude<HandCategory, "high-card"> {
  return category !== "high-card";
}
