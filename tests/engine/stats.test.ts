import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP,
  emptyGameRecord,
  emptySuiteRecord,
  type GameRecord,
  type StoredResult,
} from "../../src/engine/storage.js";
import {
  advanceWatermark,
  archiveResultFor,
  completeArchive,
  completeLive,
  completeSuiteDay,
  crossPromotionTarget,
  nextStreak,
  resultFor,
  summarize,
} from "../../src/engine/stats.js";

const BUCKETS = 8;

function result(overrides: Partial<StoredResult> = {}): StoredResult {
  return { score: 500, won: null, bucket: 2, detail: "10 cards left", tier: 2, ...overrides };
}

function base(): GameRecord {
  return emptyGameRecord(BUCKETS);
}

describe("nextStreak", () => {
  it("continues on the immediately following puzzle", () => {
    expect(nextStreak(4, 250, 251)).toBe(5);
  });

  it("resets to one on any gap", () => {
    expect(nextStreak(4, 250, 252)).toBe(1);
    expect(nextStreak(4, 250, 400)).toBe(1);
  });

  it("resets to one and never to zero", () => {
    expect(nextStreak(0, 0, 250)).toBe(1);
  });

  it("starts a streak from a first ever completion", () => {
    expect(nextStreak(0, 0, 1)).toBe(1);
  });
});

describe("completeLive", () => {
  it("increments every aggregate exactly once", () => {
    const after = completeLive(base(), 1, result({ bucket: 3 }));
    expect(after.played).toBe(1);
    expect(after.currentStreak).toBe(1);
    expect(after.maxStreak).toBe(1);
    expect(after.lastCompletedPuzzle).toBe(1);
    expect(after.watermark).toBe(1);
    expect(after.distribution[3]).toBe(1);
    expect(after.history).toHaveLength(1);
  });

  it("is idempotent for the same puzzle number", () => {
    const once = completeLive(base(), 1, result());
    const twice = completeLive(once, 1, result());
    expect(twice).toBe(once);
    expect(twice.played).toBe(1);
    expect(twice.currentStreak).toBe(1);
  });

  it("builds and breaks a streak across a skipped day", () => {
    let record = base();
    for (const n of [1, 2, 3]) record = completeLive(record, n, result());
    expect(record.currentStreak).toBe(3);
    expect(record.maxStreak).toBe(3);

    record = completeLive(record, 5, result());
    expect(record.currentStreak).toBe(1);
    expect(record.maxStreak).toBe(3);
  });

  it("never awards a streak for a forward clock jump", () => {
    let record = completeLive(base(), 250, result());
    record = completeLive(record, 400, result());
    expect(record.currentStreak).toBe(1);
    expect(record.played).toBe(2);
  });

  it("counts wins only when the module reports one", () => {
    let record = completeLive(base(), 1, result({ won: true }));
    record = completeLive(record, 2, result({ won: false }));
    record = completeLive(record, 3, result({ won: null }));
    expect(record.won).toBe(1);
    expect(record.played).toBe(3);
  });

  it("ignores a bucket index outside the histogram rather than growing it", () => {
    const after = completeLive(base(), 1, result({ bucket: 99 }));
    expect(after.distribution).toHaveLength(BUCKETS);
    expect(after.distribution.reduce((a, b) => a + b, 0)).toBe(0);
    expect(after.played).toBe(1);
  });

  it("caps history while leaving aggregates intact", () => {
    let record = base();
    for (let n = 1; n <= HISTORY_CAP + 50; n += 1) {
      record = completeLive(record, n, result({ bucket: 1 }));
    }
    expect(record.history).toHaveLength(HISTORY_CAP);
    expect(record.history[0]?.puzzleNumber).toBe(51);
    expect(record.played).toBe(HISTORY_CAP + 50);
    expect(record.distribution[1]).toBe(HISTORY_CAP + 50);
    expect(record.currentStreak).toBe(HISTORY_CAP + 50);
  });
});

describe("completeArchive", () => {
  it("touches no aggregate", () => {
    const before = completeLive(base(), 250, result());
    const after = completeArchive(before, 12, result({ bucket: 0 }));
    expect(after.played).toBe(before.played);
    expect(after.currentStreak).toBe(before.currentStreak);
    expect(after.lastCompletedPuzzle).toBe(before.lastCompletedPuzzle);
    expect(after.distribution).toEqual(before.distribution);
    expect(after.archive).toHaveLength(1);
  });

  it("replaces a previous replay of the same puzzle", () => {
    let record = completeArchive(base(), 12, result({ score: 100 }));
    record = completeArchive(record, 12, result({ score: 800 }));
    expect(record.archive).toHaveLength(1);
    expect(archiveResultFor(record, 12)?.score).toBe(800);
  });

  it("caps at the same bound as history", () => {
    let record = base();
    for (let n = 1; n <= HISTORY_CAP + 10; n += 1) record = completeArchive(record, n, result());
    expect(record.archive).toHaveLength(HISTORY_CAP);
  });
});

describe("advanceWatermark", () => {
  it("discards an in progress board from a previous day", () => {
    const stale: GameRecord = {
      ...base(),
      watermark: 250,
      live: { puzzleNumber: 250, state: { v: 1, data: "half played" }, result: null },
    };
    const after = advanceWatermark(stale, 251);
    expect(after.watermark).toBe(251);
    expect(after.live).toEqual({ puzzleNumber: 251, state: null, result: null });
  });

  it("is a no operation at or below the watermark, so a resumed day keeps its board", () => {
    const live: GameRecord = {
      ...base(),
      watermark: 250,
      live: { puzzleNumber: 250, state: { v: 1, data: "half played" }, result: null },
    };
    expect(advanceWatermark(live, 250)).toBe(live);
    expect(advanceWatermark(live, 3)).toBe(live);
  });
});

describe("resultFor", () => {
  it("finds a result in the live session and in history", () => {
    const record = completeLive(base(), 250, result({ score: 777 }));
    expect(resultFor(record, 250)?.score).toBe(777);
    expect(resultFor(record, 249)).toBeNull();

    const later = advanceWatermark(record, 251);
    expect(resultFor(later, 250)?.score).toBe(777);
  });
});

describe("summarize", () => {
  it("suppresses the win row when the module has no win loss", () => {
    const record = completeLive(base(), 1, result());
    expect(summarize(record, false).winPercent).toBeNull();
  });

  it("reports a rounded percentage when the module has win loss", () => {
    let record = base();
    record = completeLive(record, 1, result({ won: true }));
    record = completeLive(record, 2, result({ won: true }));
    record = completeLive(record, 3, result({ won: false }));
    expect(summarize(record, true).winPercent).toBe(67);
  });

  it("reports zero rather than dividing by zero on an empty record", () => {
    expect(summarize(base(), true).winPercent).toBe(0);
    expect(summarize(base(), false).winPercent).toBeNull();
  });

  it("reports the histogram maximum for bar scaling", () => {
    let record = base();
    record = completeLive(record, 1, result({ bucket: 0 }));
    record = completeLive(record, 2, result({ bucket: 0 }));
    record = completeLive(record, 3, result({ bucket: 5 }));
    const summary = summarize(record, false);
    expect(summary.distributionMax).toBe(2);
    expect(summary.distribution).toHaveLength(BUCKETS);
  });
});

describe("completeSuiteDay", () => {
  it("credits a day once regardless of how many games are finished", () => {
    let suite = completeSuiteDay(emptySuiteRecord(), 20703, "poker-grid");
    expect(suite.currentStreak).toBe(1);
    suite = completeSuiteDay(suite, 20703, "toy-tap");
    expect(suite.currentStreak).toBe(1);
    expect(suite.lastPlayed).toEqual({ "poker-grid": 20703, "toy-tap": 20703 });
  });

  it("continues on consecutive days and resets on a gap", () => {
    let suite = completeSuiteDay(emptySuiteRecord(), 20700, "a");
    suite = completeSuiteDay(suite, 20701, "a");
    suite = completeSuiteDay(suite, 20702, "a");
    expect(suite.currentStreak).toBe(3);
    expect(suite.maxStreak).toBe(3);

    suite = completeSuiteDay(suite, 20705, "a");
    expect(suite.currentStreak).toBe(1);
    expect(suite.maxStreak).toBe(3);
  });

  it("does not move the last completed day backward on an archive style day number", () => {
    let suite = completeSuiteDay(emptySuiteRecord(), 20703, "a");
    suite = completeSuiteDay(suite, 20600, "a");
    expect(suite.lastCompletedDay).toBe(20703);
  });
});

describe("crossPromotionTarget", () => {
  const games = ["poker-grid", "game-two", "game-three"];

  it("prefers a game never played", () => {
    const suite = {
      ...emptySuiteRecord(),
      lastPlayed: { "poker-grid": 20703, "game-two": 20700 },
    };
    expect(crossPromotionTarget(suite, games, "poker-grid")).toBe("game-three");
  });

  it("otherwise picks the least recently played", () => {
    const suite = {
      ...emptySuiteRecord(),
      lastPlayed: { "poker-grid": 20703, "game-two": 20690, "game-three": 20700 },
    };
    expect(crossPromotionTarget(suite, games, "poker-grid")).toBe("game-two");
  });

  it("never offers the game just finished, and returns null when it is the only one", () => {
    expect(crossPromotionTarget(emptySuiteRecord(), ["poker-grid"], "poker-grid")).toBeNull();
  });
});
