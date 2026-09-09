import { describe, expect, it } from "vitest";
import { seedFor } from "../../../src/core/seed.js";
import { CODE_LENGTH } from "../../../src/games/cipher/rules.js";
import { generateCode } from "../../../src/games/cipher/generator.js";
import { MANIFEST_CODEC, decodeCode, encodeCode } from "../../../src/games/cipher/manifest-codec.js";

describe("cipher manifest codec", () => {
  it("round trips every day of a year", () => {
    for (let number = 1; number <= 365; number += 1) {
      const code = generateCode(seedFor("cipher", number));
      const encoded = encodeCode(number, code);
      expect(encoded).toHaveLength(CODE_LENGTH);
      expect(decodeCode(number, encoded)).toEqual(code);
    }
  });

  it("keys the stream to the puzzle number, so one day's string is not another's", () => {
    const code = [1, 2, 3, 4];
    const first = encodeCode(10, code);
    const second = encodeCode(11, code);
    expect(first).not.toBe(second);
    expect(decodeCode(11, first)).not.toEqual(code);
  });

  it("names its codec, which the manifest carries and verification checks", () => {
    expect(MANIFEST_CODEC).toBe("xor-v1");
  });

  it("returns null on malformed input rather than throwing", () => {
    expect(decodeCode(1, "abc")).toBeNull();
    expect(decodeCode(1, "abcde")).toBeNull();
    expect(decodeCode(1, 42)).toBeNull();
    expect(decodeCode(1, null)).toBeNull();
    expect(decodeCode(1, "ab*d")).toBeNull();
  });

  it("refuses to encode a symbol outside the palette", () => {
    expect(() => encodeCode(1, [0, 1, 2, 6])).toThrow(RangeError);
    expect(() => encodeCode(1, [0, 1, 2])).toThrow(RangeError);
  });

  it("maps some codes to characters outside the symbol range, which decode rejects", () => {
    /* The alphabet is 64 wide and only six values are legal, so a random string
       is overwhelmingly likely to decode to nothing. That is the whole defence
       against a hand edited localStorage entry, and it is not security. */
    let rejected = 0;
    for (const junk of ["AAAA", "zzzz", "9999", "----", "____"]) {
      if (decodeCode(1, junk) === null) rejected += 1;
    }
    expect(rejected).toBeGreaterThan(0);
  });
});
