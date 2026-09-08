import { describe, expect, it } from "vitest";
import { decodeBoard, encodeBoard, MANIFEST_CODEC } from "../../../src/games/poker-grid/manifest-codec.js";
import { generatePuzzle } from "../../../src/games/poker-grid/generator.js";
import { seedFor } from "../../../src/core/seed.js";
import { BOARD_CELLS } from "../../../src/games/poker-grid/rules.js";

const board = (n: number): readonly number[] => generatePuzzle(n, seedFor("poker-grid", n)).cells;

describe("POKER GRID manifest codec", () => {
  it("round trips every board across a year", () => {
    for (let number = 1; number <= 365; number += 1) {
      expect(decodeBoard(number, encodeBoard(number, board(number)))).toEqual(board(number));
    }
  });

  it("is stable, so a regenerated manifest does not churn", () => {
    expect(encodeBoard(7, board(7))).toBe(encodeBoard(7, board(7)));
  });

  it("keys the stream to the puzzle number, so equal boards on different days differ", () => {
    const cells = board(7);
    expect(encodeBoard(8, cells)).not.toBe(encodeBoard(7, cells));
  });

  it("hides the card order from a casual reader", () => {
    const cells = board(1);
    const encoded = encodeBoard(1, cells);
    expect(encoded).toHaveLength(BOARD_CELLS);
    expect(encoded).not.toContain(String(cells[0]));
    expect(encoded).not.toBe(cells.join(""));
  });

  it("rejects rather than throws on anything malformed", () => {
    expect(decodeBoard(1, undefined)).toBeNull();
    expect(decodeBoard(1, 42)).toBeNull();
    expect(decodeBoard(1, "short")).toBeNull();
    expect(decodeBoard(1, "!".repeat(BOARD_CELLS))).toBeNull();
    /* A wrong puzzle number decodes to cards outside the deck, not to a
       different but plausible board. */
    expect(decodeBoard(2, encodeBoard(1, board(1)))).toBeNull();
  });

  it("names its version so a future codec can be told apart", () => {
    expect(MANIFEST_CODEC).toBe("xor-v1");
  });
});
