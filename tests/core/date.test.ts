import { describe, expect, it } from "vitest";
import {
  civilFromDays,
  dateForPuzzleNumber,
  daysFromCivil,
  localCivilDate,
  msUntilNextLocalMidnight,
  puzzleNumberFor,
  relateToWatermark,
  weekdayOf,
  type CivilDate,
} from "../../src/core/date.js";

/** POKER GRID, charter decision 5. */
const EPOCH: CivilDate = { year: 2026, month: 1, day: 1 };

describe("daysFromCivil", () => {
  it("anchors at the Unix epoch", () => {
    expect(daysFromCivil({ year: 1970, month: 1, day: 1 })).toBe(0);
  });

  it("matches known day numbers", () => {
    expect(daysFromCivil(EPOCH)).toBe(20454);
    expect(daysFromCivil({ year: 2026, month: 9, day: 7 })).toBe(20703);
  });

  it("handles leap days and the century rules", () => {
    expect(
      daysFromCivil({ year: 2024, month: 3, day: 1 }) - daysFromCivil({ year: 2024, month: 2, day: 28 }),
    ).toBe(2);
    expect(
      daysFromCivil({ year: 1900, month: 3, day: 1 }) - daysFromCivil({ year: 1900, month: 2, day: 28 }),
    ).toBe(1);
    expect(
      daysFromCivil({ year: 2000, month: 3, day: 1 }) - daysFromCivil({ year: 2000, month: 2, day: 28 }),
    ).toBe(2);
  });

  it("rejects out of range fields", () => {
    expect(() => daysFromCivil({ year: 2026, month: 0, day: 1 })).toThrow(RangeError);
    expect(() => daysFromCivil({ year: 2026, month: 13, day: 1 })).toThrow(RangeError);
    expect(() => daysFromCivil({ year: 2026, month: 1, day: 0 })).toThrow(RangeError);
    expect(() => daysFromCivil({ year: 2026, month: 1, day: 1.5 })).toThrow(RangeError);
  });
});

describe("civilFromDays", () => {
  it("round trips every day from 1900 through 2100", () => {
    const start = daysFromCivil({ year: 1900, month: 1, day: 1 });
    const end = daysFromCivil({ year: 2100, month: 12, day: 31 });
    let bad = 0;
    for (let z = start; z <= end; z += 1) {
      if (daysFromCivil(civilFromDays(z)) !== z) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("returns the expected calendar date", () => {
    expect(civilFromDays(0)).toEqual({ year: 1970, month: 1, day: 1 });
    expect(civilFromDays(20454)).toEqual(EPOCH);
  });
});

describe("weekdayOf", () => {
  it("agrees with the charter that the epoch is a Thursday", () => {
    expect(weekdayOf(EPOCH)).toBe(4);
  });

  it("advances by one per day and wraps", () => {
    let previous = weekdayOf({ year: 2026, month: 3, day: 1 });
    for (let day = 2; day <= 31; day += 1) {
      const current = weekdayOf({ year: 2026, month: 3, day });
      expect(current).toBe((previous + 1) % 7);
      previous = current;
    }
  });
});

describe("puzzleNumberFor", () => {
  it("makes the epoch date puzzle one", () => {
    expect(puzzleNumberFor(EPOCH, new Date(2026, 0, 1, 12, 0, 0))).toBe(1);
  });

  it("counts whole local days", () => {
    expect(puzzleNumberFor(EPOCH, new Date(2026, 8, 7, 12, 0, 0))).toBe(250);
    expect(puzzleNumberFor(EPOCH, new Date(2026, 11, 31, 12, 0, 0))).toBe(365);
    expect(puzzleNumberFor(EPOCH, new Date(2027, 0, 1, 12, 0, 0))).toBe(366);
  });

  it("rolls over at local midnight and not before", () => {
    expect(puzzleNumberFor(EPOCH, new Date(2026, 8, 7, 23, 59, 59, 999))).toBe(250);
    expect(puzzleNumberFor(EPOCH, new Date(2026, 8, 8, 0, 0, 0, 0))).toBe(251);
  });

  it("advances by exactly one across a DST transition weekend", () => {
    /* March 8 2026 is the United States spring forward. In a UTC test runner
       this is an ordinary day, and the assertion holds either way, which is the
       point: the computation must not depend on the day being 24 hours long. */
    const before = puzzleNumberFor(EPOCH, new Date(2026, 2, 7, 12, 0, 0));
    const during = puzzleNumberFor(EPOCH, new Date(2026, 2, 8, 12, 0, 0));
    const after = puzzleNumberFor(EPOCH, new Date(2026, 2, 9, 12, 0, 0));
    expect(during - before).toBe(1);
    expect(after - during).toBe(1);
  });

  it("advances by one per day across a full year", () => {
    let previous = puzzleNumberFor(EPOCH, new Date(2026, 0, 1, 12, 0, 0));
    let bad = 0;
    for (let offset = 1; offset < 365; offset += 1) {
      const civil = civilFromDays(daysFromCivil(EPOCH) + offset);
      const current = puzzleNumberFor(
        EPOCH,
        new Date(civil.year, civil.month - 1, civil.day, 12, 0, 0),
      );
      if (current !== previous + 1) bad += 1;
      previous = current;
    }
    expect(bad).toBe(0);
  });

  it("is zero or negative before the epoch, which the scheduler treats as not yet launched", () => {
    expect(puzzleNumberFor(EPOCH, new Date(2025, 11, 31, 12, 0, 0))).toBe(0);
  });
});

describe("dateForPuzzleNumber", () => {
  it("inverts puzzleNumberFor", () => {
    let bad = 0;
    for (let n = 1; n <= 800; n += 1) {
      const civil = dateForPuzzleNumber(EPOCH, n);
      const noon = new Date(civil.year, civil.month - 1, civil.day, 12, 0, 0);
      if (puzzleNumberFor(EPOCH, noon) !== n) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("maps puzzle one to the epoch", () => {
    expect(dateForPuzzleNumber(EPOCH, 1)).toEqual(EPOCH);
  });
});

describe("localCivilDate", () => {
  it("reads local fields rather than UTC fields", () => {
    expect(localCivilDate(new Date(2026, 5, 15, 3, 0, 0))).toEqual({ year: 2026, month: 6, day: 15 });
  });
});

describe("msUntilNextLocalMidnight", () => {
  it("is always positive", () => {
    let bad = 0;
    for (let hour = 0; hour < 24; hour += 1) {
      if (msUntilNextLocalMidnight(new Date(2026, 8, 7, hour, 30, 0)) <= 0) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("never exceeds twenty five hours", () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 1, 0, 0, 1))).toBeLessThanOrEqual(
      25 * 3600000,
    );
  });

  it("lands exactly on the next local day", () => {
    const now = new Date(2026, 8, 7, 17, 42, 13, 500);
    const target = new Date(now.getTime() + msUntilNextLocalMidnight(now));
    expect(localCivilDate(target)).toEqual({ year: 2026, month: 9, day: 8 });
    expect(target.getHours()).toBe(0);
    expect(target.getMinutes()).toBe(0);
    expect(target.getSeconds()).toBe(0);
    expect(target.getMilliseconds()).toBe(0);
  });

  it("crosses a month and a year boundary", () => {
    const monthEnd = new Date(2026, 8, 30, 23, 0, 0);
    expect(
      localCivilDate(new Date(monthEnd.getTime() + msUntilNextLocalMidnight(monthEnd))),
    ).toEqual({ year: 2026, month: 10, day: 1 });

    const yearEnd = new Date(2026, 11, 31, 23, 0, 0);
    expect(localCivilDate(new Date(yearEnd.getTime() + msUntilNextLocalMidnight(yearEnd)))).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });
});

describe("relateToWatermark", () => {
  it("treats a same day return as live, not as archive", () => {
    expect(relateToWatermark(250, 250)).toBe("same");
  });

  it("treats any forward jump as an advance", () => {
    expect(relateToWatermark(251, 250)).toBe("advance");
    expect(relateToWatermark(400, 250)).toBe("advance");
  });

  it("treats anything strictly below the watermark as archive", () => {
    expect(relateToWatermark(249, 250)).toBe("past");
    expect(relateToWatermark(1, 250)).toBe("past");
  });
});
