/**
 * Layer 4. The manifest shape of one PANGRAM day, as obfuscated symbols.
 * PANGRAM.md 12 and 22.
 *
 * `layout` is eight symbols in range 26: the seven set letters in alphabetical
 * order, then the centre letter's index into them. `words` is the day's answer
 * list in alphabetical order, each letter written as its index into the set plus
 * one and each word ended by a zero, in range 8. The browser ships no dictionary
 * (PANGRAM.md 0), so the day carries its own answers. The engine codec does the
 * obfuscation; this is not security, and a determined player can decode any day
 * (PANGRAM.md 32).
 */

import { decodeSymbols, encodeSymbols } from "../../engine/manifest-codec.js";
import { SET_SIZE } from "./letters.js";

export const LETTER_RANGE = 26;
export const LAYOUT_SYMBOLS = SET_SIZE + 1;
/** Zero ends a word, one to seven name a set letter. */
export const WORD_RANGE = SET_SIZE + 1;

const CODE_A = "a".charCodeAt(0);

export interface DecodedLayout {
  /** Seven letters, alphabetical, as one string. */
  readonly letters: string;
  readonly centre: string;
}

export function encodeLayout(puzzleNumber: number, letters: string, centre: string): string {
  const symbols: number[] = [];
  for (const letter of letters) symbols.push(letter.charCodeAt(0) - CODE_A);
  symbols.push(letters.indexOf(centre));
  return encodeSymbols(puzzleNumber, symbols, LETTER_RANGE);
}

/** Null when the text does not decode, when the letters are not seven strictly
 *  ascending letters, or when the centre index is out of range. */
export function decodeLayout(puzzleNumber: number, encoded: unknown): DecodedLayout | null {
  const symbols = decodeSymbols(puzzleNumber, encoded, LETTER_RANGE, LAYOUT_SYMBOLS);
  if (symbols === null) return null;
  let letters = "";
  for (let i = 0; i < SET_SIZE; i += 1) {
    const symbol = symbols[i] as number;
    if (i > 0 && symbol <= (symbols[i - 1] as number)) return null;
    letters += String.fromCharCode(CODE_A + symbol);
  }
  const centreIndex = symbols[SET_SIZE] as number;
  if (centreIndex >= SET_SIZE) return null;
  return { letters, centre: letters[centreIndex] as string };
}

/** The word list as symbols. Throws on a letter outside the set, which only a
 *  generator defect could produce. */
export function encodeWords(puzzleNumber: number, letters: string, words: readonly string[]): string {
  const symbols: number[] = [];
  for (const word of words) {
    for (const letter of word) {
      const index = letters.indexOf(letter);
      if (index < 0) throw new RangeError(`${word} uses a letter outside ${letters}`);
      symbols.push(index + 1);
    }
    symbols.push(0);
  }
  return encodeSymbols(puzzleNumber, symbols, WORD_RANGE);
}

/** Null when the text does not decode or does not end on a word boundary.
 *  Whether the words make a day is rules.ts's question. */
export function decodeWords(puzzleNumber: number, letters: string, encoded: unknown): string[] | null {
  if (typeof encoded !== "string" || encoded.length === 0) return null;
  const symbols = decodeSymbols(puzzleNumber, encoded, WORD_RANGE, encoded.length);
  if (symbols === null || symbols[symbols.length - 1] !== 0) return null;
  const words: string[] = [];
  let word = "";
  for (const symbol of symbols) {
    if (symbol === 0) {
      if (word.length === 0) return null;
      words.push(word);
      word = "";
    } else {
      word += letters[symbol - 1] as string;
    }
  }
  return words;
}
