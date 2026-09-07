// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createToaster } from "../../src/ui/toast.js";

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("toaster", () => {
  it("shows, expires, and stays hidden from assistive technology", () => {
    const toaster = createToaster();
    const host = document.querySelector(".dk-toasts")!;
    expect(host.getAttribute("aria-hidden")).toBe("true");
    toaster.show("Copied");
    expect(host.textContent).toBe("Copied");
    vi.advanceTimersByTime(2600 + 250);
    expect(host.children.length).toBe(0);
    toaster.destroy();
  });

  it("routes announcements through the injected live region and honours assertive", () => {
    const announce = vi.fn();
    const toaster = createToaster(document.body, announce);
    toaster.show("Copied");
    expect(announce).toHaveBeenCalledWith("Copied", false);
    toaster.show("Failed", { assertive: true });
    expect(announce).toHaveBeenCalledWith("Failed", true);
    toaster.show("Silent", { announce: false });
    expect(announce).toHaveBeenCalledTimes(2);
    toaster.destroy();
  });

  it("caps visible toasts at three, dropping the oldest", () => {
    const toaster = createToaster();
    for (const message of ["a", "b", "c", "d"]) toaster.show(message);
    const host = document.querySelector(".dk-toasts")!;
    expect(host.children.length).toBe(3);
    expect(host.textContent).toBe("bcd");
    toaster.destroy();
  });

  it("clear cancels pending timers and destroy removes the host", () => {
    const toaster = createToaster();
    toaster.show("a");
    toaster.clear();
    expect(document.querySelector(".dk-toasts")!.children.length).toBe(0);
    vi.advanceTimersByTime(5000);
    toaster.destroy();
    expect(document.querySelector(".dk-toasts")).toBeNull();
  });
});
