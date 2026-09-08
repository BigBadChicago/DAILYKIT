/**
 * Layer 1. Charter decision 8, approved.
 *
 * Suite wide, not per game. A reader who sees two DAILYKIT share blocks in a
 * group chat must read the same five words meaning the same five bands.
 *
 * These names are load bearing for requirement 11.7: they are the strings most
 * likely to need extraction first, so they live in one array and are never
 * inlined at a call site.
 */

export const TIER_NAMES = ["Excellent", "Great", "Good", "Fair", "Rough"] as const;

export type TierIndex = 0 | 1 | 2 | 3 | 4;

export const TIER_COUNT = TIER_NAMES.length;

/**
 * Used in the share title and the end screen where no stored optimum exists.
 * Lowercase on purpose: it sits where a tier name sits, and a capitalized word
 * there reads as a grade the player earned rather than as the absence of one.
 */
export const UNRATED_LABEL = "unrated";

export function isTierIndex(value: number): value is TierIndex {
  return Number.isInteger(value) && value >= 0 && value < TIER_COUNT;
}

export function tierName(index: TierIndex): string {
  return TIER_NAMES[index];
}

/**
 * The one place a null tier becomes a string. Past the manifest horizon a board
 * has no stored optimum, so there is nothing to grade against and the label is
 * the honest answer rather than a default of Rough.
 */
export function tierLabel(index: TierIndex | null): string {
  return index === null ? UNRATED_LABEL : TIER_NAMES[index];
}

/**
 * Compile time link to the Layer 0 mirror. If TierOrdinal and TierIndex ever
 * drift, this assignment stops compiling, which is the only guard the layer
 * rule permits.
 */
import type { TierOrdinal } from "../core/types.js";

const _tierWidthsAgree: TierOrdinal extends TierIndex
  ? TierIndex extends TierOrdinal
    ? true
    : never
  : never = true;
void _tierWidthsAgree;
