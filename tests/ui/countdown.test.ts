// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCountdown, formatDuration } from "../../src/ui/countdown.js";
import { el } from "../../src/ui/dom.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("formatDuration", () => {
  it("pads to two digits and clamps at zero", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(-5000)).toBe("00:00:00");
    expect(formatDuration(3661_000)).toBe("01:01:01");
    expect(formatDuration(86_399_000)).toBe("23:59:59");
  });

  it("does not round a partial second up", () => {
    expect(formatDuration(1999)).toBe("00:00:01");
  });
});

describe("countdown", () => {
  it("recomputes from the clock rather than decrementing per tick", () => {
    let now = 0;
    const host = el("div");
    const countdown = createCountdown({ host, targetAt: () => 10_000, now: () => now });
    countdown.start();
    expect(host.textContent).toContain("00:00:10");
    // A backgrounded tab: one timer fires after five seconds of wall clock.
    now = 5000;
    vi.advanceTimersByTime(1000);
    expect(host.textContent).toContain("00:00:05");
    countdown.destroy();
  });

  it("fires onElapsed once, stops, and marks the label off for live regions", () => {
    let now = 0;
    const onElapsed = vi.fn();
    const host = el("div");
    const countdown = createCountdown({ host, targetAt: () => 2000, now: () => now, onElapsed });
    expect(countdown.element.getAttribute("aria-live")).toBe("off");
    countdown.start();
    now = 2500;
    vi.advanceTimersByTime(1000);
    expect(onElapsed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onElapsed).toHaveBeenCalledTimes(1);
    countdown.destroy();
  });

  it("refreshes on visibility change", () => {
    let now = 0;
    const host = el("div");
    const countdown = createCountdown({ host, targetAt: () => 60_000, now: () => now });
    countdown.start();
    now = 30_000;
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(host.textContent).toContain("00:00:30");
    countdown.destroy();
  });

  it("reads a moving target so a rollover needs no new view", () => {
    let now = 0;
    let target = 5000;
    const host = el("div");
    const countdown = createCountdown({ host, targetAt: () => target, now: () => now });
    countdown.start();
    target = 90_000;
    countdown.refresh();
    expect(host.textContent).toContain("00:01:30");
    countdown.destroy();
  });

  it("destroy removes the element and stops the timer", () => {
    const host = el("div");
    const countdown = createCountdown({ host, targetAt: () => 10_000, now: () => 0 });
    countdown.start();
    countdown.destroy();
    expect(host.children.length).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
