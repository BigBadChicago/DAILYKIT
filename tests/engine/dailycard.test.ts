import { describe, expect, it } from "vitest";

import {
  DAILY_CARD_ROW_WIDTH,
  dailyCardCell,
  dailyCardRows,
  dailyCardShare,
  dailyCardSummary,
  dailyCardTitle,
  type DailyCardEntry,
  type DailyCardInput,
} from "../../src/engine/dailycard.js";
import { TIER_COUNT, type TierIndex } from "../../src/engine/tiers.js";
import { SHARE_TOKEN_SHAPE, TIER_TOKENS } from "../../src/shared/share-vocabulary.js";
import { composeShareText, validateArtifactText } from "../../src/engine/share-grammar.js";

const unplayed = (gameId: string): DailyCardEntry => ({ gameId, status: "unplayed", tier: null });

/* The slate size since 2026-09-19. Twelve divides into two rows of six. */
const SLATE = ["POKER GRID", "VECTOR", "CIPHER", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const base = (over: Partial<DailyCardInput> = {}): DailyCardInput => ({
  date: "2026-09-08",
  games: [
    { gameId: SLATE[0]!, status: "graded", tier: 0 },
    ...SLATE.slice(1).map(unplayed),
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
  it("is one cell per game in full rows of the row width", () => {
    const rows = dailyCardRows(base());
    expect(rows).toHaveLength(SLATE.length / DAILY_CARD_ROW_WIDTH);
    for (const row of rows) expect(row).toHaveLength(DAILY_CARD_ROW_WIDTH);
    expect(rows.flat()).toHaveLength(SLATE.length);
  });

  /* The decision finding 3 of v3 migration phase 5 left open, made 2026-09-19:
     the row width divides the slate evenly and stays under section 49's cap of
     eight. A slate size it does not divide still produces a short row that the
     grammar refuses, and that failure is the signal to choose a width again. */
  it("keeps the row width under the token cap and dividing the slate", () => {
    expect(DAILY_CARD_ROW_WIDTH).toBeLessThanOrEqual(8);
    expect(SLATE.length % DAILY_CARD_ROW_WIDTH).toBe(0);
  });

  it("still refuses a slate the row width does not divide, as ragged", () => {
    const games = Array.from({ length: DAILY_CARD_ROW_WIDTH + 1 }, (_v, i) =>
      i === 0 ? ({ gameId: "G0", status: "graded", tier: 0 } as DailyCardEntry) : unplayed(`G${i}`),
    );
    const checked = validateArtifactText(dailyCardShare(base({ games }))!, "dailykit.providentia.games");
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.error.code).toBe("ragged-rows");
  });

  it("wraps past the row token cap rather than breaking it", () => {
    const games = Array.from({ length: DAILY_CARD_ROW_WIDTH + 1 }, (_v, i) => unplayed(`G${i}`));
    const rows = dailyCardRows(base({ games }));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(DAILY_CARD_ROW_WIDTH);
    expect(rows[1]).toHaveLength(1);
  });
});

describe("daily card share", () => {
  it("is null when nothing was finished", () => {
    expect(dailyCardShare(base({ games: SLATE.map(unplayed) }))).toBeNull();
  });

  it("carries the count and shows a streak only from two days", () => {
    expect(dailyCardTitle(base({ suiteStreak: 1 }))).toBe("DAILYKIT 2026-09-08 1/12");
    expect(dailyCardTitle(base({ suiteStreak: 7 }))).toBe("DAILYKIT 2026-09-08 1/12 streak 7");
  });

  it("is four lines with every game in a twelve game suite finished", () => {
    const games: DailyCardEntry[] = SLATE.map((gameId, i) => ({
      gameId,
      status: "graded",
      tier: (i % TIER_COUNT) as TierIndex,
    }));
    const card = dailyCardShare(base({ games }))!;
    const composed = composeShareText(card, "dailykit.providentia.games");
    expect(composed.fault).toBeNull();
    /* Title, two rows of six, URL. ARCHITECTURE2 section 49 caps a block at
       nine lines and a full house sits at four. The old meter sat at ten. */
    expect(composed.lines).toHaveLength(4);
  });

  it("leaks no game state beyond the tier", () => {
    const allowed = new Set<string>([...TIER_TOKENS, "ungraded", "unused"]);
    const block = dailyCardShare(base())!;
    expect(block.rows.flat().every((token) => allowed.has(token))).toBe(true);
  });

  it("summarises in text for the live region", () => {
    expect(dailyCardSummary(base({ games: SLATE.map(unplayed) }))).toContain("No games finished");
    expect(dailyCardSummary(base())).toBe("1 of 12 finished. POKER GRID Excellent.");
    const withUngraded: DailyCardEntry[] = [
      { gameId: "X", status: "ungraded", tier: null },
      ...SLATE.slice(1).map(unplayed),
    ];
    expect(dailyCardSummary(base({ games: withUngraded }))).toContain("unrated");
  });
});