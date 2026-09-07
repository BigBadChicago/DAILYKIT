import { describe, expect, it } from "vitest";
import { CARD_CLEAR_POINTS, HAND_POINTS, TIER_QUALITY_THRESHOLD, tierFor } from "../../../src/games/poker-grid/scoring.js";

describe("POKER GRID scoring", () => {
  it("keeps hand count dominant over hand quality", () => {
    for (let lower = 0; lower < 7; lower += 1) {
      for (let higher = lower + 1; higher <= 7; higher += 1) {
        const moreHands = higher * HAND_POINTS["one-pair"] + higher * 5 * CARD_CLEAR_POINTS;
        const fewerHands = lower * HAND_POINTS["straight-flush"] + lower * 5 * CARD_CLEAR_POINTS;
        expect(moreHands).toBeGreaterThan(fewerHands);
      }
    }
  });

  it("keeps the weakest equal hand count above the quality floor", () => {
    const weak = HAND_POINTS["one-pair"] + 5 * CARD_CLEAR_POINTS;
    const premium = HAND_POINTS["straight-flush"] + 5 * CARD_CLEAR_POINTS;
    expect(weak).toBeGreaterThanOrEqual(TIER_QUALITY_THRESHOLD * premium);
  });

  it("uses hand deficit before quality", () => {
    expect(tierFor({ score: 7 * (HAND_POINTS["straight-flush"] + 5 * CARD_CLEAR_POINTS), hands: 7 }, [], 0)).toBe(4);
    expect(tierFor({ score: 2 * (HAND_POINTS["straight-flush"] + 5 * CARD_CLEAR_POINTS), hands: 2 }, [{ points: HAND_POINTS["one-pair"] }], HAND_POINTS["one-pair"] + 5 * CARD_CLEAR_POINTS)).toBe(2);
  });
});
