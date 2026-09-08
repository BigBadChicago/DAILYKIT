import { describe, expect, it } from "vitest";

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
    const entry = entryFor(pokerGrid.identity.id);
    expect(entry).not.toBeNull();
    expect(entry!.displayName).toBe(pokerGrid.identity.displayName);
    expect(entry!.oneLineRule).toBe(pokerGrid.identity.oneLineRule);
    expect(entry!.epoch).toEqual(pokerGrid.identity.epoch);
    expect(entry!.accent).toEqual(pokerGrid.identity.accent);
    expect(entry!.bucketCount).toBe(pokerGrid.distribution.labels.length);
    expect(entry!.hasWinLoss).toBe(pokerGrid.hasWinLoss);
    expect(entry!.stateVersion).toBe(pokerGrid.stateVersion);
    expect(entry!.status).toBe("live");
  });

  it("never offers a planned game as a cross promotion", () => {
    const ids = promotableIds();
    expect(ids).toEqual(LIVE_GAMES.map((entry) => entry.id));
    /* One live game today, so the only honest answer is no offer at all. */
    expect(crossPromotionTarget(emptySuiteRecord(), ids, "poker-grid")).toBeNull();
  });

  it("offers the least recently played live game once more than one exists", () => {
    const suite = { ...emptySuiteRecord(), lastPlayed: { a: 10, b: 3, c: 7 } };
    expect(crossPromotionTarget(suite, ["a", "b", "c"], "a")).toBe("b");
    expect(crossPromotionTarget(suite, ["a", "b", "c", "d"], "a")).toBe("d");
  });
});
