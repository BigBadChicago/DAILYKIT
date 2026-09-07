// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { append, clear, el, on, patchKeyed, setAttr, setClass, setText } from "../../src/ui/dom.js";

describe("el", () => {
  it("applies class, text, attributes, style, and listeners", () => {
    const click = vi.fn();
    const node = el("button", {
      class: "a b",
      text: "go",
      attrs: { type: "button", "aria-pressed": false, "data-n": 3, hidden: true },
      style: { color: "red" },
      on: { click },
    });
    expect(node.className).toBe("a b");
    expect(node.textContent).toBe("go");
    expect(node.getAttribute("type")).toBe("button");
    expect(node.getAttribute("data-n")).toBe("3");
    expect(node.getAttribute("hidden")).toBe("");
    expect(node.hasAttribute("aria-pressed")).toBe(false);
    expect(node.style.color).toBe("red");
    node.click();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("skips null, undefined, and false children and stringifies primitives", () => {
    const node = el("div", undefined, ["a", null, undefined, false, 7, el("span")]);
    expect(node.childNodes.length).toBe(3);
    expect(node.textContent).toBe("a7");
  });
});

describe("setters", () => {
  it("setText writes only on change", () => {
    const node = el("div", { text: "same" });
    const spy = vi.spyOn(node, "textContent", "set");
    setText(node, "same");
    expect(spy).not.toHaveBeenCalled();
    setText(node, "other");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("setAttr removes on null and on false", () => {
    const node = el("div", { attrs: { "aria-hidden": "true" } });
    setAttr(node, "aria-hidden", null);
    expect(node.hasAttribute("aria-hidden")).toBe(false);
    setAttr(node, "aria-hidden", true);
    expect(node.getAttribute("aria-hidden")).toBe("");
    setAttr(node, "aria-hidden", false);
    expect(node.hasAttribute("aria-hidden")).toBe(false);
  });

  it("setClass toggles only on change", () => {
    const node = el("div", { class: "x" });
    setClass(node, "x", true);
    expect(node.className).toBe("x");
    setClass(node, "x", false);
    expect(node.classList.contains("x")).toBe(false);
  });

  it("clear and append", () => {
    const node = el("div", undefined, ["a"]);
    append(node, ["b"]);
    expect(node.textContent).toBe("ab");
    clear(node);
    expect(node.childNodes.length).toBe(0);
  });

  it("on returns a working remover", () => {
    const node = el("div");
    const handler = vi.fn();
    const off = on(node, "click", handler);
    node.dispatchEvent(new Event("click"));
    off();
    node.dispatchEvent(new Event("click"));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("patchKeyed", () => {
  const create = (item: string): HTMLElement => el("li", { text: item });
  const update = (node: HTMLElement, item: string): void => setText(node, item.toUpperCase());

  it("creates, updates, and removes", () => {
    const host = el("ul");
    patchKeyed(host, ["a", "b"], (i) => i, create, update);
    expect(host.textContent).toBe("AB");
    patchKeyed(host, ["b"], (i) => i, create, update);
    expect(host.children.length).toBe(1);
    expect(host.textContent).toBe("B");
  });

  it("reuses nodes across a reorder so identity survives", () => {
    const host = el("ul");
    patchKeyed(host, ["a", "b", "c"], (i) => i, create, update);
    const originalB = host.children[1]!;
    patchKeyed(host, ["c", "b", "a"], (i) => i, create, update);
    expect(Array.from(host.children).map((n) => n.textContent)).toEqual(["C", "B", "A"]);
    expect(host.children[1]).toBe(originalB);
  });

  it("drops unkeyed children it did not create", () => {
    const host = el("ul", undefined, [el("li", { text: "stray" })]);
    patchKeyed(host, ["a"], (i) => i, create, update);
    expect(host.children.length).toBe(1);
    expect(host.textContent).toBe("A");
  });
});
