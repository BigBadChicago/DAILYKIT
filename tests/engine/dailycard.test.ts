import { describe, expect, it } from "vitest";

import {
  DAILY_CARD_WIDTH,
  dailyCardBlock,
  dailyCardRow,
  dailyCardSummary,
  dailyCardTitle,
  type DailyCardInput,
} from "../../src/engine/dailycard.js";
import { TIER_COUNT, TIER_NAMES } from "../../src/engine/tiers.js";
import { SHARE_MAX_ROWS } from "../../src/core/types.js";
import { TIER_TOKENS } from "../../src/shared/share-vocabulary.js";
import { composeShare } from "../../src/engine/share.js";

const base = (over: Partial<DailyCardInput> = {}): DailyCardInput => ({
  date: "2026-09-08",
  finished: [{ gameId: "POKER GRID", tier: 0 }],
  totalGames: 5,
  suiteStreak: 1,
  ...over,
});

describe("daily card rows", () => {
  it("is exactly as wide as the tier scale", () => {
    expect(DAILY_CARD_WIDTH).toBe(TIER_COUNT);
  });

  it("fills one cell per band at or below the tier earned", () => {
    for (let tier = 0; tier < TIER_COUNT; tier += 1) {
      const row = dailyCardRow(tier as 0 | 1 | 2 | 3 | 4);
      expect(row).toHaveLength(DAILY_CARD_WIDTH);
      const filled = row.filter((token) => token !== "barEmpty");
      expect(filled).toHaveLength(DAILY_CARD_WIDTH - tier);
      expect(new Set(filled)).toEqual(new Set([TIER_TOKENS[tier]]));
    }
  });

  it("renders an ungraded game as one neutral cell, never as the worst tier", () => {
    const row = dailyCardRow(null);
    expect(row[0]).toBe("barFull");
    expect(row.slice(1).every((token) => token === "barEmpty")).toBe(true);
    expect(row).not.toContain(TIER_TOKENS[TIER_COUNT - 1]);
  });
});

describe("daily card block", () => {
  it("is null when nothing was finished", () => {
    expect(dailyCardBlock(base({ finished: [] }))).toBeNull();
  });

  it("carries the count and shows a streak only from two days", () => {
    expect(dailyCardTitle(base({ suiteStreak: 1 }))).toBe("DAILYKIT 2026-09-08 1/5");
    expect(dailyCardTitle(base({ suiteStreak: 7 }))).toBe("DAILYKIT 2026-09-08 1/5 streak 7");
  });

  it("stays inside the row cap with every game finished", () => {
    const finished = TIER_NAMES.map((_name, index) => ({
      gameId: `G${index}`,
      tier: index as 0 | 1 | 2 | 3 | 4,
    }));
    const block = dailyCardBlock(base({ finished, totalGames: 5 }));
    expect(block).not.toBeNull();
    expect(block!.rows.length).toBeLessThanOrEqual(SHARE_MAX_ROWS);
    const composed = composeShare(block!, { shareUrl: "dailykit.providentia.games" });
    expect(composed.truncated).toBe(false);
    /* Title, five rows, URL. Requirement 3.5.6 caps a shared block at about
       eight lines and a full house sits at seven. */
    expect(composed.lines).toHaveLength(7);
  });

  it("leaks no game state beyond the tier", () => {
    const block = dailyCardBlock(base())!;
    expect(block.rows.flat().every((token) => token === "best" || token === "barEmpty")).toBe(true);
  });

  it("summarises in text for the live region", () => {
    expect(dailyCardSummary(base({ finished: [] }))).toContain("No games finished");
    expect(dailyCardSummary(base())).toBe("1 of 5 finished. POKER GRID Excellent.");
    expect(dailyCardSummary(base({ finished: [{ gameId: "X", tier: null }] }))).toContain("unrated");
  });
});
