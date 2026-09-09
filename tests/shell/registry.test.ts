import { describe, expect, it } from "vitest";

import cipher from "../../src/games/cipher/module.js";
import pokerGrid from "../../src/games/poker-grid/module.js";
import { LIVE_GAMES, SUITE_GAMES, entryFor, promotableIds } from "../../src/shell/registry.js";
import { crossPromotionTarget } from "../../src/engine/stats.js";
import { emptySuiteRecord } from "../../src/engine/storage.js";

describe("suite registry", () => {
  it("lists exactly the five approved games with unique ids and paths", () => {
    expect(SUITE_GAMES).toHaveLength(5);
    expect(new Set(SUITE_GAMES.map((entry) => entry.id)).size).toBe(5);
    expect(new Set(SUITE_GAMES.map((entry) => entry.path)).size).toBe(5);
    expect(new Set(SUITE_GAMES.map((entry) => entry.accent.hue)).size).toBe(5);
  });

  it("uses lowercase hyphenated ids, because they are seed and key namespaces", () => {
    for (const entry of SUITE_GAMES) expect(entry.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  /**
   * The registry is a copy of facts a module also states, and the hub reads the
   * copy so it can render without loading the game. This is the check that the
   * copy is true. Every game added later gets a line here.
   */
  it("agrees with every built module's identity", () => {
    for (const built of [pokerGrid, cipher]) {
      const entry = entryFor(built.identity.id);
      expect(entry).not.toBeNull();
      expect(entry!.displayName).toBe(built.identity.displayName);
      expect(entry!.oneLineRule).toBe(built.identity.oneLineRule);
      expect(entry!.epoch).toEqual(built.identity.epoch);
      expect(entry!.accent).toEqual(built.identity.accent);
      expect(entry!.bucketCount).toBe(built.distribution.labels.length);
      expect(entry!.hasWinLoss).toBe(built.hasWinLoss);
      expect(entry!.stateVersion).toBe(built.stateVersion);
      expect(entry!.status).toBe("live");
    }
  });

  it("starts every game after POKER GRID on the first Monday of the epoch year", () => {
    for (const entry of SUITE_GAMES) {
      if (entry.id === "poker-grid") continue;
      expect(entry.epoch).toEqual({ year: 2026, month: 1, day: 5 });
    }
  });

  it("never offers a planned game as a cross promotion", () => {
    const ids = promotableIds();
    expect(ids).toEqual(LIVE_GAMES.map((entry) => entry.id));
    /* Two live games, so cross promotion has something to offer for the first
       time and each game offers the other. */
    expect(crossPromotionTarget(emptySuiteRecord(), ids, "poker-grid")).toBe("cipher");
    expect(crossPromotionTarget(emptySuiteRecord(), ids, "cipher")).toBe("poker-grid");
  });

  it("offers the least recently played live game once more than one exists", () => {
    const suite = { ...emptySuiteRecord(), lastPlayed: { a: 10, b: 3, c: 7 } };
    expect(crossPromotionTarget(suite, ["a", "b", "c"], "a")).toBe("b");
    expect(crossPromotionTarget(suite, ["a", "b", "c", "d"], "a")).toBe("d");
  });
});
