/* Requirement 8.4, resolution 2. The keystream itself moved to
   engine/manifest-codec.ts in the Phase 11 correction, defect 2, because every
   game has this problem and it is the same problem. What stays here is the one
   thing that is POKER GRID's: a board is 35 cells drawn from a 52 card deck. */

import { CODEC_ALPHABET_SIZE, decodeSymbols, encodeSymbols, MANIFEST_CODEC } from "../../engine/manifest-codec.js";
import { BOARD_CELLS } from "./rules.js";

export { MANIFEST_CODEC, CODEC_ALPHABET_SIZE };

const CARD_COUNT = 52;

export function encodeBoard(puzzleNumber: number, cells: readonly number[]): string {
  if (cells.length !== BOARD_CELLS) throw new RangeError("a board must contain 35 cells");
  return encodeSymbols(puzzleNumber, cells, CARD_COUNT);
}

export function decodeBoard(puzzleNumber: number, encoded: unknown): readonly number[] | null {
  return decodeSymbols(puzzleNumber, encoded, CARD_COUNT, BOARD_CELLS);
}
