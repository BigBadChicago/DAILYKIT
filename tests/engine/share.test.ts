import { describe, expect, it, vi } from "vitest";
import { SHARE_MAX_ROWS, type ShareBlock } from "../../src/core/types.js";
import { SHARE_GLYPHS } from "../../src/shared/share-vocabulary.js";
import { composeShare, deliverShare, type ShareDeps } from "../../src/engine/share.js";

const URL_LINE = "dailykit.providentia.games";

function compose(block: ShareBlock) {
  return composeShare(block, { shareUrl: URL_LINE });
}

describe("composeShare", () => {
  it("puts the title first and the url last", () => {
    const out = compose({ title: "POKER GRID #250 Excellent", rows: [["best"], ["strong"]] });
    expect(out.lines[0]).toBe("POKER GRID #250 Excellent");
    expect(out.lines[out.lines.length - 1]).toBe(URL_LINE);
    expect(out.lines).toHaveLength(4);
  });

  it("renders tokens as their glyphs", () => {
    const out = compose({ title: "t", rows: [["best", "miss"]] });
    expect(out.lines[1]).toBe(`${SHARE_GLYPHS.best}${SHARE_GLYPHS.miss}`);
  });

  it("leaves a one glyph block unpadded, as POKER GRID requires", () => {
    const out = compose({
      title: "POKER GRID #252 Rough",
      rows: [["weak"], ["weak"], ["partial"]],
    });
    for (const line of out.lines.slice(1, -1)) {
      expect(line).not.toContain(SHARE_GLYPHS.barEmpty);
    }
  });

  it("pads to the widest row within the same block and not to a suite constant", () => {
    const out = compose({ title: "t", rows: [["best"], ["barFull", "barFull", "barFull"]] });
    const rendered = out.lines.slice(1, -1);
    expect(rendered[0]).toBe(`${SHARE_GLYPHS.best}${SHARE_GLYPHS.barEmpty}${SHARE_GLYPHS.barEmpty}`);
    expect(rendered[1]).toBe(SHARE_GLYPHS.barFull.repeat(3));
  });

  it("gives every row an identical glyph count", () => {
    const out = compose({
      title: "t",
      rows: [["best"], ["strong", "weak"], ["partial", "partial", "miss"], []],
    });
    const widths = out.lines.slice(1, -1).map((line) => [...line].length);
    expect(new Set(widths).size).toBe(1);
  });

  it("emits no variation selector, which is the usual cause of misalignment", () => {
    const out = compose({ title: "t", rows: [["best"], ["barEmpty"]] });
    expect(out.text).not.toContain("\uFE0F");
  });

  it("handles a zero row block", () => {
    const out = compose({ title: "POKER GRID #253 Rough", rows: [] });
    expect(out.lines).toEqual(["POKER GRID #253 Rough", URL_LINE]);
    expect(out.truncated).toBe(false);
  });

  it("accepts exactly the cap without truncating", () => {
    const rows = Array.from({ length: SHARE_MAX_ROWS }, () => ["weak" as const]);
    const out = compose({ title: "t", rows });
    expect(out.truncated).toBe(false);
    expect(out.lines).toHaveLength(SHARE_MAX_ROWS + 2);
  });

  it("truncates past the cap and reports a fault rather than throwing", () => {
    const fault = vi.fn();
    const rows = Array.from({ length: SHARE_MAX_ROWS + 3 }, () => ["weak" as const]);
    const out = composeShare(
      { title: "t", rows },
      { shareUrl: URL_LINE, telemetry: { track: vi.fn(), fault } },
    );
    expect(out.truncated).toBe(true);
    expect(out.lines).toHaveLength(SHARE_MAX_ROWS + 2);
    expect(fault).toHaveBeenCalledOnce();
  });

  it("holds POKER GRID's nine line cap for a perfect clear", () => {
    const out = compose({
      title: "POKER GRID #250 Excellent streak 12",
      rows: [["best"], ["strong"], ["partial"], ["partial"], ["weak"], ["weak"], ["strong"]],
    });
    expect(out.lines).toHaveLength(9);
  });

  it("refuses a multi line title or url", () => {
    expect(() => compose({ title: "line\nbreak", rows: [] })).toThrow(/single line/);
    expect(() => composeShare({ title: "t", rows: [] }, { shareUrl: "a\nb" })).toThrow(/single line/);
    expect(() => composeShare({ title: "t", rows: [] }, { shareUrl: "  " })).toThrow(/non empty/);
  });

  it("never edits the title", () => {
    const title = "POKER GRID #1120 unrated";
    expect(compose({ title, rows: [["weak"]] }).lines[0]).toBe(title);
  });
});

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
