import { describe, expect, it } from "vitest";

import {
  DAILY_CARD_ROW_WIDTH,
  dailyCardBlock,
  dailyCardCell,
  dailyCardRows,
  dailyCardSummary,
  dailyCardTitle,
  type DailyCardEntry,
  type DailyCardInput,
} from "../../src/engine/dailycard.js";
import { TIER_COUNT, type TierIndex } from "../../src/engine/tiers.js";
import { SHARE_MAX_ROWS } from "../../src/core/types.js";
import { SHARE_TOKEN_SHAPE, TIER_TOKENS } from "../../src/shared/share-vocabulary.js";
import { composeShare } from "../../src/engine/share.js";

const unplayed = (gameId: string): DailyCardEntry => ({ gameId, status: "unplayed", tier: null });

const EIGHT = ["POKER GRID", "VECTOR", "CIPHER", "D", "E", "F", "G", "H"];

const base = (over: Partial<DailyCardInput> = {}): DailyCardInput => ({
  date: "2026-09-08",
  games: [
    { gameId: EIGHT[0]!, status: "graded", tier: 0 },
    ...EIGHT.slice(1).map(unplayed),
  ],
  suiteStreak: 1,
  ...over,
});

describe("daily card cells", () => {
  it("gives a graded game its tier token", () => {
    for (let tier = 0; tier < TIER_COUNT; tier += 1) {
      const entry: DailyCardEntry = { gameId: "G", status: "graded", tier: tier as TierIndex };
      expect(dailyCardCell(entry)).toBe(TIER_TOKENS[tier]);
    }
  });

  it("never renders an ungraded game as the worst tier", () => {
    const cell = dailyCardCell({ gameId: "G", status: "ungraded", tier: null });
    expect(cell).toBe("ungraded");
    expect(TIER_TOKENS).not.toContain(cell);
  });

  it("tells a finished but ungraded game apart from one never played", () => {
    const ungraded = dailyCardCell({ gameId: "G", status: "ungraded", tier: null });
    expect(ungraded).not.toBe(dailyCardCell(unplayed("G")));
  });

  /* Requirement 8.1. One cell per game means a cell carries its meaning alone
     and cannot lean on meter length the way the old rows did, so the two non
     tier cells need shapes no tier uses. */
  it("uses shapes no tier uses for the two non tier cells", () => {
    const tierShapes = new Set(TIER_TOKENS.map((token) => SHARE_TOKEN_SHAPE[token]));
    expect(tierShapes.has(SHARE_TOKEN_SHAPE.ungraded)).toBe(false);
    expect(tierShapes.has(SHARE_TOKEN_SHAPE.unused)).toBe(false);
    expect(SHARE_TOKEN_SHAPE.ungraded).not.toBe(SHARE_TOKEN_SHAPE.unused);
  });
});

describe("daily card rows", () => {
  it("is one row of one cell per game", () => {
    const rows = dailyCardRows(base());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(EIGHT.length);
  });

  it("wraps past the row token cap rather than breaking it", () => {
    const games = Array.from({ length: DAILY_CARD_ROW_WIDTH + 1 }, (_v, i) => unplayed(`G${i}`));
    const rows = dailyCardRows(base({ games }));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(DAILY_CARD_ROW_WIDTH);
    expect(rows[1]).toHaveLength(1);
  });
});

describe("daily card block", () => {
  it("is null when nothing was finished", () => {
    expect(dailyCardBlock(base({ games: EIGHT.map(unplayed) }))).toBeNull();
  });

  it("carries the count and shows a streak only from two days", () => {
    expect(dailyCardTitle(base({ suiteStreak: 1 }))).toBe("DAILYKIT 2026-09-08 1/8");
    expect(dailyCardTitle(base({ suiteStreak: 7 }))).toBe("DAILYKIT 2026-09-08 1/8 streak 7");
  });

  it("is three lines with every game in an eight game suite finished", () => {
    const games: DailyCardEntry[] = EIGHT.map((gameId, i) => ({
      gameId,
      status: "graded",
      tier: (i % TIER_COUNT) as TierIndex,
    }));
    const block = dailyCardBlock(base({ games }))!;
    expect(block.rows.length).toBeLessThanOrEqual(SHARE_MAX_ROWS);
    const composed = composeShare(block, { shareUrl: "dailykit.providentia.games" });
    expect(composed.truncated).toBe(false);
    /* Title, one row, URL. ARCHITECTURE2 section 49 caps a block at nine lines
       and a full house now sits at three. The old meter sat at ten. */
    expect(composed.lines).toHaveLength(3);
  });

  it("leaks no game state beyond the tier", () => {
    const allowed = new Set<string>([...TIER_TOKENS, "ungraded", "unused"]);
    const block = dailyCardBlock(base())!;
    expect(block.rows.flat().every((token) => allowed.has(token))).toBe(true);
  });

  it("summarises in text for the live region", () => {
    expect(dailyCardSummary(base({ games: EIGHT.map(unplayed) }))).toContain("No games finished");
    expect(dailyCardSummary(base())).toBe("1 of 8 finished. POKER GRID Excellent.");
    const withUngraded: DailyCardEntry[] = [
      { gameId: "X", status: "ungraded", tier: null },
      ...EIGHT.slice(1).map(unplayed),
    ];
    expect(dailyCardSummary(base({ games: withUngraded }))).toContain("unrated");
  });
});