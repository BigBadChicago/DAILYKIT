/**
 * Layer 4. The manifest shape of one FIVE LETTERS day. FIVE-LETTERS.md 12 and 22.
 *
 * `answer` is five symbols in range 26, one per letter. The engine codec does the
 * obfuscation; this is not security, and a determined player can decode any day
 * (FIVE-LETTERS.md 32). The accepted list ships in the page, so the manifest
 * carries only the answer, never a word list.
 */

import { decodeSymbols, encodeSymbols } from "../../engine/manifest-codec.js";
import { WORD_LENGTH } from "./feedback.js";

export const LETTER_RANGE = 26;
const CODE_A = "a".charCodeAt(0);

export function encodeAnswer(puzzleNumber: number, answer: string): string {
  if (!/^[a-z]{5}$/.test(answer)) throw new RangeError(`${answer} is not five lowercase letters`);
  const symbols: number[] = [];
  for (const letter of answer) symbols.push(letter.charCodeAt(0) - CODE_A);
  return encodeSymbols(puzzleNumber, symbols, LETTER_RANGE);
}

/** Null when the text does not decode to exactly five letters. */
export function decodeAnswer(puzzleNumber: number, encoded: unknown): string | null {
  const symbols = decodeSymbols(puzzleNumber, encoded, LETTER_RANGE, WORD_LENGTH);
  if (symbols === null || symbols.length !== WORD_LENGTH) return null;
  return symbols.map((symbol) => String.fromCharCode(CODE_A + symbol)).join("");
}
