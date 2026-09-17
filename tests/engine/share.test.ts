import { describe, expect, it, vi } from "vitest";
import { deliverShare, type ShareDeps } from "../../src/engine/share.js";

describe("deliverShare", () => {
  it("prefers Web Share", async () => {
    const share = vi.fn(async () => undefined);
    const writeClipboard = vi.fn(async () => undefined);
    expect(await deliverShare("text", { share, writeClipboard })).toBe("shared");
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("treats a dismissed share sheet as cancelled and does not touch the clipboard", async () => {
    const abort = Object.assign(new Error("dismissed"), { name: "AbortError" });
    const writeClipboard = vi.fn(async () => undefined);
    const deps: ShareDeps = {
      share: async () => {
        throw abort;
      },
      writeClipboard,
    };
    expect(await deliverShare("text", deps)).toBe("cancelled");
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("falls through to the clipboard on a genuine share failure", async () => {
    const fault = vi.fn();
    const outcome = await deliverShare("text", {
      share: async () => {
        throw new Error("not allowed");
      },
      writeClipboard: async () => undefined,
      telemetry: { track: vi.fn(), fault },
    });
    expect(outcome).toBe("copied");
    expect(fault).toHaveBeenCalledOnce();
  });

  it("falls through to the legacy path when the clipboard rejects", async () => {
    const legacyCopy = vi.fn(() => true);
    const outcome = await deliverShare("text", {
      writeClipboard: async () => {
        throw new Error("denied");
      },
      legacyCopy,
    });
    expect(outcome).toBe("copied");
    expect(legacyCopy).toHaveBeenCalledWith("text");
  });

  it("reports manual when every path is absent or fails", async () => {
    expect(await deliverShare("text", {})).toBe("manual");
    expect(await deliverShare("text", { legacyCopy: () => false })).toBe("manual");
  });

  it("skips Web Share entirely where the API is absent", async () => {
    expect(await deliverShare("text", { writeClipboard: async () => undefined })).toBe("copied");
  });
});
