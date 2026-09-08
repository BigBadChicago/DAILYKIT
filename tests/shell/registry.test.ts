import { describe, expect, it } from "vitest";

import pokerGrid from "../../src/games/poker-grid/module.js";
import {
  LIVE_GAMES,
  RESERVED_GAME_IDS,
  SUITE_GAMES,
  entryFor,
  isUsableGameId,
  promotableIds,
} from "../../src/shell/registry.js";
import { crossPromotionTarget } from "../../src/engine/stats.js";
import { KEY_PREFIX, SUITE_KEY, emptySuiteRecord, gameKey } from "../../src/engine/storage.js";

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
   * The namespace guarantee, asserted rather than assumed. A game whose id
   * collided with the suite record or the storage probe would corrupt them
   * silently, and only for players who had both games.
   */
  it("gives every game a storage key that collides with nothing the engine owns", () => {
    const engineKeys = new Set([SUITE_KEY, `${KEY_PREFIX}:probe`]);
    const seen = new Set<string>();

    for (const entry of SUITE_GAMES) {
      expect(isUsableGameId(entry.id)).toBe(true);
      expect(RESERVED_GAME_IDS).not.toContain(entry.id);

      const key = gameKey(entry.id);
      expect(key.startsWith(`${KEY_PREFIX}:`)).toBe(true);
      expect(engineKeys.has(key)).toBe(false);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    expect(seen.size).toBe(SUITE_GAMES.length);
  });

  it("refuses an id the engine has already spent", () => {
    for (const reserved of RESERVED_GAME_IDS) expect(isUsableGameId(reserved)).toBe(false);
    expect(isUsableGameId("Vector")).toBe(false);
    expect(isUsableGameId("tally_drop")).toBe(false);
    expect(isUsableGameId("vector")).toBe(true);
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
