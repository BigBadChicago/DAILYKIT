/**
 * Layer 5. The hub. Requirement 7.3.1, 7.3.4, and 7.3.5.
 *
 * The hub is the landing page, so its cost is the suite's first impression
 * cost. It therefore imports no game and no solver, only Layer 0 through 2 plus
 * the registry, which is data. Everything it shows about a game comes either
 * from the registry or from that game's own storage key, both of which are
 * readable without executing a line of that game's code.
 */

import "../ui/chrome.css";
import "./hub.css";

import { el, on, patchKeyed, setAttr, setClass, setText } from "../ui/dom.js";
import { createLiveRegion } from "../ui/a11y.js";
import { createToaster } from "../ui/toast.js";
import { createCountdown } from "../ui/countdown.js";
import { applyAccent, installTheme, type ThemeChoice } from "../ui/theme.js";
import { msUntilNextLocalMidnight } from "../core/date.js";
import { TIER_NAMES, UNRATED_LABEL } from "../engine/tiers.js";
import { browserShareDeps, composeShare, deliverShare } from "../engine/share.js";
import { createClock, debugDateOverride } from "../engine/scheduler.js";
import { SUITE_GAMES, SUITE_SHARE_URL } from "../shell/registry.js";
import {
  allStatuses,
  dailyCardBlock,
  dailyCardInput,
  dailyCardSummary,
  openSuite,
  suiteThemePort,
  type GameStatus,
} from "../shell/suite.js";

const THEME_GLYPH: Readonly<Record<ThemeChoice, string>> = {
  system: "◐",
  light: "☀",
  dark: "☽",
};

const STATUS_LABEL: Readonly<Record<GameStatus["play"], string>> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  finished: "Finished",
  "before-epoch": "Not yet open",
  planned: "Coming soon",
};

function resultLabel(status: GameStatus): string {
  if (status.play !== "finished" || status.result === null) return STATUS_LABEL[status.play];
  const tier = status.result.tier;
  return tier === null ? UNRATED_LABEL : TIER_NAMES[tier];
}

function nextMidnightAt(now: () => Date): number {
  const at = now();
  return at.getTime() + msUntilNextLocalMidnight(at);
}

export interface HubHandle {
  refresh(): void;
  destroy(): void;
}

export function mountHub(root: HTMLElement, clock: () => Date): HubHandle {
  const suite = openSuite();
  const theme = installTheme(suiteThemePort(suite));
  const live = createLiveRegion(document.body);
  const toaster = createToaster(document.body, (message, assertive) =>
    live.announce(message, assertive),
  );

  // Chrome. The hub does not use ui/header.ts: that header carries a back to
  // hub link and a per game help and stats pair, none of which mean anything on
  // the page they point at.
  const themeButton = el("button", {
    class: "dk-iconbutton",
    attrs: { type: "button", "aria-label": "Theme" },
  });
  const header = el("header", { class: "dk-header hub-header", attrs: { role: "banner" } }, [
    el("h1", { class: "dk-header__title", text: "DAILYKIT" }),
    themeButton,
  ]);

  const streakValue = el("strong", { class: "hub-streak__value", text: "0" });
  const streak = el("p", { class: "hub-streak" }, [
    streakValue,
    el("span", { class: "hub-streak__label", text: " day suite streak" }),
  ]);

  const list = el("ul", { class: "hub-list" });

  const shareButton = el("button", {
    class: "dk-button hub-card__share",
    text: "Share today's card",
    attrs: { type: "button" },
  });
  const cardBlock = el("pre", { class: "hub-dailycard__block", attrs: { "aria-hidden": "true" } });
  const cardSummary = el("p", { class: "dk-visually-hidden" });
  const dailySection = el("section", { class: "hub-dailycard" }, [
    el("h2", { class: "hub-dailycard__title", text: "Today's card" }),
    cardBlock,
    cardSummary,
    shareButton,
  ]);

  const countdownHost = el("div", { class: "hub-countdown" });
  const footer = el("footer", { class: "hub-footer" }, [
    countdownHost,
    el("p", {
      class: "hub-footer__note",
      text: "No accounts, no cookies, no analytics. Everything stays in this browser.",
    }),
  ]);

  const storageNote = el("p", { class: "hub-note dk-hidden" });

  root.append(header, streak, storageNote, list, dailySection, footer);

  const paintTheme = (): void => {
    setText(themeButton, THEME_GLYPH[theme.choice]);
  };
  paintTheme();

  const disposers = [
    on(themeButton, "click", () => {
      theme.cycle();
      paintTheme();
    }),
    on(shareButton, "click", () => {
      void shareDailyCard();
    }),
    on(document, "visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    }),
  ];

  let statuses: readonly GameStatus[] = [];

  /* The countdown reads the same clock the statuses do. A display clock and a
     logic clock that disagree is how a debug date override produces a counter
     that has already elapsed. */
  const countdown = createCountdown({
    host: countdownHost,
    targetAt: () => nextMidnightAt(clock),
    now: () => clock().getTime(),
    label: "Next puzzles in",
    onElapsed: () => {
      refresh();
      countdown.start();
    },
  });

  function paintCards(): void {
    patchKeyed(
      list,
      statuses,
      (status) => status.entry.id,
      (status) => {
        const item = el("li", { class: "hub-card" });
        applyAccent(item, status.entry.accent);
        const body = el("span", { class: "hub-card__body" }, [
          el("span", { class: "hub-card__name", text: status.entry.displayName }),
          el("span", { class: "hub-card__rule", text: status.entry.oneLineRule }),
        ]);
        const badge = el("span", { class: "hub-card__badge" });
        if (status.entry.status === "live") {
          const link = el(
            "a",
            { class: "hub-card__link", attrs: { href: status.entry.path } },
            [body, badge],
          );
          item.appendChild(link);
        } else {
          item.appendChild(
            el("span", { class: "hub-card__link hub-card__link--planned" }, [body, badge]),
          );
        }
        return item;
      },
      (node, status) => {
        const badge = node.querySelector(".hub-card__badge") as HTMLElement;
        setText(badge, resultLabel(status));
        setClass(node, "hub-card--finished", status.play === "finished");
        setClass(node, "hub-card--progress", status.play === "in-progress");
        setClass(node, "hub-card--planned", status.play === "planned");
        // Requirement 8.1. Status is carried by the badge text as well as by
        // the card's accent, so no meaning rests on color.
        const anchor = node.firstElementChild as HTMLElement;
        setAttr(
          anchor,
          "aria-label",
          `${status.entry.displayName}. ${STATUS_LABEL[status.play]}. ${status.entry.oneLineRule}`,
        );
      },
    );
  }

  function paintDailyCard(): void {
    const input = dailyCardInput(statuses, suite.record, clock());
    const block = dailyCardBlock(input);
    setText(cardSummary, dailyCardSummary(input));
    if (block === null) {
      setText(cardBlock, "");
      setClass(dailySection, "dk-hidden", true);
      return;
    }
    setClass(dailySection, "dk-hidden", false);
    const composed = composeShare(block, { shareUrl: SUITE_SHARE_URL });
    setText(cardBlock, composed.text);
  }

  async function shareDailyCard(): Promise<void> {
    const input = dailyCardInput(statuses, suite.record, clock());
    const block = dailyCardBlock(input);
    if (block === null) return;
    const composed = composeShare(block, { shareUrl: SUITE_SHARE_URL });
    const outcome = await deliverShare(composed.text, browserShareDeps());
    if (outcome === "copied") toaster.show("Card copied.");
    else if (outcome === "shared") toaster.show("Card shared.");
    else if (outcome === "manual") toaster.show("Copy failed. Select the block above to copy it.");
  }

  function refresh(): void {
    suite.record = suite.store.load().record;
    statuses = allStatuses(suite.backend, clock());
    setText(streakValue, String(suite.record.currentStreak));
    setClass(streak, "hub-streak--none", suite.record.currentStreak === 0);
    paintCards();
    paintDailyCard();
    const lossy = !suite.persistent;
    setClass(storageNote, "dk-hidden", !lossy);
    if (lossy) {
      setText(
        storageNote,
        "This browser is not saving progress, so streaks will not be kept between visits.",
      );
    }
    countdown.refresh();
  }

  refresh();
  countdown.start();

  return {
    refresh,
    destroy(): void {
      for (const dispose of disposers) dispose();
      countdown.destroy();
      toaster.destroy();
      live.destroy();
      theme.destroy();
      header.remove();
      streak.remove();
      storageNote.remove();
      list.remove();
      dailySection.remove();
      footer.remove();
    },
  };
}

/** Entry point. Kept apart from mountHub so a test can mount without a URL. */
export function bootHub(): HubHandle {
  const override = debugDateOverride(window.location.search, import.meta.env.DEV);
  const root = document.getElementById("app");
  if (root === null) throw new Error("hub root #app is missing");
  return mountHub(root, createClock(override));
}

export const HUB_GAME_COUNT = SUITE_GAMES.length;
