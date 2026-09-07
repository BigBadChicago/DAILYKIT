/**
 * Layer 2. The countdown to the next puzzle.
 *
 * Engine decision 20: every tick recomputes from the clock. A backgrounded
 * mobile tab has its timers throttled, so a counter that decrements by one per
 * tick reads wrong by however long the player was in another app.
 */

import { el, setText } from "./dom.js";

export interface CountdownOptions {
  readonly host: HTMLElement;
  /** Epoch milliseconds of the next puzzle boundary. Read on every tick, so a
   *  rollover can move the target without recreating the view. */
  readonly targetAt: () => number;
  readonly now?: () => number;
  readonly label?: string;
  readonly onElapsed?: () => void;
}

export interface Countdown {
  readonly element: HTMLElement;
  start(): void;
  stop(): void;
  refresh(): void;
  destroy(): void;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function createCountdown(options: CountdownOptions): Countdown {
  const now = options.now ?? (() => Date.now());
  const value = el("span", { class: "dk-countdown__value", text: "00:00:00" });
  const label = el("span", { class: "dk-countdown__label", text: options.label ?? "Next puzzle" });
  // aria-live off. A per second live update would flood a screen reader; the
  // value is readable on demand as ordinary text.
  const element = el("div", { class: "dk-countdown", attrs: { "aria-live": "off" } }, [label, value]);
  options.host.appendChild(element);

  let timer = 0;
  let running = false;
  let fired = false;

  const tick = (): void => {
    const remaining = options.targetAt() - now();
    setText(value, formatDuration(remaining));
    if (remaining <= 0) {
      if (!fired) {
        fired = true;
        options.onElapsed?.();
      }
      stop();
      return;
    }
    fired = false;
    if (!running) return;
    // Align to the next whole second so the digits change when they look like
    // they should, and drift never accumulates.
    const delay = remaining % 1000 || 1000;
    timer = window.setTimeout(tick, Math.min(delay, 1000));
  };

  const onVisibility = (): void => {
    if (document.visibilityState === "visible" && running) {
      window.clearTimeout(timer);
      tick();
    }
  };

  function stop(): void {
    running = false;
    window.clearTimeout(timer);
    timer = 0;
  }

  document.addEventListener("visibilitychange", onVisibility);

  return {
    element,
    start(): void {
      if (running) return;
      running = true;
      tick();
    },
    stop,
    refresh(): void {
      window.clearTimeout(timer);
      tick();
    },
    destroy(): void {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      element.remove();
    },
  };
}
