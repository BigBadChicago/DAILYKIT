import { describe, expect, it } from "vitest";
import {
  CALIBRATION,
  CLEAR_VALUE_PER_HAND,
  HAND_POINTS,
  HAND_POINTS_CEILING,
  HAND_POINTS_FLOOR,
  scoreHands,
  TIER_QUALITY_THRESHOLD,
  tierFor,
  type ScoringCategory,
} from "../../../src/games/poker-grid/scoring.js";
import { HAND_CATEGORIES } from "../../../src/shared/poker-hands.js";

const ORDERED = HAND_CATEGORIES.filter((category): category is ScoringCategory => category !== "high-card");
const MAX_HANDS = 7;

describe("POKER GRID scoring", () => {
  it("prices every category and only the legal ones", () => {
    expect(Object.keys(HAND_POINTS).sort()).toEqual([...ORDERED].sort());
    expect(Object.keys(HAND_POINTS)).not.toContain("high-card");
  });

  it("rises with rarity in the order the shared table defines", () => {
    for (let index = 1; index < ORDERED.length; index += 1) {
      const previous = ORDERED[index - 1] as ScoringCategory;
      const current = ORDERED[index] as ScoringCategory;
      expect(HAND_POINTS[current]).toBeGreaterThan(HAND_POINTS[previous]);
    }
  });

  /* C2 in POKER-GRID.md Section 5, enumerated over all 28 pairs as that
     section asks rather than argued down to the tightest one. The binding pair
     is seven bare pairs at 5,670 against six straight flushes at 5,640, which
     is what caps a straight flush at 140. */
  it("makes cards cleared dominate hand quality across every pair of hand counts", () => {
    let pairs = 0;
    for (let fewer = 0; fewer < MAX_HANDS; fewer += 1) {
      for (let more = fewer + 1; more <= MAX_HANDS; more += 1) {
        const worstWithMore = more * (CLEAR_VALUE_PER_HAND + HAND_POINTS_FLOOR);
        const bestWithFewer = fewer * (CLEAR_VALUE_PER_HAND + HAND_POINTS_CEILING);
        expect(worstWithMore).toBeGreaterThan(bestWithFewer);
        pairs += 1;
      }
    }
    expect(pairs).toBe(28);
  });

  /* C3. The hand count terms cancel, so matching the optimum's hand count with
     the weakest hands available can never drop out of the top two tiers. */
  it("keeps the weakest matching game above the tier quality floor", () => {
    expect(HAND_POINTS_FLOOR + CLEAR_VALUE_PER_HAND)
      .toBeGreaterThanOrEqual(TIER_QUALITY_THRESHOLD * (HAND_POINTS_CEILING + CLEAR_VALUE_PER_HAND));
  });

  it("keeps the shipped table within rounding distance of the measured curve", () => {
    const share = CALIBRATION.measuredShareOfLegal;
    for (const category of ORDERED) {
      const derived = HAND_POINTS_FLOOR * (share["one-pair"] / share[category]) ** CALIBRATION.compressionExponent;
      expect(Math.abs(HAND_POINTS[category] - derived)).toBeLessThanOrEqual(3);
    }
    expect(HAND_POINTS["straight-flush"]).toBe(HAND_POINTS_CEILING);
    expect(HAND_POINTS["one-pair"]).toBe(HAND_POINTS_FLOOR);
  });

  it("scores a hand as its quality plus the cards it cleared", () => {
    expect(scoreHands([{ category: "flush", points: HAND_POINTS.flush }]))
      .toBe(CLEAR_VALUE_PER_HAND + HAND_POINTS.flush);
    expect(scoreHands([])).toBe(0);
  });

  it("tiers by hand deficit first and quality only on a matching hand count", () => {
    const best = { score: 7 * (CLEAR_VALUE_PER_HAND + 40), hands: 7 };
    const seven = Array.from({ length: 7 }, () => ({ points: 40 }));
    expect(tierFor(best, seven, best.score)).toBe(0);
    expect(tierFor(best, Array.from({ length: 7 }, () => ({ points: 10 })), 7 * (CLEAR_VALUE_PER_HAND + 10))).toBe(1);
    expect(tierFor(best, seven.slice(0, 6), 6 * (CLEAR_VALUE_PER_HAND + 40))).toBe(2);
    expect(tierFor(best, seven.slice(0, 5), 5 * (CLEAR_VALUE_PER_HAND + 40))).toBe(3);
    expect(tierFor(best, seven.slice(0, 3), 3 * (CLEAR_VALUE_PER_HAND + 40))).toBe(4);
  });

  it("is unrated when no stored best exists", () => {
    expect(tierFor(null, [], 0)).toBeNull();
  });
});
