import { describe, expect, it } from "vitest";
import { canonicalJson } from "../../src/core/canonical-json.js";
import { hashValue, hashString } from "../../src/core/hash.js";

describe("canonicalJson", () => {
  it("is stable across key order", () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
  it("recurses into nested objects and arrays", () => {
    expect(canonicalJson({ x: [{ b: 1, a: 2 }] })).toBe(canonicalJson({ x: [{ a: 2, b: 1 }] }));
  });
});

describe("hashValue", () => {
  it("is deterministic for equal values regardless of key order", () => {
    expect(hashValue({ a: 1, b: [2, 3] })).toBe(hashValue({ b: [2, 3], a: 1 }));
  });
  it("differs for different values", () => {
    expect(hashValue({ t: 1 })).not.toBe(hashValue({ t: 2 }));
  });
  it("returns a fixed width hex string", () => {
    expect(hashString("anything")).toMatch(/^[0-9a-f]{14}$/);
  });
});
