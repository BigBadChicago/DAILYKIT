import { BOARD_CELLS } from "./rules.js";

/* Requirement 8.4, resolution 2. This is obfuscation and nothing more. A
   determined player can read this file, lift these forty lines, and print
   tomorrow's board in a minute. That is accepted. What it buys is that a
   curious player poking at the network tab or at localStorage sees a string
   of noise rather than an answer, which is the only thing a static site can
   honestly offer. Do not describe it as security anywhere in the UI. */
export const MANIFEST_CODEC = "xor-v1";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const RADIX = ALPHABET.length;
const CARD_COUNT = 52;

function keystream(puzzleNumber: number, index: number): number {
  /* Same 32 bit discipline as core/rng.ts, so this is identical in Node and
     in every target browser. */
  let mixed = Math.imul(puzzleNumber + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0xc2b2ae35);
  return ((mixed ^ (mixed >>> 13)) >>> 0) % RADIX;
}

export function encodeBoard(puzzleNumber: number, cells: readonly number[]): string {
  if (cells.length !== BOARD_CELLS) throw new RangeError("a board must contain 35 cells");
  let encoded = "";
  for (let index = 0; index < cells.length; index += 1) {
    const card = cells[index] as number;
    if (!Number.isInteger(card) || card < 0 || card >= CARD_COUNT) throw new RangeError("card is outside the deck");
    encoded += ALPHABET[(card + keystream(puzzleNumber, index)) % RADIX];
  }
  return encoded;
}

/* Returns null rather than throwing, because the caller is parsing fetched
   data and a bad entry must degrade to a readable message, not an exception. */
export function decodeBoard(puzzleNumber: number, encoded: unknown): readonly number[] | null {
  if (typeof encoded !== "string" || encoded.length !== BOARD_CELLS) return null;
  const cells: number[] = [];
  for (let index = 0; index < encoded.length; index += 1) {
    const symbol = ALPHABET.indexOf(encoded[index] as string);
    if (symbol < 0) return null;
    const card = (symbol - keystream(puzzleNumber, index) + RADIX) % RADIX;
    if (card >= CARD_COUNT) return null;
    cells.push(card);
  }
  return cells;
}
