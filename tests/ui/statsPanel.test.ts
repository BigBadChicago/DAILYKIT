// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { barPercents, renderStatsPanel, winPercent, type StatsView } from "../../src/ui/statsPanel.js";
import { el } from "../../src/ui/dom.js";

const base: StatsView = {
  played: 10,
  wins: null,
  currentStreak: 3,
  maxStreak: 9,
  suiteStreak: null,
  distribution: {
    labels: ["Perfect Clear", "5 left", "10 left"],
    counts: [1, 4, 5],
    distinguishedIndex: 0,
    currentIndex: 1,
  },
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("pure helpers", () => {
  it("winPercent rounds and treats zero played as zero", () => {
    expect(winPercent(0, 0)).toBe(0);
    expect(winPercent(3, 1)).toBe(33);
    expect(winPercent(8, 7)).toBe(88);
  });

  it("barPercents scales to the local maximum with a visible floor", () => {
    expect(barPercents([0, 0, 0])).toEqual([0, 0, 0]);
    expect(barPercents([10, 5, 0])).toEqual([100, 50, 4]);
  });
});

describe("stats panel", () => {
  it("suppresses the win rate row when wins is null", () => {
    const host = el("div");
    const panel = renderStatsPanel(host);
    panel.update(base);
    expect(host.textContent).not.toContain("Win rate");
    panel.update({ ...base, wins: 6 });
    expect(host.textContent).toContain("Win rate");
    expect(host.querySelector("[data-key=winrate] .dk-stats__value")!.textContent).toBe("60%");
  });

  it("renders the suite streak row now, with a note while it is null", () => {
    const host = el("div");
    const panel = renderStatsPanel(host);
    panel.update(base);
    const row = host.querySelector("[data-key=suitestreak]")!;
    expect(row.querySelector(".dk-stats__value")!.textContent).toBe("0");
    expect(row.querySelector(".dk-stats__note")!.classList.contains("dk-hidden")).toBe(false);
    panel.update({ ...base, suiteStreak: 4 });
    expect(row.querySelector(".dk-stats__value")!.textContent).toBe("4");
    expect(row.querySelector(".dk-stats__note")!.classList.contains("dk-hidden")).toBe(true);
  });

  it("marks the current and distinguished buckets and names the current one", () => {
    const host = el("div");
    const panel = renderStatsPanel(host);
    panel.update(base);
    const rows = host.querySelectorAll(".dk-hist__row");
    expect(rows[1]!.classList.contains("dk-hist__row--current")).toBe(true);
    expect(rows[1]!.getAttribute("aria-label")).toBe("5 left, 4, this game");
    expect(rows[0]!.classList.contains("dk-hist__row--distinguished")).toBe(true);
    expect(rows[0]!.getAttribute("aria-label")).toBe("Perfect Clear, 1");
  });

  it("moves the current highlight on a second update without rebuilding rows", () => {
    const host = el("div");
    const panel = renderStatsPanel(host);
    panel.update(base);
    const firstRow = host.querySelector(".dk-hist__row")!;
    panel.update({ ...base, distribution: { ...base.distribution, currentIndex: 0 } });
    expect(host.querySelector(".dk-hist__row")).toBe(firstRow);
    expect(firstRow.classList.contains("dk-hist__row--current")).toBe(true);
  });

  it("renders the footer slot and destroys cleanly", () => {
    const host = el("div");
    const panel = renderStatsPanel(host, {
      footer: (slot) => slot.appendChild(el("button", { text: "Share" })),
    });
    panel.update(base);
    expect(host.querySelector(".dk-stats__footer button")!.textContent).toBe("Share");
    panel.destroy();
    expect(host.children.length).toBe(0);
  });

  it("handles a zero played first session", () => {
    const host = el("div");
    const panel = renderStatsPanel(host);
    panel.update({
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      suiteStreak: 0,
      distribution: { labels: ["a", "b"], counts: [0, 0], distinguishedIndex: 0, currentIndex: null },
    });
    expect(host.querySelector("[data-key=winrate] .dk-stats__value")!.textContent).toBe("0%");
    expect(host.querySelectorAll(".dk-hist__row--current").length).toBe(0);
  });
});
