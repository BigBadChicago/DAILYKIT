/**
 * Layer 4. The manifest layout of one WORD LADDER day, as obfuscated symbols.
 * WORD-LADDER.md 22.
 *
 * Eight symbols in range 26: the four start letters then the four goal letters,
 * each a to z as 0 to 25. Par and difficulty are not stored; they are derived by
 * makePuzzle from the graph, which keeps them impossible to forge in the
 * manifest. The engine codec does the obfuscation, so this file only fixes the
 * order and the letter mapping. It is not security: a determined player can
 * decode any day and read the accepted list, and that is accepted (section 32).
 */

import { decodeSymbols, encodeSymbols } from "../../engine/manifest-codec.js";
import { WORD_LENGTH } from "./ladder.js";

export const LETTER_RANGE = 26;
export const LAYOUT_SYMBOLS = WORD_LENGTH + WORD_LENGTH;

const CODE_A = "a".charCodeAt(0);

function lettersToSymbols(word: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < word.length; i += 1) out.push(word.charCodeAt(i) - CODE_A);
  return out;
}

function symbolsToWord(symbols: readonly number[]): string {
  let out = "";
  for (const symbol of symbols) out += String.fromCharCode(CODE_A + symbol);
  return out;
}

export interface DecodedLayout {
  readonly start: string;
  readonly goal: string;
}

export function encodeLayout(puzzleNumber: number, start: string, goal: string): string {
  return encodeSymbols(puzzleNumber, [...lettersToSymbols(start), ...lettersToSymbols(goal)], LETTER_RANGE);
}

/** Null when the text does not decode to eight letter symbols. Whether the words
 *  make a puzzle is rules.ts puzzleProblem's question. */
export function decodeLayout(puzzleNumber: number, encoded: unknown): DecodedLayout | null {
  const symbols = decodeSymbols(puzzleNumber, encoded, LETTER_RANGE, LAYOUT_SYMBOLS);
  if (symbols === null) return null;
  return {
    start: symbolsToWord(symbols.slice(0, WORD_LENGTH)),
    goal: symbolsToWord(symbols.slice(WORD_LENGTH, LAYOUT_SYMBOLS)),
  };
}
