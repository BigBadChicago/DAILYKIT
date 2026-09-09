/* Requirement 8.4. The keystream lives in engine/manifest-codec.ts since the
   Phase 11 correction, defect 2. What stays here is CIPHER's shape: four
   symbols drawn from six shapes. */

import { decodeSymbols, encodeSymbols, MANIFEST_CODEC } from "../../engine/manifest-codec.js";
import { CODE_LENGTH, SYMBOL_COUNT, type Code } from "./rules.js";

export { MANIFEST_CODEC };

export function encodeCode(puzzleNumber: number, code: Code): string {
  if (code.length !== CODE_LENGTH) throw new RangeError("a code must contain four symbols");
  return encodeSymbols(puzzleNumber, code, SYMBOL_COUNT);
}

export function decodeCode(puzzleNumber: number, encoded: unknown): Code | null {
  return decodeSymbols(puzzleNumber, encoded, SYMBOL_COUNT, CODE_LENGTH) as Code | null;
}
