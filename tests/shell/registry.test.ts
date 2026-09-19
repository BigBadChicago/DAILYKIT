import { describe, expect, it } from "vitest";

import cipher from "../../src/games/cipher/module.js";
import pokerGrid from "../../src/games/poker-grid/module.js";
import vector from "../../src/games/vector/module.js";
import rotateLock from "../../src/games/rotate-lock/module.js";
import { LIVE_GAMES, SUITE_GAMES, entryFor, promotableIds } from "../../src/shell/registry.js";
import { crossPromotionTarget } from "../../src/engine/stats.js";
import { emptySuiteRecord } from "../../src/engine/storage.js";

describe("suite registry", () => {
  it("lists exactly the twelve approved games with unique ids and paths", () => {
    /* Three live, the five approved 2026-09-13, and the four word games added
       2026-09-19. The count is spelled out because changing the slate should
       have to change this line. The uniqueness checks derive from it so they
       cannot drift apart. */
    expect(SUITE_GAMES).toHaveLength(12);
    expect(new Set(SUITE_GAMES.map((entry) => entry.id)).size).toBe(SUITE_GAMES.length);
    expect(new Set(SUITE_GAMES.map((entry) => entry.path)).size).toBe(SUITE_GAMES.length);
    expect(new Set(SUITE_GAMES.map((entry) => entry.accent.hue)).size).toBe(SUITE_GAMES.length);
  });

  it("uses lowercase hyphenated ids, because they are seed and key namespaces", () => {
    for (const entry of SUITE_GAMES) expect(entry.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  /**
   * The registry is a copy of facts a module also states, and the hub reads the
   * copy so it can render without loading the game. This is the check that the
   * copy is true. Every game added later gets a line here.
   *
   * VECTOR shipped without one and the copy drifted on two fields, stateVersion
   * and the board font stack, which is the exact failure this test exists to
   * catch. Adding the game to the list is not optional bookkeeping.
   */
  it("agrees with every built module's identity", () => {
    for (const built of [pokerGrid, vector, cipher]) {
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

  /* Charter Phase 13. ROTATE LOCK is built and stays planned until its own
     certification record is production safe, so it is held to its module on
     every field but status. */
  it("agrees with ROTATE LOCK's module while it waits for certification", () => {
    const entry = entryFor(rotateLock.identity.id);
    expect(entry).not.toBeNull();
    expect(entry!.displayName).toBe(rotateLock.identity.displayName);
    expect(entry!.oneLineRule).toBe(rotateLock.identity.oneLineRule);
    expect(entry!.epoch).toEqual(rotateLock.identity.epoch);
    expect(entry!.accent).toEqual(rotateLock.identity.accent);
    expect(entry!.bucketCount).toBe(rotateLock.distribution.labels.length);
    expect(entry!.hasWinLoss).toBe(rotateLock.hasWinLoss);
    expect(entry!.stateVersion).toBe(rotateLock.stateVersion);
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
    /* Three live games now, so cross promotion always has something to offer.
       With nothing played yet the tie breaks on registry order, which runs
       poker-grid, vector, cipher. */
    expect(crossPromotionTarget(emptySuiteRecord(), ids, "poker-grid")).toBe("vector");
    expect(crossPromotionTarget(emptySuiteRecord(), ids, "cipher")).toBe("poker-grid");
    expect(crossPromotionTarget(emptySuiteRecord(), ids, "vector")).toBe("poker-grid");
  });

  it("offers the least recently played live game once more than one exists", () => {
    const suite = { ...emptySuiteRecord(), lastPlayed: { a: 10, b: 3, c: 7 } };
    expect(crossPromotionTarget(suite, ["a", "b", "c"], "a")).toBe("b");
    expect(crossPromotionTarget(suite, ["a", "b", "c", "d"], "a")).toBe("d");
  });

  /* Slate amendment 2026-09-19. The four word games are the next four built,
     in this order, directly after the two built games and ahead of the three
     deferred ones. The registry order is the hub order and the daily card order,
     so the build order is asserted where it is written. */
  it("places the four word games next, in build order", () => {
    const ids = SUITE_GAMES.map((entry) => entry.id);
    const at = ids.indexOf("difference-relay");
    expect(ids.slice(at + 1, at + 5)).toEqual(["letter-trail", "word-ladder", "pangram", "five-letters"]);
    expect(ids.slice(at + 5)).toEqual(["turn-table", "ring-balance", "order-of-operations"]);
    for (const id of ["letter-trail", "word-ladder", "pangram", "five-letters"]) {
      expect(entryFor(id)?.status).toBe("planned");
    }
  });
});
