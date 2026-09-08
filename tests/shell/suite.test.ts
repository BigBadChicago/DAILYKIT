import { describe, expect, it } from "vitest";

import { err, type Result } from "../../src/core/result.js";
import type { SerializedState } from "../../src/core/types.js";
import {
  createMemoryBackend,
  emptyGameRecord,
  type PayloadFailure,
  type StorageBackend,
  type StoredResult,
} from "../../src/engine/storage.js";
import { completeSuiteDay } from "../../src/engine/stats.js";
import { SUITE_GAMES, entryFor } from "../../src/shell/registry.js";
import {
  allStatuses,
  dailyCardInput,
  localDateLabel,
  openGameStore,
  openSuite,
  statusFor,
  suiteThemePort,
} from "../../src/shell/suite.js";

const POKER = entryFor("poker-grid")!;
/* Epoch is 2026-01-01, which is puzzle 1, so this is puzzle 3. */
const DAY = new Date(2026, 0, 3, 12, 0, 0);

const refuse = (from: number): Result<SerializedState, PayloadFailure> =>
  err({ code: "unsupported-version", detail: `v${from}` });

function seeded(mutate: (record: ReturnType<typeof emptyGameRecord>) => ReturnType<typeof emptyGameRecord>): StorageBackend {
  const backend = createMemoryBackend();
  const store = openGameStore(backend, POKER, refuse);
  store.save(mutate(emptyGameRecord(POKER.bucketCount)));
  return backend;
}

const result: StoredResult = { score: 5000, won: null, bucket: 0, detail: "0 left", tier: 1 };

describe("statusFor", () => {
  it("reports a planned game without touching storage", () => {
    const backend = createMemoryBackend();
    const planned = SUITE_GAMES.find((entry) => entry.status === "planned")!;
    const status = statusFor(backend, planned, DAY);
    expect(status.play).toBe("planned");
    expect(status.puzzleNumber).toBeNull();
    expect(backend.read(`dailykit:${planned.id}`)).toBeNull();
  });

  it("reports not started on a fresh browser", () => {
    const status = statusFor(createMemoryBackend(), POKER, DAY);
    expect(status.play).toBe("not-started");
    expect(status.puzzleNumber).toBe(3);
  });

  it("reports in progress only when today's board is stored and unfinished", () => {
    const backend = seeded((record) => ({
      ...record,
      watermark: 3,
      live: { puzzleNumber: 3, state: { v: 1, data: "x" }, result: null },
    }));
    expect(statusFor(backend, POKER, DAY).play).toBe("in-progress");
  });

  it("does not read yesterday's board as today's progress", () => {
    const backend = seeded((record) => ({
      ...record,
      watermark: 2,
      live: { puzzleNumber: 2, state: { v: 1, data: "x" }, result: null },
    }));
    expect(statusFor(backend, POKER, DAY).play).toBe("not-started");
  });

  it("reports finished from the history entry and carries the tier", () => {
    const backend = seeded((record) => ({
      ...record,
      watermark: 3,
      history: [{ puzzleNumber: 3, result }],
    }));
    const status = statusFor(backend, POKER, DAY);
    expect(status.play).toBe("finished");
    expect(status.result?.tier).toBe(1);
  });

  it("never advances a watermark just by being read", () => {
    const backend = seeded((record) => ({ ...record, watermark: 1 }));
    const before = backend.read("dailykit:poker-grid");
    statusFor(backend, POKER, DAY);
    expect(backend.read("dailykit:poker-grid")).toBe(before);
  });

  it("reports before-epoch rather than serving puzzle one to a skewed clock", () => {
    expect(statusFor(createMemoryBackend(), POKER, new Date(2025, 5, 1, 12)).play).toBe(
      "before-epoch",
    );
  });
});

describe("the daily card input", () => {
  it("includes only finished games, in registry order, with the suite streak", () => {
    const backend = seeded((record) => ({
      ...record,
      watermark: 3,
      history: [{ puzzleNumber: 3, result }],
    }));
    const suite = completeSuiteDay(openSuite(backend).record, 20456, "poker-grid");
    const input = dailyCardInput(allStatuses(backend, DAY), suite, DAY);
    expect(input.finished).toEqual([{ gameId: "POKER GRID", tier: 1 }]);
    expect(input.totalGames).toBe(SUITE_GAMES.length);
    expect(input.suiteStreak).toBe(1);
    expect(input.date).toBe("2026-01-03");
  });
});

describe("the theme port", () => {
  it("round trips through the suite record and survives a reload", () => {
    const backend = createMemoryBackend();
    suiteThemePort(openSuite(backend)).write("dark");
    expect(suiteThemePort(openSuite(backend)).read()).toBe("dark");
  });

  it("reads an unknown stored choice as none rather than as a fourth state", () => {
    const backend = createMemoryBackend();
    const handle = openSuite(backend);
    handle.update({ ...handle.record, theme: "contrast" });
    expect(suiteThemePort(openSuite(backend)).read()).toBeNull();
  });
});

describe("localDateLabel", () => {
  it("zero pads to a sortable local date", () => {
    expect(localDateLabel(new Date(2026, 8, 8, 23, 59))).toBe("2026-09-08");
  });
});
