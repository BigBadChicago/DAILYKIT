/**
 * Layer 0. Requirement 4.0.2.
 *
 * A Seed is one uint32, because core/types.ts fixes `Seed = number` and
 * GameModule.generatePuzzle takes exactly that. sfc32 needs four state words,
 * so the expansion from one to four lives here rather than widening the
 * contract.
 */

import { createRng, type Rng } from "./rng.js";
import type { Seed } from "./types.js";

/** Lowercase ASCII, hyphen separated, no leading or trailing hyphen. Matches
 *  the rule already stated on GameIdentity.id. */
const GAME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Discarding the first outputs is standard for sfc32 and matters here because
 * the four words come from one 32 bit value. Without it, seeds close together
 * begin with visibly related output, which would surface as similar boards on
 * consecutive days.
 */
const WARMUP_DRAWS = 12;

/**
 * FNV-1a over char codes. Sound only for ASCII input, which is why the game id
 * is validated rather than encoded: a non ASCII id would hash differently
 * depending on whether the implementation walked code units or UTF-8 bytes,
 * and forbidding the input makes the question unaskable.
 */
function fnv1a32(text: string): number {
  let h = FNV_OFFSET_BASIS | 0;
  for (let i = 0; i < text.length; i += 1) {
    h = h ^ text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

interface SplitMixStep {
  readonly state: number;
  readonly value: number;
}

/** splitmix32. A bijection with good avalanche, so four successive calls cannot
 *  produce a repeated state word. */
function splitmix32(state: number): SplitMixStep {
  const next = (state + 0x9e3779b9) | 0;
  let z = next;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return { state: next, value: (z ^ (z >>> 15)) >>> 0 };
}

function assertAscii(label: string, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 0x7f) {
      throw new RangeError(`${label} must be ASCII, got ${JSON.stringify(text)}`);
    }
  }
}

/**
 * Stable across runs, machines, and engines. The salt exists for the
 * regeneration loop of requirement 6.3.5: a board rejected as degenerate is
 * retried under a new salt, which yields an unrelated stream for the same day.
 */
export function seedFor(
  gameId: string,
  puzzleNumber: number,
  salt?: string | number,
): Seed {
  if (!GAME_ID_PATTERN.test(gameId)) {
    throw new RangeError(
      `game id must be lowercase ASCII and hyphen separated, got ${JSON.stringify(gameId)}`,
    );
  }
  if (!Number.isSafeInteger(puzzleNumber) || puzzleNumber < 1) {
    throw new RangeError(`puzzle number must be a positive safe integer, got ${puzzleNumber}`);
  }

  let saltText = "";
  if (salt !== undefined) {
    if (typeof salt === "number") {
      if (!Number.isSafeInteger(salt)) {
        throw new RangeError(`numeric salt must be a safe integer, got ${salt}`);
      }
      saltText = String(salt);
    } else {
      assertAscii("salt", salt);
      saltText = salt;
    }
  }

  return fnv1a32(`${gameId}:${puzzleNumber}:${saltText}`);
}

export function rngFromSeed(seed: Seed): Rng {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new RangeError(`seed must be a uint32, got ${seed}`);
  }

  let state = seed | 0;
  const words: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const step = splitmix32(state);
    state = step.state;
    words.push(step.value);
  }

  const rng = createRng(
    words[0] as number,
    words[1] as number,
    words[2] as number,
    words[3] as number,
  );
  for (let i = 0; i < WARMUP_DRAWS; i += 1) rng.nextUint32();
  return rng;
}

/** The pairing every caller actually wants. */
export function rngFor(
  gameId: string,
  puzzleNumber: number,
  salt?: string | number,
): Rng {
  return rngFromSeed(seedFor(gameId, puzzleNumber, salt));
}
