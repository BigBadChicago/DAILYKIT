/**
 * Layer 4. The manifest layout of one DIFFERENCE RELAY day, as obfuscated
 * symbols. DIFFERENCE-RELAY.md 19.
 *
 * Seventeen symbols below ten: the six target values, five marks with a hidden
 * gap written as 0, and the six start order values. The engine codec does the
 * obfuscation, so this file only fixes the order. It is not security: a
 * determined player can decode any day, and that is accepted.
 */

import { decodeSymbols, encodeSymbols } from "../../engine/manifest-codec.js";
import { GAPS, STATIONS } from "./relay.js";

export const LAYOUT_RANGE = 10;
export const LAYOUT_SYMBOLS = STATIONS + GAPS + STATIONS;

export interface DecodedLayout {
  readonly target: number[];
  readonly marks: (number | null)[];
  readonly startOrder: number[];
}

export function encodeLayout(
  puzzleNumber: number,
  target: readonly number[],
  marks: readonly (number | null)[],
  startOrder: readonly number[],
): string {
  const symbols: number[] = [...target, ...marks.map((mark) => mark ?? 0), ...startOrder];
  return encodeSymbols(puzzleNumber, symbols, LAYOUT_RANGE);
}

/** Null when the text does not decode to symbols of the right count and range.
 *  Whether the values make a puzzle is rules.ts puzzleProblem's question. */
export function decodeLayout(puzzleNumber: number, encoded: unknown): DecodedLayout | null {
  const symbols = decodeSymbols(puzzleNumber, encoded, LAYOUT_RANGE, LAYOUT_SYMBOLS);
  if (symbols === null) return null;
  const target = symbols.slice(0, STATIONS);
  const marks = symbols.slice(STATIONS, STATIONS + GAPS).map((value) => (value === 0 ? null : value));
  const startOrder = symbols.slice(STATIONS + GAPS, STATIONS + GAPS + STATIONS);
  return { target, marks, startOrder };
}
