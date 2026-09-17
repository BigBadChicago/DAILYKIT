import { describe, expect, it, vi } from "vitest";
import type { ShareRow } from "../../src/core/types.js";
import {
  SHARE_MAX_LINES,
  SHARE_MAX_ROWS,
  SHARE_MAX_TOKENS_PER_ROW,
  composeShareText,
  renderArtifactText,
  validateArtifactText,
  type ShareText,
} from "../../src/engine/share-grammar.js";
import { SHARE_GLYPHS } from "../../src/shared/share-vocabulary.js";

const URL_LINE = "dailykit.providentia.games";

function rows(count: number, width = 1): ShareRow[] {
  return Array.from({ length: count }, () => Array.from({ length: width }, () => "weak" as const));
}

function faultSink() {
  return { track: vi.fn(), fault: vi.fn() };
}

describe("renderArtifactText", () => {
  it("puts the title first and the url last", () => {
    const lines = renderArtifactText({ title: "POKER GRID #250 Excellent", rows: [["best"], ["strong"]] }, URL_LINE);
    expect(lines).toEqual(["POKER GRID #250 Excellent", SHARE_GLYPHS.best, SHARE_GLYPHS.strong, URL_LINE]);
  });

  it("renders tokens as their glyphs and never pads", () => {
    const lines = renderArtifactText({ title: "t", rows: [["best", "miss"], ["best"]] }, URL_LINE);
    expect(lines[1]).toBe(`${SHARE_GLYPHS.best}${SHARE_GLYPHS.miss}`);
    expect(lines[2]).toBe(SHARE_GLYPHS.best);
  });

  it("emits no variation selector, which is the usual cause of misalignment", () => {
    const text = renderArtifactText({ title: "t", rows: [["best"], ["barEmpty"]] }, URL_LINE).join("\n");
    expect(text).not.toContain("️");
  });
});

describe("validateArtifactText", () => {
  it("keeps the row cap in step with the nine line cap", () => {
    expect(SHARE_MAX_ROWS).toBe(SHARE_MAX_LINES - 2);
  });

  it("accepts a zero row block and exactly the row cap", () => {
    expect(validateArtifactText({ title: "t", rows: [] }, URL_LINE).ok).toBe(true);
    expect(validateArtifactText({ title: "t", rows: rows(SHARE_MAX_ROWS) }, URL_LINE).ok).toBe(true);
  });

  it("accepts the widest legal row", () => {
    expect(validateArtifactText({ title: "t", rows: rows(2, SHARE_MAX_TOKENS_PER_ROW) }, URL_LINE).ok).toBe(true);
  });

  const refusals: readonly [string, ShareText, string][] = [
    ["too-tall", { title: "t", rows: rows(SHARE_MAX_ROWS + 1) }, URL_LINE],
    ["row-too-wide", { title: "t", rows: rows(1, SHARE_MAX_TOKENS_PER_ROW + 1) }, URL_LINE],
    ["empty-row", { title: "t", rows: [[]] }, URL_LINE],
    ["ragged-rows", { title: "t", rows: [["best"], ["best", "best"]] }, URL_LINE],
    ["bad-title", { title: "", rows: [] }, URL_LINE],
    ["bad-title", { title: "line\nbreak", rows: [] }, URL_LINE],
    ["bad-url", { title: "t", rows: [] }, "a b"],
    ["bad-url", { title: "t", rows: [] }, ""],
  ];
  for (const [code, share, url] of refusals) {
    it(`refuses ${code} for ${JSON.stringify(share.title)} and ${String(share.rows.length)} rows`, () => {
      const result = validateArtifactText(share, url);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe(code);
    });
  }

  /* Requirement 3.5.4. v2 padding made this hold for free; v3 enforces it. */
  it("refuses a ragged block even when every row is individually legal", () => {
    const result = validateArtifactText({ title: "t", rows: [["best", "best"], ["best", "best"], ["best"]] }, URL_LINE);
    expect(result.ok).toBe(false);
  });
});

describe("composeShareText", () => {
  it("delivers a valid block unchanged with no fault", () => {
    const sink = faultSink();
    const out = composeShareText({ title: "POKER GRID #1120 unrated", rows: [["weak"]] }, URL_LINE, sink);
    expect(out.fault).toBeNull();
    expect(out.lines).toEqual(["POKER GRID #1120 unrated", SHARE_GLYPHS.weak, URL_LINE]);
    expect(out.text).toBe(out.lines.join("\n"));
    expect(sink.fault).not.toHaveBeenCalled();
  });

  it("holds POKER GRID's nine line cap for a perfect clear", () => {
    const out = composeShareText(
      {
        title: "POKER GRID #250 Excellent streak 12",
        rows: [["best"], ["strong"], ["partial"], ["partial"], ["weak"], ["weak"], ["strong"]],
      },
      URL_LINE,
    );
    expect(out.fault).toBeNull();
    expect(out.lines).toHaveLength(SHARE_MAX_LINES);
  });

  it("truncates past the row cap and reports a fault rather than throwing", () => {
    const sink = faultSink();
    const out = composeShareText({ title: "t", rows: rows(SHARE_MAX_ROWS + 3) }, URL_LINE, sink);
    expect(out.fault?.code).toBe("too-tall");
    expect(out.lines).toHaveLength(SHARE_MAX_LINES);
    expect(sink.fault).toHaveBeenCalledOnce();
  });

  it("cuts an over wide row to the token cap", () => {
    const out = composeShareText({ title: "t", rows: rows(1, SHARE_MAX_TOKENS_PER_ROW + 2) }, URL_LINE);
    expect(out.fault?.code).toBe("row-too-wide");
    expect([...(out.lines[1] as string)]).toHaveLength(SHARE_MAX_TOKENS_PER_ROW);
  });

  it("drops empty rows", () => {
    const out = composeShareText({ title: "t", rows: [["best"], [], ["best"]] }, URL_LINE);
    expect(out.fault?.code).toBe("empty-row");
    expect(out.lines).toEqual(["t", SHARE_GLYPHS.best, SHARE_GLYPHS.best, URL_LINE]);
  });

  it("keeps the first line of a multi line title and never invents text for a real one", () => {
    const out = composeShareText({ title: "CIPHER #3 Great\nsecret", rows: [] }, URL_LINE);
    expect(out.fault?.code).toBe("bad-title");
    expect(out.lines).toEqual(["CIPHER #3 Great", URL_LINE]);
  });

  it("names the suite when a module supplies no title at all", () => {
    const out = composeShareText({ title: "", rows: [] }, URL_LINE);
    expect(out.lines[0]).toBe("DAILYKIT");
  });

  it("delivers a ragged block as it is, because adding a token would be a claim", () => {
    const out = composeShareText({ title: "t", rows: [["best"], ["best", "miss"]] }, URL_LINE);
    expect(out.fault?.code).toBe("ragged-rows");
    expect(out.lines.slice(1, -1)).toEqual([SHARE_GLYPHS.best, `${SHARE_GLYPHS.best}${SHARE_GLYPHS.miss}`]);
  });

  it("throws on a bad url, which is a suite constant rather than module output", () => {
    expect(() => composeShareText({ title: "t", rows: [] }, "a\nb")).toThrow();
    expect(() => composeShareText({ title: "t", rows: [] }, "  ")).toThrow();
  });
});
