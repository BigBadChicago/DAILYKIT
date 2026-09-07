/**
 * Layer 2. Transient confirmations. Requirement 3.5.5 wants explicit share
 * confirmation, and rejections that are already announced to the live region
 * need a visible counterpart for sighted players.
 */

import { el } from "./dom.js";
import { prefersReducedMotion } from "./a11y.js";

export interface ToastOptions {
  readonly durationMs?: number;
  /** Also pushed to the assertive live region rather than the polite one. */
  readonly assertive?: boolean;
  /** Set false when the caller already announced the same string. */
  readonly announce?: boolean;
}

export interface Toaster {
  show(message: string, options?: ToastOptions): void;
  clear(): void;
  destroy(): void;
}

const DEFAULT_MS = 2600;
const MAX_VISIBLE = 3;

export function createToaster(
  root: HTMLElement = document.body,
  announce?: (message: string, assertive?: boolean) => void,
): Toaster {
  // aria-hidden because announcement goes through the live region owned by
  // a11y.ts. A toast that is also a live region double speaks.
  const host = el("div", { class: "dk-toasts", attrs: { "aria-hidden": "true" } });
  root.appendChild(host);
  const timers = new Set<number>();

  const remove = (node: HTMLElement): void => {
    if (!node.isConnected) return;
    if (prefersReducedMotion()) {
      node.remove();
      return;
    }
    node.classList.add("dk-toast--leaving");
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      node.remove();
    }, 200);
    timers.add(timer);
  };

  return {
    show(message: string, options?: ToastOptions): void {
      if (options?.announce !== false && announce) announce(message, options?.assertive === true);
      const node = el("div", { class: "dk-toast", text: message });
      host.appendChild(node);
      while (host.children.length > MAX_VISIBLE) host.firstElementChild?.remove();
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        remove(node);
      }, options?.durationMs ?? DEFAULT_MS);
      timers.add(timer);
    },
    clear(): void {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      while (host.firstChild) host.removeChild(host.firstChild);
    },
    destroy(): void {
      this.clear();
      host.remove();
    },
  };
}
