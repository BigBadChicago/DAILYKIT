/**
 * Requirement 3.6.1. An archive replay must not carry the live streak into its
 * share title, which is the only place the live and archive separation reaches
 * a reader.
 */

import { describe, expect, it } from "vitest";

import { shareStreakFor } from "../../src/shell/share-context.js";

describe("shareStreakFor", () => {
  it("gives a live session its real streak", () => {
    expect(shareStreakFor("live", 12)).toBe(12);
    expect(shareStreakFor("live", 0)).toBe(0);
  });

  it("gives an archive replay no streak, whatever today's streak is", () => {
    expect(shareStreakFor("archive", 12)).toBe(0);
  });

  it("gives a tutorial no streak, so a later change cannot make it the exception", () => {
    expect(shareStreakFor("tutorial", 12)).toBe(0);
  });
});
