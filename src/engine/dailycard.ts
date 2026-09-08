/**
 * Layer 1. Requirement 7.3.5, the daily card.
 *
 * The suite's one growth asset that no single game product can produce. A
 * player who finished three games gets one block covering all three, and a
 * reader who sees it learns that DAILYKIT is five games rather than one.
 *
 * It lives in Layer 1 rather than in the hub because it is share assembly, and
 * every other piece of share assembly is here. The hub supplies facts and gets
 * a ShareBlock back, which is the same arrangement a game module has.
 */

import type { ShareBlock, ShareRow } from "../core/types.js";
import type { ShareToken } from "../shared/share-vocabulary.js";
import { TIER_COUNT, TIER_NAMES, type TierIndex } from "./tiers.js";
import { TIER_TOKENS } from "../shared/share-vocabulary.js";

/**
 * Five cells per row, one per tier band. A row is the game's tier token
 * repeated once for every band at or below the one earned, so Excellent fills
 * the row and Rough fills one cell. The block therefore reads as a bar chart of
 * the day at a glance, which is requirement 7.3.5's "compact row" and 3.5.6's
 * "reads visually" in one shape.
 *
 * Width is TIER_COUNT and not an independent constant, because a sixth tier
 * would otherwise silently produce a row that cannot represent it.
 */
export const DAILY_CARD_WIDTH = TIER_COUNT;

/** One finished game on one day. Assembled by the hub from stored results. */
export interface DailyCardEntry {
  readonly gameId: string;
  /** Null past a game's manifest horizon, where no stored optimum exists and
   *  there is nothing to grade against. Resolution 3. */
  readonly tier: TierIndex | null;
}

export interface DailyCardInput {
  /** Local calendar date, formatted by the caller. The daily card has no
   *  puzzle number of its own because its games do not share an epoch. */
  readonly date: string;
  /** Registry order, so two players on the same day produce rows in the same
   *  order and the blocks are comparable. Only finished games appear. */
  readonly finished: readonly DailyCardEntry[];
  readonly totalGames: number;
  /** Consecutive days with at least one game finished. Requirement 7.3.4. */
  readonly suiteStreak: number;
}

/**
 * An ungraded game is one filled cell of the neutral bar token rather than a
 * tier glyph. It is not a Rough result and must not read as one.
 */
export function dailyCardRow(tier: TierIndex | null): ShareRow {
  const token: ShareToken = tier === null ? "barFull" : TIER_TOKENS[tier]!;
  const filled = tier === null ? 1 : DAILY_CARD_WIDTH - tier;
  const row: ShareToken[] = [];
  for (let i = 0; i < DAILY_CARD_WIDTH; i += 1) row.push(i < filled ? token : "barEmpty");
  return row;
}

export function dailyCardTitle(input: DailyCardInput): string {
  const streak = input.suiteStreak >= 2 ? ` streak ${input.suiteStreak}` : "";
  return `DAILYKIT ${input.date} ${input.finished.length}/${input.totalGames}${streak}`;
}

/**
 * Returns null when nothing was finished today. A card with no rows is a title
 * and a URL, which is an advertisement rather than a result, and the hub hides
 * the share control instead of offering one.
 */
export function dailyCardBlock(input: DailyCardInput): ShareBlock | null {
  if (input.finished.length === 0) return null;
  return {
    title: dailyCardTitle(input),
    rows: input.finished.map((entry) => dailyCardRow(entry.tier)),
  };
}

/** The accessible text equivalent, for the live region and for the hub's own
 *  screen reader summary. Requirement 8.1 forbids the glyph block alone. */
export function dailyCardSummary(input: DailyCardInput): string {
  if (input.finished.length === 0) return "No games finished yet today.";
  const parts = input.finished.map((entry) =>
    entry.tier === null ? `${entry.gameId} unrated` : `${entry.gameId} ${TIER_NAMES[entry.tier]}`,
  );
  return `${input.finished.length} of ${input.totalGames} finished. ${parts.join(", ")}.`;
}
