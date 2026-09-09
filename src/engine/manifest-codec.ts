/**
 * Layer 1. The suite's manifest obfuscation. Requirement 8.4.
 *
 * Phase 11 correction, defect 2. This lived in games/poker-grid and CIPHER
 * copied it, which is how forty lines become five copies that drift. It is
 * obfuscation and nothing more: a determined player can read this file, lift
 * it, and print tomorrow's puzzle in a minute. That is accepted. What it buys
 * is that the network tab shows noise rather than an answer, which is the only
 * thing a static site can honestly offer. Never described as security in the UI.
 *
 * The keystream is keyed by puzzle number and position only, not by game id, so
 * every manifest written before this file existed still decodes byte for byte.
 */

export const MANIFEST_CODEC = "xor-v1";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const RADIX = ALPHABET.length;

export const CODEC_ALPHABET_SIZE = RADIX;

function keystream(puzzleNumber: number, index: number): number {
  /* Same 32 bit discipline as core/rng.ts, so this is identical in Node and in
     every target browser. */
  let mixed = Math.imul(puzzleNumber + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0xc2b2ae35);
  return ((mixed ^ (mixed >>> 13)) >>> 0) % RADIX;
}

/** `range` is the number of legal values, so a decode that lands outside it is
 *  a corrupt entry rather than a symbol this game could ever have written. */
export function encodeSymbols(
  puzzleNumber: number,
  values: readonly number[],
  range: number,
): string {
  if (!Number.isInteger(range) || range < 1 || range > RADIX) {
    throw new RangeError(`range must be between 1 and ${RADIX}, got ${range}`);
  }
  let encoded = "";
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] as number;
    if (!Number.isInteger(value) || value < 0 || value >= range) {
      throw new RangeError(`value at ${index} is outside the range ${range}`);
    }
    encoded += ALPHABET[(value + keystream(puzzleNumber, index)) % RADIX];
  }
  return encoded;
}

/** Null rather than a throw, because the caller is parsing fetched data and a
 *  bad entry must degrade to a readable message, not an exception. */
export function decodeSymbols(
  puzzleNumber: number,
  encoded: unknown,
  range: number,
  length: number,
): readonly number[] | null {
  if (typeof encoded !== "string" || encoded.length !== length) return null;
  const values: number[] = [];
  for (let index = 0; index < encoded.length; index += 1) {
    const position = ALPHABET.indexOf(encoded[index] as string);
    if (position < 0) return null;
    const value = (position - keystream(puzzleNumber, index) + RADIX) % RADIX;
    if (value >= range) return null;
    values.push(value);
  }
  return values;
}
