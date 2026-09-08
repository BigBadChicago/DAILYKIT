import { describe, expect, it } from "vitest";
import { classifyHand, handOrdinal } from "../../../src/games/poker-grid/evaluator.js";

const card = (rank: number, suit: number): number => (rank - 2) * 4 + suit;

describe("poker hand evaluator", () => {
  it("classifies every category in ordinal order", () => {
    expect(handOrdinal([card(2, 0), card(7, 1), card(9, 2), card(11, 0), card(13, 3)])).toBe(0);
    expect(handOrdinal([card(9, 0), card(9, 1), card(2, 2), card(5, 0), card(13, 3)])).toBe(1);
    expect(handOrdinal([card(9, 0), card(9, 1), card(2, 2), card(2, 0), card(13, 3)])).toBe(2);
    expect(handOrdinal([card(9, 0), card(9, 1), card(9, 2), card(5, 0), card(13, 3)])).toBe(3);
    expect(handOrdinal([card(2, 0), card(3, 1), card(4, 2), card(5, 0), card(6, 3)])).toBe(4);
    expect(handOrdinal([card(2, 0), card(7, 0), card(9, 0), card(11, 0), card(13, 0)])).toBe(5);
    expect(handOrdinal([card(9, 0), card(9, 1), card(9, 2), card(5, 0), card(5, 1)])).toBe(6);
    expect(handOrdinal([card(9, 0), card(9, 1), card(9, 2), card(9, 3), card(5, 0)])).toBe(7);
    expect(handOrdinal([card(10, 0), card(11, 0), card(12, 0), card(13, 0), card(14, 0)])).toBe(8);
  });

  it("recognizes the wheel and rejects a wrapped straight", () => {
    expect(classifyHand([card(14, 0), card(2, 1), card(3, 2), card(4, 0), card(5, 3)])).toBe("straight");
    expect(classifyHand([card(12, 0), card(13, 1), card(14, 2), card(2, 0), card(3, 3)])).toBe("high-card");
  });
});
