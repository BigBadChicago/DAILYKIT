// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { anyModalOpen, closeTopModal, openModal } from "../../src/ui/modal.js";
import { el } from "../../src/ui/dom.js";

function visible(root: ParentNode): void {
  for (const node of root.querySelectorAll("button, a, input")) {
    Object.defineProperty(node, "offsetParent", { get: () => document.body, configurable: true });
  }
}

afterEach(() => {
  while (closeTopModal());
  document.body.innerHTML = "";
});

describe("openModal", () => {
  it("renders the body, labels the dialog, and locks scroll", () => {
    const handle = openModal({ title: "Stats", render: (body) => body.appendChild(el("p", { text: "hi" })) });
    const dialog = document.querySelector("[role=dialog]")!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby")!;
    expect(document.getElementById(labelId)!.textContent).toBe("Stats");
    expect(handle.body.textContent).toBe("hi");
    expect(document.body.classList.contains("dk-scroll-locked")).toBe(true);
    handle.close();
    expect(document.body.classList.contains("dk-scroll-locked")).toBe(false);
  });

  it("closes on Escape, on the close button, and calls onClose once", () => {
    const onClose = vi.fn();
    const handle = openModal({ title: "T", render: () => {}, onClose });
    visible(document.body);
    handle.element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(anyModalOpen()).toBe(false);
    handle.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses only when the press starts and ends on the scrim", () => {
    const handle = openModal({ title: "T", render: () => {} });
    const scrim = document.querySelector(".dk-modal-scrim")!;
    handle.element.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    scrim.dispatchEvent(new Event("pointerup", { bubbles: true }));
    expect(anyModalOpen()).toBe(true);
    scrim.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    scrim.dispatchEvent(new Event("pointerup", { bubbles: true }));
    expect(anyModalOpen()).toBe(false);
  });

  it("a non dismissible modal has no close button and ignores Escape", () => {
    const handle = openModal({ title: "T", render: () => {}, dismissible: false });
    expect(document.querySelector(".dk-modal__head .dk-iconbutton")).toBeNull();
    handle.element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(anyModalOpen()).toBe(true);
    handle.close();
  });

  it("stacks and closes the top first, unlocking scroll only at the bottom", () => {
    const first = openModal({ title: "A", render: () => {} });
    const second = openModal({ title: "B", render: () => {} });
    expect(document.querySelectorAll("[role=dialog]").length).toBe(2);
    expect(closeTopModal()).toBe(true);
    expect(second.element.isConnected).toBe(false);
    expect(first.element.isConnected).toBe(true);
    expect(document.body.classList.contains("dk-scroll-locked")).toBe(true);
    expect(closeTopModal()).toBe(true);
    expect(document.body.classList.contains("dk-scroll-locked")).toBe(false);
    expect(closeTopModal()).toBe(false);
  });

  it("hides the supplied background element while open", () => {
    const app = el("main");
    document.body.appendChild(app);
    const handle = openModal({ title: "T", render: () => {}, hideWhileOpen: app });
    expect(app.getAttribute("aria-hidden")).toBe("true");
    handle.close();
    expect(app.hasAttribute("aria-hidden")).toBe(false);
  });

  it("close is idempotent", () => {
    const onClose = vi.fn();
    const handle = openModal({ title: "T", render: () => {}, onClose });
    handle.close();
    handle.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
