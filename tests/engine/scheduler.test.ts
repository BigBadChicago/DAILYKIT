import { describe, expect, it, vi } from "vitest";
import type { CivilDate } from "../../src/core/date.js";
import {
  Countdown,
  absoluteDayNumber,
  archiveLength,
  archiveList,
  createClock,
  debugDateOverride,
  formatCountdown,
  resolve,
  type CountdownDeps,
} from "../../src/engine/scheduler.js";

const EPOCH: CivilDate = { year: 2026, month: 1, day: 1 };

describe("resolve", () => {
  it("resolves today as live when the watermark matches", () => {
    expect(resolve(EPOCH, 250, new Date(2026, 8, 7, 9, 0, 0))).toEqual({
      kind: "resolved",
      puzzleNumber: 250,
      relation: "same",
      mode: "live",
      date: { year: 2026, month: 9, day: 7 },
      dayNumber: 20703,
    });
  });

  it("resolves a new day as an advance and still live", () => {
    const out = resolve(EPOCH, 249, new Date(2026, 8, 7, 9, 0, 0));
    expect(out.kind).toBe("resolved");
    if (out.kind !== "resolved") return;
    expect(out.relation).toBe("advance");
    expect(out.mode).toBe("live");
  });

  it("resolves a backward clock jump as archive", () => {
    const out = resolve(EPOCH, 300, new Date(2026, 8, 7, 9, 0, 0));
    expect(out.kind).toBe("resolved");
    if (out.kind !== "resolved") return;
    expect(out.relation).toBe("past");
    expect(out.mode).toBe("archive");
  });

  it("reports before-epoch rather than clamping to puzzle one", () => {
    expect(resolve(EPOCH, 0, new Date(2025, 11, 31, 12, 0, 0))).toEqual({
      kind: "before-epoch",
      epoch: EPOCH,
    });
  });

  it("makes the epoch date itself puzzle one", () => {
    const out = resolve(EPOCH, 0, new Date(2026, 0, 1, 0, 0, 1));
    expect(out.kind === "resolved" && out.puzzleNumber).toBe(1);
  });
});

describe("archiveList", () => {
  it("is newest first and excludes today", () => {
    const list = archiveList(EPOCH, 250, { limit: 3 });
    expect(list.map((item) => item.puzzleNumber)).toEqual([249, 248, 247]);
    expect(list[0]?.date).toEqual({ year: 2026, month: 9, day: 6 });
  });

  it("pages without gaps or overlaps", () => {
    const first = archiveList(EPOCH, 250, { limit: 5, offset: 0 }).map((i) => i.puzzleNumber);
    const second = archiveList(EPOCH, 250, { limit: 5, offset: 5 }).map((i) => i.puzzleNumber);
    expect(first).toEqual([249, 248, 247, 246, 245]);
    expect(second).toEqual([244, 243, 242, 241, 240]);
  });

  it("stops at puzzle one rather than producing zero or negatives", () => {
    expect(archiveList(EPOCH, 3, { limit: 10 }).map((i) => i.puzzleNumber)).toEqual([2, 1]);
  });

  it("is empty on the first two days", () => {
    expect(archiveList(EPOCH, 1)).toEqual([]);
    expect(archiveLength(1)).toBe(0);
    expect(archiveLength(250)).toBe(249);
  });

  it("round trips each entry back to its own puzzle number", () => {
    let bad = 0;
    for (const item of archiveList(EPOCH, 400, { limit: 40 })) {
      const noon = new Date(item.date.year, item.date.month - 1, item.date.day, 12, 0, 0);
      const out = resolve(EPOCH, 400, noon);
      if (out.kind !== "resolved" || out.puzzleNumber !== item.puzzleNumber) bad += 1;
    }
    expect(bad).toBe(0);
  });
});

describe("debugDateOverride", () => {
  it("returns null when disabled, whatever the query says", () => {
    expect(debugDateOverride("?d=2026-03-01", false)).toBeNull();
  });

  it("parses a valid date to local noon", () => {
    const out = debugDateOverride("?d=2026-03-01", true);
    expect(out?.getFullYear()).toBe(2026);
    expect(out?.getMonth()).toBe(2);
    expect(out?.getDate()).toBe(1);
    expect(out?.getHours()).toBe(12);
  });

  it("rejects malformed and impossible dates", () => {
    for (const search of [
      "",
      "?x=1",
      "?d=",
      "?d=2026-3-1",
      "?d=20260301",
      "?d=2026-13-01",
      "?d=2026-02-31",
      "?d=nope",
    ]) {
      expect(debugDateOverride(search, true)).toBeNull();
    }
  });
});

describe("createClock", () => {
  it("returns the override without letting a caller mutate it", () => {
    const clock = createClock(new Date(2026, 8, 7, 12, 0, 0));
    const first = clock();
    first.setFullYear(1999);
    expect(clock().getFullYear()).toBe(2026);
  });

  it("returns live time with no override", () => {
    expect(createClock(null)().getTime()).toBeGreaterThan(0);
  });
});

describe("formatCountdown", () => {
  it("zero pads every field", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(1000)).toBe("00:00:01");
    expect(formatCountdown(3661000)).toBe("01:01:01");
    expect(formatCountdown(86399000)).toBe("23:59:59");
  });

  it("accommodates a twenty five hour day without a special case", () => {
    expect(formatCountdown(25 * 3600000)).toBe("25:00:00");
  });

  it("floors rather than rounding, and clamps a negative", () => {
    expect(formatCountdown(1999)).toBe("00:00:01");
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
});

describe("Countdown", () => {
  function harness(start: Date) {
    let current = start;
    const timers: { fn: () => void; ms: number }[] = [];
    const deps: CountdownDeps = {
      now: () => current,
      setTimer: (fn, ms) => {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimer: (handle) => {
        timers[handle - 1] = { fn: () => undefined, ms: 0 };
      },
    };
    return {
      deps,
      timers,
      advance(ms: number) {
        current = new Date(current.getTime() + ms);
      },
      fire() {
        const next = timers.pop();
        next?.fn();
      },
    };
  }

  it("ticks with a recomputed remaining time rather than a decrement", () => {
    const h = harness(new Date(2026, 8, 7, 23, 59, 55));
    const onTick = vi.fn();
    const onRollover = vi.fn();
    const countdown = new Countdown(h.deps, { onTick, onRollover });

    countdown.start();
    expect(onTick).toHaveBeenLastCalledWith(5000);

    /* The tab was hidden for three seconds while timers were throttled. */
    h.advance(3000);
    h.fire();
    expect(onTick).toHaveBeenLastCalledWith(2000);
    expect(onRollover).not.toHaveBeenCalled();
  });

  it("fires rollover exactly once and stops", () => {
    const h = harness(new Date(2026, 8, 7, 23, 59, 59));
    const onRollover = vi.fn();
    const countdown = new Countdown(h.deps, { onTick: vi.fn(), onRollover });

    countdown.start();
    h.advance(1500);
    h.fire();
    expect(onRollover).toHaveBeenCalledOnce();
    expect(countdown.running).toBe(false);
  });

  it("survives a long background gap that spans midnight", () => {
    const h = harness(new Date(2026, 8, 7, 20, 0, 0));
    const onRollover = vi.fn();
    const countdown = new Countdown(h.deps, { onTick: vi.fn(), onRollover });
    countdown.start();
    h.advance(6 * 3600000);
    h.fire();
    expect(onRollover).toHaveBeenCalledOnce();
  });

  it("does not stack timers when started repeatedly", () => {
    const h = harness(new Date(2026, 8, 7, 12, 0, 0));
    const countdown = new Countdown(h.deps, { onTick: vi.fn(), onRollover: vi.fn() });
    countdown.start();
    countdown.start();
    countdown.start();
    expect(h.timers).toHaveLength(1);
  });

  it("recomputes immediately on resume", () => {
    const h = harness(new Date(2026, 8, 7, 23, 59, 50));
    const onTick = vi.fn();
    const countdown = new Countdown(h.deps, { onTick, onRollover: vi.fn() });
    countdown.start();
    h.advance(4000);
    countdown.resume();
    expect(onTick).toHaveBeenLastCalledWith(6000);
  });

  it("stops cleanly and ticks no further", () => {
    const h = harness(new Date(2026, 8, 7, 12, 0, 0));
    const onTick = vi.fn();
    const countdown = new Countdown(h.deps, { onTick, onRollover: vi.fn() });
    countdown.start();
    countdown.stop();
    const before = onTick.mock.calls.length;
    h.fire();
    expect(onTick.mock.calls.length).toBe(before);
  });
});

describe("absoluteDayNumber", () => {
  it("matches the day number resolve reports", () => {
    expect(absoluteDayNumber(new Date(2026, 8, 7, 3, 0, 0))).toBe(20703);
  });
});
