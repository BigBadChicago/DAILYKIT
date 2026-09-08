/**
 * Layer 5. The game shell. Boots one module, owns the chrome, and is the only
 * thing in the codebase that knows a session has a lifecycle.
 *
 * It names no game. `virtual:dk-game` is resolved by the GAME allow list in
 * vite.config.ts, which is contract decision 12's list doing a second job: it
 * both excludes toy-tap from production and selects the entry for a build.
 */

import "../ui/chrome.css";
import "./shell.css";

import type {
  AnyGameModule,
  OpaqueAction,
  OpaquePuzzle,
  OpaqueState,
} from "../contract/game-module.js";
import type { GameView } from "../contract/types.js";
import { isErr } from "../core/result.js";
import type { FinishedOutcome, PuzzleNumber } from "../core/types.js";
import { SessionMachine } from "../engine/state-machine.js";
import {
  Countdown,
  archiveList,
  browserCountdownDeps,
  createClock,
  debugDateOverride,
  formatCountdown,
  resolve,
} from "../engine/scheduler.js";
import {
  advanceWatermark,
  archiveResultFor,
  completeArchive,
  completeLive,
  completeSuiteDay,
  crossPromotionTarget,
  resultFor,
} from "../engine/stats.js";
import type { GameRecord, StoredResult } from "../engine/storage.js";
import { browserShareDeps, composeShare, deliverShare } from "../engine/share.js";
import { TIER_NAMES, UNRATED_LABEL } from "../engine/tiers.js";
import { createLiveRegion, prefersReducedMotion } from "../ui/a11y.js";
import { el, on, setClass, setText } from "../ui/dom.js";
import { createHeader } from "../ui/header.js";
import { openModal } from "../ui/modal.js";
import { renderHelpPanel } from "../ui/helpPanel.js";
import { renderStatsPanel, type StatsView } from "../ui/statsPanel.js";
import { createToaster } from "../ui/toast.js";
import { applyAccent, installTheme } from "../ui/theme.js";
import { PuzzleSource } from "./boot.js";
import { HUB_PATH, SUITE_SHARE_URL, entryFor, promotableIds } from "./registry.js";
import { openGameStore, openSuite, suiteThemePort } from "./suite.js";

const ARCHIVE_PAGE = 60;

interface Session {
  readonly puzzleNumber: PuzzleNumber;
  readonly mode: "live" | "archive";
  readonly rated: boolean;
  readonly puzzle: OpaquePuzzle;
  state: OpaqueState;
  view: GameView<OpaqueState> | null;
  finished: boolean;
}

/**
 * Called by one file per game under entries/. That file is the only place a
 * game is named, which is contract decision 12's allow list expressed as source
 * rather than as configuration, and it is what lets every game be its own
 * bundler entry and therefore its own chunk. Requirement 7.3.2.
 */
export function bootGame(game: AnyGameModule, root: HTMLElement): void {
  const entry = entryFor(game.identity.id);
  if (entry === null) {
    throw new Error(`game ${game.identity.id} is not in the suite registry`);
  }

  const clock = createClock(debugDateOverride(window.location.search, import.meta.env.DEV));
  const suite = openSuite();
  const theme = installTheme(suiteThemePort(suite));
  const store = openGameStore(suite.backend, entry, game.migrateState.bind(game));
  const loaded = store.load();
  let record: GameRecord = loaded.record;

  const source = new PuzzleSource(game);
  const machine = new SessionMachine<OpaqueState>({ strict: import.meta.env.DEV });
  const live = createLiveRegion(document.body);
  const toaster = createToaster(document.body, (message, assertive) =>
    live.announce(message, assertive),
  );

  applyAccent(root, game.identity.accent);

  const board = el("div", { class: "dk-board", attrs: { id: "board" } });
  const notice = el("p", { class: "dk-notice dk-hidden", attrs: { role: "status" } });
  const banner = el("p", { class: "dk-banner dk-hidden" });
  const main = el("main", { class: "dk-main" }, [banner, notice, board]);
  root.appendChild(main);

  const header = createHeader({
    title: game.identity.displayName,
    hubUrl: HUB_PATH,
    hubLabel: "All games",
    theme,
    onHelp: () => openHelp(),
    onStats: () => openStats(null),
    onArchive: game.archiveEnabled ? () => openArchive() : undefined,
    mountTo: root,
  });

  if (!loaded.persistent) {
    setClass(banner, "dk-hidden", false);
    setText(banner, "This browser is not saving progress. Today's game will still play.");
  } else if (loaded.recovered) {
    setClass(banner, "dk-hidden", false);
    setText(banner, "Saved progress could not be read, so stats have been reset.");
  }

  let session: Session | null = null;

  const persist = (): void => {
    store.save(record);
  };

  const setNotice = (message: string | null): void => {
    setClass(notice, "dk-hidden", message === null);
    setText(notice, message ?? "");
  };

  // -------------------------------------------------------------------------
  // Loading a day
  // -------------------------------------------------------------------------

  async function openDay(puzzleNumber: PuzzleNumber, mode: "live" | "archive"): Promise<void> {
    session?.view?.unmount();
    session = null;
    setNotice("Loading today's puzzle.");

    const load = await source.load(puzzleNumber);
    if (load.kind === "unavailable") {
      setNotice(load.detail);
      return;
    }
    setNotice(null);

    const stored =
      mode === "live" && record.live !== null && record.live.puzzleNumber === puzzleNumber
        ? record.live.state
        : null;

    let state: OpaqueState;
    let resumed = false;
    if (stored !== null) {
      const restored = game.deserialize(load.puzzle, stored);
      if (isErr(restored)) {
        state = game.initialState(load.puzzle);
      } else {
        state = restored.value;
        resumed = true;
      }
    } else {
      state = game.initialState(load.puzzle);
    }

    session = {
      puzzleNumber,
      mode,
      rated: load.rated,
      puzzle: load.puzzle,
      state,
      view: null,
      finished: false,
    };

    machine.beginSession(puzzleNumber, mode, state);

    const priorResult =
      mode === "live" ? resultFor(record, puzzleNumber) : archiveResultFor(record, puzzleNumber);
    const outcome = game.inspect(state);
    const alreadyFinished = priorResult !== null || outcome.kind === "finished";
    session.finished = alreadyFinished;

    if (mode === "archive") machine.send("LOADED_ARCHIVE");
    else if (alreadyFinished) machine.send("LOADED_FINISHED");
    else if (resumed) machine.send("LOADED_RESUME");
    else machine.send("LOADED_NEW");

    mountBoard();

    if (!record.tutorialSeen) {
      record = { ...record, tutorialSeen: true };
      persist();
      openHelp();
    }

    if (alreadyFinished && outcome.kind === "finished") showEndScreen(outcome);
    void source.prefetch(puzzleNumber);
  }

  function mountBoard(): void {
    if (session === null) return;
    const active = session;
    active.view = game.mount(board, {
      puzzle: active.puzzle,
      initial: active.state,
      dispatch: (action: OpaqueAction) => dispatch(action),
      announce: (message: string) => live.announce(message),
      reducedMotion: prefersReducedMotion(),
      readOnly: active.mode === "archive" && active.finished,
    });
  }

  // -------------------------------------------------------------------------
  // Play
  // -------------------------------------------------------------------------

  function dispatch(action: OpaqueAction): void {
    if (session === null || session.finished) return;
    const applied = game.apply(session.state, action);
    if (!applied.ok) {
      /* Contract decision 7. A rejection is a value carrying a sentence, and
         the engine is what puts that sentence in the live region so five games
         do not each have to remember to. */
      live.announce(applied.error.announce, true);
      toaster.show(applied.error.announce, { announce: false });
      return;
    }

    session.state = applied.value;
    machine.setBoard(applied.value);
    session.view?.update(applied.value);

    /* Requirement 3.3.4. Every mutation writes; GameStore's dirty check absorbs
       the drag events that produce an identical serialization. */
    if (session.mode === "live") {
      record = {
        ...record,
        live: {
          puzzleNumber: session.puzzleNumber,
          state: game.serialize(applied.value),
          result: record.live?.result ?? null,
        },
      };
      persist();
    }

    const outcome = game.inspect(applied.value);
    if (outcome.kind === "finished") finish(outcome);
  }

  function finish(outcome: FinishedOutcome): void {
    if (session === null || session.finished) return;
    session.finished = true;

    const result: StoredResult = {
      score: outcome.score,
      won: outcome.won,
      bucket: game.bucketOf(outcome, session.state),
      detail: outcome.detail,
      /* Past the horizon there is no stored optimum, so the tier the module
         computed is not a grade anyone can trust. Resolution 3. */
      tier: session.rated ? outcome.tier : null,
    };

    if (session.mode === "archive") {
      record = completeArchive(record, session.puzzleNumber, result);
      persist();
      showEndScreen(outcome);
      return;
    }

    machine.send("FINISHED");
    record = completeLive(record, session.puzzleNumber, result);
    persist();

    const resolution = resolve(game.identity.epoch, record.watermark, clock());
    if (resolution.kind === "resolved") {
      suite.update(completeSuiteDay(suite.record, resolution.dayNumber, game.identity.id));
    }

    showEndScreen(outcome);
  }

  // -------------------------------------------------------------------------
  // Panels
  // -------------------------------------------------------------------------

  function statsView(currentIndex: number | null): StatsView {
    return {
      played: record.played,
      wins: game.hasWinLoss ? record.won : null,
      currentStreak: record.currentStreak,
      maxStreak: record.maxStreak,
      suiteStreak: suite.record.currentStreak,
      distribution: {
        labels: game.distribution.labels,
        counts: record.distribution,
        distinguishedIndex: game.distribution.distinguishedIndex,
        currentIndex,
      },
    };
  }

  function openStats(currentIndex: number | null): void {
    openModal({
      title: "Statistics",
      hideWhileOpen: root,
      render: (body) => {
        renderStatsPanel(body).update(statsView(currentIndex));
      },
    });
  }

  function openHelp(): void {
    openModal({
      title: `How to play ${game.identity.displayName}`,
      hideWhileOpen: root,
      render: (body) => {
        renderHelpPanel(body, game.help());
      },
    });
  }

  function openArchive(): void {
    const resolution = resolve(game.identity.epoch, record.watermark, clock());
    if (resolution.kind !== "resolved") return;
    const items = archiveList(game.identity.epoch, resolution.puzzleNumber, {
      limit: ARCHIVE_PAGE,
    });

    openModal({
      title: "Archive",
      hideWhileOpen: root,
      render: (body) => {
        if (items.length === 0) {
          body.appendChild(el("p", { text: "There are no past puzzles yet." }));
          return;
        }
        const list = el("ul", { class: "dk-archive" });
        for (const item of items) {
          const played = archiveResultFor(record, item.puzzleNumber) ?? resultFor(record, item.puzzleNumber);
          const label = `${item.date.year}-${String(item.date.month).padStart(2, "0")}-${String(item.date.day).padStart(2, "0")}`;
          const button = el("button", {
            class: "dk-archive__item",
            attrs: { type: "button" },
          }, [
            el("span", { class: "dk-archive__number", text: `#${item.puzzleNumber}` }),
            el("span", { class: "dk-archive__date", text: label }),
            el("span", {
              class: "dk-archive__mark",
              text: played === null ? "" : played.tier === null ? UNRATED_LABEL : TIER_NAMES[played.tier],
            }),
          ]);
          on(button, "click", () => {
            /* Requirement 3.6.1. An archive session never touches the live
               record, so leaving the live board loaded underneath is safe. */
            /* OPEN_ARCHIVE is legal from COMPLETE and WAITING_FOR_NEXT only.
               From PLAYING the archive button is a no op rather than an illegal
               transition, because leaving an unfinished live board would lose
               it. */
            if (!machine.can("OPEN_ARCHIVE")) {
              toaster.show("Finish today's puzzle first.");
              return;
            }
            machine.send("OPEN_ARCHIVE");
            void openDay(item.puzzleNumber, "archive");
          });
          list.appendChild(el("li", {}, [button]));
        }
        body.appendChild(list);
      },
    });
  }

  // -------------------------------------------------------------------------
  // End screen
  // -------------------------------------------------------------------------

  function showEndScreen(outcome: FinishedOutcome): void {
    if (session === null) return;
    const active = session;
    const tierLabelText = !active.rated
      ? UNRATED_LABEL
      : outcome.tier === null
        ? UNRATED_LABEL
        : TIER_NAMES[outcome.tier];

    const countdownValue = el("span", { class: "dk-countdown__value", text: "00:00:00" });
    const countdown = new Countdown(browserCountdownDeps, {
      onTick: (remaining) => setText(countdownValue, formatCountdown(remaining)),
      onRollover: () => void reloadToday(),
    });

    openModal({
      title: active.mode === "archive" ? `Puzzle ${active.puzzleNumber}` : "Result",
      hideWhileOpen: root,
      onClose: () => {
        countdown.stop();
        if (active.mode === "archive") {
          /* Engine decision 16. A replay leaves through EXIT_ARCHIVE into
             LOADING and the live day is reloaded, never into COMPLETE. */
          if (machine.can("EXIT_ARCHIVE")) machine.send("EXIT_ARCHIVE");
          void start();
          return;
        }
        if (machine.can("DISMISS_RESULT")) machine.send("DISMISS_RESULT");
      },
      render: (body) => {
        body.appendChild(el("p", { class: "dk-end__tier", text: tierLabelText }));
        body.appendChild(el("p", { class: "dk-end__detail", text: outcome.detail }));
        body.appendChild(
          el("p", { class: "dk-end__score", text: `Score ${outcome.score.toLocaleString()}` }),
        );

        const share = el("button", {
          class: "dk-button dk-button--primary",
          text: "Share",
          attrs: { type: "button" },
        });
        on(share, "click", () => void shareResult());
        body.appendChild(share);

        const stats = el("button", { class: "dk-button", text: "Statistics", attrs: { type: "button" } });
        on(stats, "click", () => openStats(game.bucketOf(outcome, active.state)));
        body.appendChild(stats);

        if (active.mode === "live") {
          body.appendChild(
            el("div", { class: "dk-countdown" }, [
              el("span", { class: "dk-countdown__label", text: "Next puzzle" }),
              countdownValue,
            ]),
          );
          countdown.start();
          renderCrossPromotion(body);
        }
      },
    });

    live.announce(`Finished. ${tierLabelText}. ${outcome.detail}.`, true);
  }

  /**
   * Requirement 7.3.7. One line, one tap, after completion only, and never the
   * game just played. The choice itself is Layer 1's, because it is a fact
   * about the suite record rather than about this page.
   */
  function renderCrossPromotion(body: HTMLElement): void {
    const targetId = crossPromotionTarget(suite.record, promotableIds(), game.identity.id);
    if (targetId === null) return;
    const target = entryFor(targetId);
    if (target === null) return;
    body.appendChild(
      el("p", { class: "dk-crosspromo" }, [
        el("a", {
          class: "dk-crosspromo__link",
          text: `Play ${target.displayName} today`,
          attrs: { href: target.path },
        }),
      ]),
    );
  }

  async function shareResult(): Promise<void> {
    if (session === null) return;
    const block = game.shareBlock(session.state, {
      puzzleNumber: session.puzzleNumber,
      currentStreak: record.currentStreak,
      rated: session.rated,
    });
    const composed = composeShare(block, { shareUrl: SUITE_SHARE_URL });
    const result = await deliverShare(composed.text, browserShareDeps());
    if (result === "copied") toaster.show("Copied to clipboard.");
    else if (result === "shared") toaster.show("Shared.");
    else if (result === "manual") showManualCopy(composed.text);
  }

  function showManualCopy(text: string): void {
    openModal({
      title: "Copy your result",
      render: (body) => {
        const area = el("textarea", { class: "dk-copybox", text });
        area.setAttribute("readonly", "");
        area.setAttribute("rows", String(text.split("\n").length));
        body.appendChild(area);
        area.select();
      },
    });
  }

  // -------------------------------------------------------------------------
  // The day, and changes to it
  // -------------------------------------------------------------------------

  async function reloadToday(): Promise<void> {
    machine.send("ROLLOVER");
    await start();
  }

  async function start(): Promise<void> {
    const resolution = resolve(game.identity.epoch, record.watermark, clock());
    if (resolution.kind === "before-epoch") {
      setNotice(
        `${game.identity.displayName} opens on ${resolution.epoch.year}-${String(resolution.epoch.month).padStart(2, "0")}-${String(resolution.epoch.day).padStart(2, "0")}.`,
      );
      return;
    }

    if (resolution.relation === "advance") {
      record = advanceWatermark(record, resolution.puzzleNumber);
      persist();
    }

    await openDay(resolution.puzzleNumber, "live");
  }

  /* A tab that was backgrounded across local midnight has had its timers
     throttled, so the resolved day is the authority rather than any timer that
     did or did not fire. */
  on(document, "visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      if (machine.can("HIDDEN")) machine.send("HIDDEN");
      return;
    }
    if (machine.can("SHOWN")) machine.send("SHOWN");
    const resolution = resolve(game.identity.epoch, record.watermark, clock());
    if (
      resolution.kind === "resolved" &&
      session !== null &&
      session.mode === "live" &&
      resolution.puzzleNumber !== session.puzzleNumber
    ) {
      void reloadToday();
    }
  });

  void start();
}

/** Every game entry calls this. The root is fixed by the shared index.html. */
export function mountShell(game: AnyGameModule): void {
  const root = document.getElementById("app");
  if (root === null) throw new Error("game root #app is missing");
  bootGame(game, root);
}
