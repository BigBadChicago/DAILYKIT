/**
 * Layer 2. Focus trapping, live announcements, and motion preference.
 * Requirement 8.1.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  const found = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  // offsetParent is null for display:none, which is how a collapsed section is
  // excluded without maintaining a second list of what is currently shown.
  return found.filter((node) => node.offsetParent !== null || node === document.activeElement);
}

export interface FocusTrap {
  release(): void;
}

/**
 * Traps Tab within container and restores focus on release. The previously
 * focused element is captured at install time rather than passed in, because
 * every caller would otherwise repeat the same two lines.
 */
export function trapFocus(container: HTMLElement, initial?: HTMLElement | null): FocusTrap {
  const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") return;
    const items = focusableWithin(container);
    if (items.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === container)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", onKeyDown);
  const target = initial ?? focusableWithin(container)[0] ?? container;
  target.focus();

  return {
    release(): void {
      container.removeEventListener("keydown", onKeyDown);
      if (restoreTo && restoreTo.isConnected) restoreTo.focus();
    },
  };
}

export interface LiveRegion {
  /** Polite by default. Rejections and results both come through here. */
  announce(message: string, assertive?: boolean): void;
  destroy(): void;
}

/**
 * Two regions rather than one with a switching aria-live value: changing the
 * politeness of a live region while it holds text is unreliable across screen
 * readers, and the cost of a second empty div is nothing.
 */
export function createLiveRegion(root: HTMLElement = document.body): LiveRegion {
  const make = (politeness: "polite" | "assertive"): HTMLElement => {
    const node = document.createElement("div");
    node.className = "dk-visually-hidden";
    node.setAttribute("aria-live", politeness);
    node.setAttribute("aria-atomic", "true");
    node.setAttribute("role", "status");
    root.appendChild(node);
    return node;
  };

  const polite = make("polite");
  const assertive = make("assertive");
  let toggle = false;

  return {
    announce(message: string, isAssertive = false): void {
      const node = isAssertive ? assertive : polite;
      // The same string twice in a row is not re announced unless the node
      // content actually differs, so a trailing no break space alternates.
      toggle = !toggle;
      node.textContent = toggle ? message : `${message}\u00A0`;
    },
    destroy(): void {
      polite.remove();
      assertive.remove();
    },
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Returns the unsubscribe. Motion preference can change mid session. */
export function onReducedMotionChange(handler: (reduced: boolean) => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listener = (event: MediaQueryListEvent): void => handler(event.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
