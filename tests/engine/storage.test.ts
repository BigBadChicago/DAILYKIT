import { beforeEach, describe, expect, it } from "vitest";
import { err, ok } from "../../src/core/result.js";
import {
  ENVELOPE_VERSION,
  GameStore,
  SUITE_KEY,
  SuiteStore,
  createMemoryBackend,
  detectBackend,
  emptyGameRecord,
  emptySuiteRecord,
  gameKey,
  type GameRecord,
  type StorageBackend,
  type StoredResult,
} from "../../src/engine/storage.js";
import type { SerializedState } from "../../src/core/types.js";

const GAME_ID = "poker-grid";
const BUCKETS = 8;
const KEY = gameKey(GAME_ID);

const RESULT: StoredResult = { score: 900, won: null, bucket: 0, detail: "0 cards left", tier: 0 };

function passthroughMigrate(_from: number, raw: SerializedState) {
  return ok({ v: 1, data: raw.data });
}

function makeStore(backend: StorageBackend, migrate = passthroughMigrate): GameStore {
  return new GameStore(backend, GAME_ID, 1, BUCKETS, migrate);
}

function seed(backend: StorageBackend, ev: number, gv: number, data: unknown): void {
  backend.write(KEY, JSON.stringify({ ev, gv, data }));
}

/** A working backend that reports itself persistent, so save outcomes can be
 *  told apart. The memory backend always reports not-persistent by design. */
function persistentBackend(): StorageBackend {
  const inner = createMemoryBackend();
  return {
    persistent: true,
    read: (k) => inner.read(k),
    write: (k, v) => inner.write(k, v),
    remove: (k) => {
      inner.remove(k);
    },
  };
}

describe("detectBackend", () => {
  it("falls back to memory when there is no storage object", () => {
    expect(detectBackend(null).persistent).toBe(false);
  });

  it("falls back to memory when setItem throws, as in iOS private browsing", () => {
    const hostile = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(detectBackend(hostile).persistent).toBe(false);
  });

  it("uses the store when the probe write succeeds", () => {
    const map = new Map<string, string>();
    const usable = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
    const backend = detectBackend(usable);
    expect(backend.persistent).toBe(true);
    backend.write("a", "b");
    expect(backend.read("a")).toBe("b");
    expect(map.has("dailykit:probe")).toBe(false);
  });
});

describe("GameStore.load", () => {
  let backend: StorageBackend;

  beforeEach(() => {
    backend = createMemoryBackend();
  });

  it("treats an absent key as a first visit rather than a recovery", () => {
    const loaded = makeStore(backend).load();
    expect(loaded.recovered).toBe(false);
    expect(loaded.record).toEqual(emptyGameRecord(BUCKETS));
  });

  it("round trips a saved record", () => {
    const store = makeStore(backend);
    const record: GameRecord = {
      ...emptyGameRecord(BUCKETS),
      watermark: 250,
      lastCompletedPuzzle: 250,
      currentStreak: 4,
      maxStreak: 9,
      played: 12,
      distribution: [3, 2, 1, 0, 0, 0, 0, 0],
      live: { puzzleNumber: 250, state: { v: 1, data: { g: "abc" } }, result: RESULT },
      history: [{ puzzleNumber: 250, result: RESULT }],
      tutorialSeen: true,
    };
    store.save(record);
    expect(makeStore(backend).load()).toEqual({ record, recovered: false, persistent: false });
  });

  it("recovers from unparseable JSON", () => {
    backend.write(KEY, "{not json");
    const loaded = makeStore(backend).load();
    expect(loaded.recovered).toBe(true);
    expect(loaded.record).toEqual(emptyGameRecord(BUCKETS));
  });

  it("recovers from a missing envelope", () => {
    backend.write(KEY, JSON.stringify({ watermark: 3 }));
    expect(makeStore(backend).load().recovered).toBe(true);
  });

  it("recovers from an envelope version from the future", () => {
    seed(backend, ENVELOPE_VERSION + 1, 1, emptyGameRecord(BUCKETS));
    expect(makeStore(backend).load().recovered).toBe(true);
  });

  it("recovers from a payload version from the future", () => {
    seed(backend, ENVELOPE_VERSION, 99, emptyGameRecord(BUCKETS));
    expect(makeStore(backend).load().recovered).toBe(true);
  });

  it("recovers from a structurally wrong record", () => {
    const bads: unknown[] = [
      { ...emptyGameRecord(BUCKETS), watermark: -1 },
      { ...emptyGameRecord(BUCKETS), watermark: 1.5 },
      { ...emptyGameRecord(BUCKETS), tutorialSeen: "yes" },
      { ...emptyGameRecord(BUCKETS), distribution: "nope" },
      { ...emptyGameRecord(BUCKETS), distribution: [1, -2, 0, 0, 0, 0, 0, 0] },
      { ...emptyGameRecord(BUCKETS), history: [{ puzzleNumber: 1 }] },
      { ...emptyGameRecord(BUCKETS), live: { puzzleNumber: 1, state: { data: 1 }, result: null } },
      { ...emptyGameRecord(BUCKETS), live: { puzzleNumber: 1, state: null, result: { score: 1 } } },
      [1, 2, 3],
      "string",
      null,
    ];
    for (const bad of bads) {
      backend.write(KEY, JSON.stringify({ ev: ENVELOPE_VERSION, gv: 1, data: bad }));
      expect(makeStore(backend).load().recovered).toBe(true);
    }
  });

  it("pads a short distribution rather than rejecting it", () => {
    seed(backend, ENVELOPE_VERSION, 1, { ...emptyGameRecord(BUCKETS), distribution: [4, 1] });
    const loaded = makeStore(backend).load();
    expect(loaded.recovered).toBe(false);
    expect(loaded.record.distribution).toEqual([4, 1, 0, 0, 0, 0, 0, 0]);
  });

  it("refuses to truncate a nonzero distribution tail", () => {
    seed(backend, ENVELOPE_VERSION, 1, {
      ...emptyGameRecord(BUCKETS),
      distribution: [0, 0, 0, 0, 0, 0, 0, 0, 5],
    });
    expect(makeStore(backend).load().recovered).toBe(true);
  });
});

describe("GameStore payload migration", () => {
  it("hands the in progress payload to the module and keeps the result", () => {
    const backend = createMemoryBackend();
    seed(backend, ENVELOPE_VERSION, 0, {
      ...emptyGameRecord(BUCKETS),
      currentStreak: 7,
      live: { puzzleNumber: 250, state: { v: 0, data: "old" }, result: null },
    });
    const store = new GameStore(backend, GAME_ID, 1, BUCKETS, (from, raw) => {
      expect(from).toBe(0);
      return ok({ v: 1, data: `upgraded:${String(raw.data)}` });
    });
    const loaded = store.load();
    expect(loaded.recovered).toBe(false);
    expect(loaded.record.live?.state).toEqual({ v: 1, data: "upgraded:old" });
    expect(loaded.record.currentStreak).toBe(7);
  });

  it("drops only the board when the module refuses, preserving the streak", () => {
    const backend = createMemoryBackend();
    seed(backend, ENVELOPE_VERSION, 0, {
      ...emptyGameRecord(BUCKETS),
      currentStreak: 7,
      maxStreak: 11,
      played: 30,
      live: { puzzleNumber: 250, state: { v: 0, data: "old" }, result: null },
    });
    const store = new GameStore(backend, GAME_ID, 1, BUCKETS, () =>
      err({ code: "unsupported-version", detail: "no path from 0" }),
    );
    const loaded = store.load();
    expect(loaded.recovered).toBe(false);
    expect(loaded.record.live?.state).toBeNull();
    expect(loaded.record.currentStreak).toBe(7);
    expect(loaded.record.maxStreak).toBe(11);
    expect(loaded.record.played).toBe(30);
  });

  it("does not call the module when versions already match", () => {
    const backend = createMemoryBackend();
    seed(backend, ENVELOPE_VERSION, 1, {
      ...emptyGameRecord(BUCKETS),
      live: { puzzleNumber: 250, state: { v: 1, data: "current" }, result: null },
    });
    let calls = 0;
    const store = new GameStore(backend, GAME_ID, 1, BUCKETS, (_from, raw) => {
      calls += 1;
      return ok(raw);
    });
    store.load();
    expect(calls).toBe(0);
  });
});

describe("GameStore.save", () => {
  it("skips a write when nothing changed", () => {
    const backend = persistentBackend();
    const store = makeStore(backend);
    const record = emptyGameRecord(BUCKETS);
    expect(store.save(record)).toBe("written");
    expect(store.save(record)).toBe("unchanged");
    expect(store.save({ ...record, tutorialSeen: true })).toBe("written");
  });

  it("downgrades to memory on quota exceeded and stays downgraded", () => {
    let allowWrites = true;
    const inner = createMemoryBackend();
    const flaky: StorageBackend = {
      persistent: true,
      read: (k) => inner.read(k),
      write: (k, v) => (allowWrites ? inner.write(k, v) : false),
      remove: (k) => inner.remove(k),
    };
    const store = makeStore(flaky);
    expect(store.save(emptyGameRecord(BUCKETS))).toBe("written");
    expect(store.persistent).toBe(true);

    allowWrites = false;
    expect(store.save({ ...emptyGameRecord(BUCKETS), tutorialSeen: true })).toBe("not-persistent");
    expect(store.persistent).toBe(false);

    allowWrites = true;
    expect(store.save({ ...emptyGameRecord(BUCKETS), played: 1 })).toBe("not-persistent");
  });

  it("keeps the session playable after a quota failure", () => {
    const failing: StorageBackend = {
      persistent: true,
      read: () => null,
      write: () => false,
      remove: () => undefined,
    };
    const store = makeStore(failing);
    const record = { ...emptyGameRecord(BUCKETS), played: 3 };
    expect(store.save(record)).toBe("not-persistent");
    expect(store.save(record)).toBe("unchanged");
  });

  it("reports not-persistent on a memory backend even on a successful write", () => {
    const store = makeStore(createMemoryBackend());
    expect(store.save(emptyGameRecord(BUCKETS))).toBe("not-persistent");
  });

  it("writes an envelope carrying both versions", () => {
    const backend = createMemoryBackend();
    makeStore(backend).save(emptyGameRecord(BUCKETS));
    const written = JSON.parse(backend.read(KEY) as string) as { ev: number; gv: number };
    expect(written.ev).toBe(ENVELOPE_VERSION);
    expect(written.gv).toBe(1);
  });

  it("never touches another game's key", () => {
    const backend = createMemoryBackend();
    new GameStore(backend, "toy-tap", 1, 3, passthroughMigrate).save(emptyGameRecord(3));
    makeStore(backend).save(emptyGameRecord(BUCKETS));
    expect(backend.read(gameKey("toy-tap"))).not.toBeNull();
    expect(backend.read(KEY)).not.toBeNull();
    expect(backend.read(SUITE_KEY)).toBeNull();
  });

  it("clears only its own key", () => {
    const backend = createMemoryBackend();
    const store = makeStore(backend);
    store.save(emptyGameRecord(BUCKETS));
    new SuiteStore(backend).save(emptySuiteRecord());
    store.clear();
    expect(backend.read(KEY)).toBeNull();
    expect(backend.read(SUITE_KEY)).not.toBeNull();
  });
});

describe("SuiteStore", () => {
  it("round trips and recovers independently of any game key", () => {
    const backend = createMemoryBackend();
    const suite = new SuiteStore(backend);
    const record = {
      ...emptySuiteRecord(),
      theme: "dark" as const,
      currentStreak: 5,
      lastPlayed: { "poker-grid": 20703 },
    };
    suite.save(record);
    expect(new SuiteStore(backend).load().record).toEqual(record);

    backend.write(gameKey(GAME_ID), "corrupt");
    expect(new SuiteStore(backend).load().recovered).toBe(false);
  });

  it("recovers from an unknown theme", () => {
    const backend = createMemoryBackend();
    backend.write(
      SUITE_KEY,
      JSON.stringify({ ev: 1, gv: 0, data: { ...emptySuiteRecord(), theme: "neon" } }),
    );
    expect(new SuiteStore(backend).load().recovered).toBe(true);
  });
});
