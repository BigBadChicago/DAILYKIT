/**
 * Layer 2. The one dialog implementation. Stats, help, and every later panel
 * mount inside it, so focus behaviour is written once.
 */

import { el, on, setAttr } from "./dom.js";
import { trapFocus, type FocusTrap } from "./a11y.js";

export interface ModalOptions {
  readonly title: string;
  readonly render: (body: HTMLElement) => void;
  readonly onClose?: () => void;
  readonly closeLabel?: string;
  /** Receives aria-hidden while the dialog is open. Usually the app root. */
  readonly hideWhileOpen?: HTMLElement | null;
  readonly mountTo?: HTMLElement;
  readonly dismissible?: boolean;
}

export interface ModalHandle {
  readonly element: HTMLElement;
  readonly body: HTMLElement;
  close(): void;
}

interface OpenModal {
  handle: ModalHandle;
  scrim: HTMLElement;
  trap: FocusTrap;
  disposers: (() => void)[];
  hidden: HTMLElement | null;
  onClose?: () => void;
}

const stack: OpenModal[] = [];

export function anyModalOpen(): boolean {
  return stack.length > 0;
}

export function closeTopModal(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.handle.close();
  return true;
}

export function openModal(options: ModalOptions): ModalHandle {
  const dismissible = options.dismissible !== false;
  const mountTo = options.mountTo ?? document.body;
  const titleId = `dk-modal-title-${stack.length}-${Date.now().toString(36)}`;

  const titleNode = el("h2", { class: "dk-modal__title", text: options.title, attrs: { id: titleId } });
  const closeButton = el("button", {
    class: "dk-iconbutton",
    text: "\u2715",
    attrs: { type: "button", "aria-label": options.closeLabel ?? "Close" },
  });
  const body = el("div", { class: "dk-modal__body" });
  const dialog = el(
    "div",
    {
      class: "dk-modal",
      attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabindex: "-1" },
    },
    [el("div", { class: "dk-modal__head" }, [titleNode, dismissible && closeButton]), body],
  );
  const scrim = el("div", { class: "dk-modal-scrim" }, [dialog]);

  options.render(body);
  mountTo.appendChild(scrim);
  document.body.classList.add("dk-scroll-locked");

  const hidden = options.hideWhileOpen ?? null;
  if (hidden) setAttr(hidden, "aria-hidden", "true");

  const disposers: (() => void)[] = [];
  const entry: OpenModal = {
    handle: { element: dialog, body, close },
    scrim,
    trap: trapFocus(dialog, dismissible ? closeButton : null),
    disposers,
    hidden,
    onClose: options.onClose,
  };

  if (dismissible) {
    disposers.push(on(closeButton, "click", () => close()));
    // Only a press that both starts and ends on the scrim dismisses, so a drag
    // that began inside the dialog and released outside does not close it.
    let downOnScrim = false;
    disposers.push(on(scrim, "pointerdown", (event) => { downOnScrim = event.target === scrim; }));
    disposers.push(on(scrim, "pointerup", (event) => {
      if (downOnScrim && event.target === scrim) close();
      downOnScrim = false;
    }));
    disposers.push(on(dialog, "keydown", (event) => {
      if ((event as KeyboardEvent).key === "Escape") {
        event.stopPropagation();
        close();
      }
    }));
  }

  stack.push(entry);

  function close(): void {
    const index = stack.indexOf(entry);
    if (index === -1) return;
    stack.splice(index, 1);
    for (const dispose of entry.disposers) dispose();
    entry.trap.release();
    if (entry.hidden) entry.hidden.removeAttribute("aria-hidden");
    entry.scrim.remove();
    if (stack.length === 0) document.body.classList.remove("dk-scroll-locked");
    entry.onClose?.();
  }

  return entry.handle;
}
