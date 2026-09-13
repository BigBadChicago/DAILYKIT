/**
 * Layer 0. Deterministic non cryptographic hash for puzzle identity and yearly
 * duplicate detection. Not security: a client side puzzle is always extractable
 * (ARCHITECTURE2 section 23.2). cyrb53, stable across every target engine and
 * Node because it uses only Math.imul and 32 bit integer operations.
 */

import { canonicalJson } from "./canonical-json.js";

export function hashString(input: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const value = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return value.toString(16).padStart(14, "0");
}

/** Hash of a value's canonical form, so key order never changes the identity. */
export function hashValue(value: unknown): string {
  return hashString(canonicalJson(value));
}
