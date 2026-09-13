/**
 * Layer 1. Requirement 7.3.5, the daily card.
 *
 * The suite's one growth asset that no single game product can produce. A
 * player who finished three games gets one block covering the whole day, and a
 * reader who sees it learns that DAILYKIT is eight games rather than one.
 *
 * It lives in Layer 1 rather than in the hub because it is share assembly, and
 * every other piece of share assembly is here. The hub supplies facts and gets
 * a ShareBlock back, which is the same arrangement a game module has.
 */

import type { ShareBlock, ShareRow } from "../core/types.js";
import type { ShareToken } from "../shared/share-vocabulary.js";
import { TIER_NAMES, type TierIndex } from "./tiers.js";
import { TIER_TOKENS } from "../shared/share-vocabulary.js";

/**
 * One glyph per game, in registry order, chunked into rows of this width.
 *
 * This replaces the five cell per game meter, whose arithmetic assumed a five
 * game suite: eight games produced eight rows and a ten line block, over the
 * nine line cap ARCHITECTURE2.md section 49 makes a hard contract. The meter
 * also spent five cells to carry one value between zero and four.
 *
 * Eight is section 49's per row token cap, so a ninth game wraps to a second
 * row rather than breaking the contract.
 */
export const DAILY_CARD_ROW_WIDTH = 8;

export type DailyCardStatus = "graded" | "ungraded" | "unplayed";

/** One game on one day, whether or not the player touched it. */
export interface DailyCardEntry {
  readonly gameId: string;
  readonly status: DailyCardStatus;
  /** Set only when status is "graded". */
  readonly tier: TierIndex | null;
}

export interface DailyCardInput {
  /** Local calendar date, formatted by the caller. The daily card has no
   *  puzzle number of its own because its games do not share an epoch. */
  readonly date: string;
  /** Every suite game, in registry order, so two players on the same day put
   *  the same games in the same positions and their cards compare cell by
   *  cell. Unplayed games are present and rendered as a gap. */
  readonly games: readonly DailyCardEntry[];
  /** Consecutive days with at least one game finished. Requirement 7.3.4. */
  readonly suiteStreak: number;
}

/**
 * An ungraded game is never a tier glyph. Past a game's manifest horizon there
 * is nothing to grade against, and rendering that as Rough would be a lie the
 * player cannot check. It is also not the unplayed mark, because finishing a
 * game and skipping it are different facts about the day.
 */
export function dailyCardCell(entry: DailyCardEntry): ShareToken {
  if (entry.status === "unplayed") return "unused";
  if (entry.status === "ungraded" || entry.tier === null) return "ungraded";
  return TIER_TOKENS[entry.tier]!;
}

export function dailyCardRows(input: DailyCardInput): readonly ShareRow[] {
  const cells = input.games.map(dailyCardCell);
  const rows: ShareRow[] = [];
  for (let i = 0; i < cells.length; i += DAILY_CARD_ROW_WIDTH) {
    rows.push(cells.slice(i, i + DAILY_CARD_ROW_WIDTH));
  }
  return rows;
}

export function finishedCount(input: DailyCardInput): number {
  return input.games.filter((entry) => entry.status !== "unplayed").length;
}

export function dailyCardTitle(input: DailyCardInput): string {
  const streak = input.suiteStreak >= 2 ? ` streak ${input.suiteStreak}` : "";
  return `DAILYKIT ${input.date} ${finishedCount(input)}/${input.games.length}${streak}`;
}

/**
 * Returns null when nothing was finished today. A card of nothing but gaps is
 * an advertisement rather than a result, and the hub hides the share control
 * instead of offering one.
 */
export function dailyCardBlock(input: DailyCardInput): ShareBlock | null {
  if (finishedCount(input) === 0) return null;
  return { title: dailyCardTitle(input), rows: dailyCardRows(input) };
}

/** The accessible text equivalent, for the live region and for the hub's own
 *  screen reader summary. Requirement 8.1 forbids the glyph block alone, and
 *  it does more work here than it used to, because one cell per game carries
 *  less on its own than a meter did. */
export function dailyCardSummary(input: DailyCardInput): string {
  const finished = input.games.filter((entry) => entry.status !== "unplayed");
  if (finished.length === 0) return "No games finished yet today.";
  const parts = finished.map((entry) =>
    entry.status === "graded" && entry.tier !== null
      ? `${entry.gameId} ${TIER_NAMES[entry.tier]}`
      : `${entry.gameId} unrated`,
  );
  return `${finished.length} of ${input.games.length} finished. ${parts.join(", ")}.`;
}