/**
 * Layer 4. The manifest layout of one ROTATE LOCK day, as obfuscated symbols.
 * ROTATE-LOCK.md 19.
 *
 * Twenty nine symbols below 36: start, lock, seven lengths, the tray order, seven
 * facings, the mark count, and five mark slots with unused slots written as 0.
 * The engine codec does the obfuscation, so this file only fixes the order. It
 * is not security: a determined player can decode any day, and that is accepted.
 */

import { decodeSymbols, encodeSymbols } from "../../engine/manifest-codec.js";
import { CELLS, MAX_MARKS, PIECES, type Arrangement, type Direction, type Layout } from "./route.js";

export const LAYOUT_RANGE = CELLS;
export const LAYOUT_SYMBOLS = 2 + PIECES * 3 + 1 + MAX_MARKS;

export interface DecodedLayout {
  readonly layout: Layout;
  readonly start: Arrangement;
}

export function encodeLayout(puzzleNumber: number, layout: Layout, start: Arrangement): string {
  if (layout.marks.length > MAX_MARKS) throw new RangeError("too many marks to encode");
  const symbols: number[] = [layout.start, layout.lock, ...layout.lengths, ...start.order, ...start.facing, layout.marks.length];
  for (let slot = 0; slot < MAX_MARKS; slot += 1) symbols.push(layout.marks[slot] ?? 0);
  return encodeSymbols(puzzleNumber, symbols, LAYOUT_RANGE);
}

/** Null when the text does not decode to symbols of the right count and range.
 *  Whether the values make a puzzle is rules.ts layoutProblem's question. */
export function decodeLayout(puzzleNumber: number, encoded: unknown): DecodedLayout | null {
  const symbols = decodeSymbols(puzzleNumber, encoded, LAYOUT_RANGE, LAYOUT_SYMBOLS);
  if (symbols === null) return null;
  const at = (index: number): number => symbols[index] as number;
  const lengths = symbols.slice(2, 2 + PIECES);
  const order = symbols.slice(2 + PIECES, 2 + PIECES * 2);
  const facing = symbols.slice(2 + PIECES * 2, 2 + PIECES * 3) as Direction[];
  const count = at(2 + PIECES * 3);
  if (count > MAX_MARKS) return null;
  const marks = symbols.slice(3 + PIECES * 3, 3 + PIECES * 3 + count);
  return { layout: { start: at(0), lock: at(1), marks, lengths }, start: { order, facing } };
}
