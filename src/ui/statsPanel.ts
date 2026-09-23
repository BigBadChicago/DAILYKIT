/**
 * Layer 2. The statistics panel body. Requirement 3.4 and 7.3.4.
 *
 * Takes a view model rather than importing engine/stats.ts. The panel must
 * render an archive summary, a suite aggregate, and a live game from the same
 * code, and those are three different producers in Layer 1. A view model is
 * also what lets the harness and the tests build a panel without a storage
 * backend.
 */

import { el, patchKeyed, setClass, setText } from "./dom.js";

export interface DistributionView {
  readonly labels: readonly string[];
  readonly counts: readonly number[];
  /** Rendered with emphasis. Mirrors DistributionSpec.distinguishedIndex. */
  readonly distinguishedIndex: number | null;
  /** The bucket this session landed in, highlighted. Null outside a result. */
  readonly currentIndex: number | null;
}

export interface ActivityDay {
  readonly puzzleNumber: number;
  readonly status: "cleared" | "failed" | "played" | "empty";
  readonly label: string;
}

export interface StatsView {
  readonly played: number;
  /** Null when the module sets hasWinLoss false. Suppresses the win rate row,
   *  per recorded conflict resolution 1. */
  readonly wins: number | null;
  readonly currentStreak: number;
  readonly maxStreak: number;
  /** Consecutive days with at least one suite game finished. Null until the
   *  hub exists and a suite record is being kept. */
  readonly suiteStreak: number | null;
  readonly distribution: DistributionView;
  readonly activityGrid?: readonly ActivityDay[];
}

export interface StatsPanelOptions {
  /** Rendered below the histogram. The shell puts the share button and the
   *  countdown here, because share delivery is Layer 1 and the countdown is a
   *  separate view with its own lifecycle. */
  readonly footer?: (host: HTMLElement) => void;
}

export interface StatsPanelView {
  update(stats: StatsView): void;
  destroy(): void;
}

export function winPercent(played: number, wins: number): number {
  return played === 0 ? 0 : Math.round((wins / played) * 100);
}

/** Longest bar is full width. A shared maximum across panels would make a
 *  first day histogram look empty. */
export function barPercents(counts: readonly number[]): number[] {
  const max = counts.reduce((a, b) => (b > a ? b : a), 0);
  return counts.map((count) => (max === 0 ? 0 : Math.max(4, Math.round((count / max) * 100))));
}

interface Figure {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly note: string | null;
}

function figuresFor(stats: StatsView): Figure[] {
  const figures: Figure[] = [
    { key: "played", label: "Played", value: String(stats.played), note: null },
  ];
  if (stats.wins !== null) {
    figures.push({
      key: "winrate",
      label: "Win rate",
      value: `${winPercent(stats.played, stats.wins)}%`,
      note: null,
    });
  }
  figures.push(
    { key: "streak", label: "Streak", value: String(stats.currentStreak), note: null },
    { key: "maxstreak", label: "Max streak", value: String(stats.maxStreak), note: null },
    {
      key: "suitestreak",
      label: "Suite streak",
      value: String(stats.suiteStreak ?? 0),
      note: stats.suiteStreak === null ? "Counts once the suite hub is live." : null,
    },
  );
  return figures;
}

export function renderStatsPanel(host: HTMLElement, options?: StatsPanelOptions): StatsPanelView {
  const figures = el("dl", { class: "dk-stats__figures" });
  const gridLabel = el("h3", { class: "dk-stats__heading dk-hidden", text: "30 Day Activity" });
  const activityGrid = el("div", {
    class: "dk-stats__grid dk-hidden",
    attrs: { role: "grid", "aria-label": "30 day activity grid" },
  });
  const histLabel = el("h3", { class: "dk-stats__heading", text: "Distribution" });
  const histogram = el("div", { class: "dk-stats__hist", attrs: { role: "list" } });
  const footer = el("div", { class: "dk-stats__footer" });

  host.appendChild(figures);
  host.appendChild(gridLabel);
  host.appendChild(activityGrid);
  host.appendChild(histLabel);
  host.appendChild(histogram);
  host.appendChild(footer);
  options?.footer?.(footer);

  const paintFigures = (stats: StatsView): void => {
    patchKeyed(
      figures,
      figuresFor(stats),
      (figure) => figure.key,
      () =>
        el("div", { class: "dk-stats__figure" }, [
          el("dt", { class: "dk-stats__label" }),
          el("dd", { class: "dk-stats__value" }),
          el("p", { class: "dk-stats__note" }),
        ]),
      (node, figure) => {
        setText(node.children[0]!, figure.label);
        setText(node.children[1]!, figure.value);
        const note = node.children[2] as HTMLElement;
        setText(note, figure.note ?? "");
        setClass(note, "dk-hidden", figure.note === null);
      },
    );
  };

  const paintActivityGrid = (stats: StatsView): void => {
    const days = stats.activityGrid;
    if (!days || days.length === 0) {
      setClass(gridLabel, "dk-hidden", true);
      setClass(activityGrid, "dk-hidden", true);
      return;
    }
    setClass(gridLabel, "dk-hidden", false);
    setClass(activityGrid, "dk-hidden", false);

    patchKeyed(
      activityGrid,
      days,
      (day) => String(day.puzzleNumber),
      () =>
        el("div", {
          class: "dk-stats__grid-cell",
          attrs: { role: "gridcell" },
        }),
      (node, day) => {
        setClass(node, "dk-stats__grid-cell--cleared", day.status === "cleared");
        setClass(node, "dk-stats__grid-cell--failed", day.status === "failed");
        setClass(node, "dk-stats__grid-cell--played", day.status === "played");
        setClass(node, "dk-stats__grid-cell--empty", day.status === "empty");
        node.setAttribute("aria-label", day.label);
        node.setAttribute("title", day.label);
      },
    );
  };

  const paintHistogram = (stats: StatsView): void => {
    const dist = stats.distribution;
    const widths = barPercents(dist.counts);
    const rows = dist.labels.map((label, index) => ({
      label,
      count: dist.counts[index] ?? 0,
      width: widths[index] ?? 0,
      index,
    }));
    patchKeyed(
      histogram,
      rows,
      (row) => String(row.index),
      () =>
        el("div", { class: "dk-hist__row", attrs: { role: "listitem" } }, [
          el("span", { class: "dk-hist__label" }),
          el("span", { class: "dk-hist__bar" }, [el("span", { class: "dk-hist__count" })]),
        ]),
      (node, row) => {
        setText(node.children[0]!, row.label);
        const bar = node.children[1] as HTMLElement;
        bar.style.width = `${row.width}%`;
        setText(bar.firstElementChild!, String(row.count));
        setClass(node, "dk-hist__row--current", row.index === dist.currentIndex);
        setClass(node, "dk-hist__row--distinguished", row.index === dist.distinguishedIndex);
        // Requirement 8.1. The highlighted bucket must not be highlighted by
        // color alone, so the accessible name carries it too.
        node.setAttribute(
          "aria-label",
          row.index === dist.currentIndex
            ? `${row.label}, ${row.count}, this game`
            : `${row.label}, ${row.count}`,
        );
      },
    );
  };

  return {
    update(stats: StatsView): void {
      paintFigures(stats);
      paintActivityGrid(stats);
      paintHistogram(stats);
    },
    destroy(): void {
      figures.remove();
      gridLabel.remove();
      activityGrid.remove();
      histLabel.remove();
      histogram.remove();
      footer.remove();
    },
  };
}
