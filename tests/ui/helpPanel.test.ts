// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHelpPanel } from "../../src/ui/helpPanel.js";
import { el } from "../../src/ui/dom.js";

const content = {
  headline: "Clear the board.",
  steps: ["Drag across five cards.", "Make a pair or better."],
  example: { caption: "a plus shape is legal", lines: ["line one", "line two"] },
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("help panel", () => {
  it("renders headline, ordered steps, and the textual example", () => {
    const host = el("div");
    renderHelpPanel(host, content);
    expect(host.querySelector(".dk-help__headline")!.textContent).toBe("Clear the board.");
    expect(host.querySelectorAll(".dk-help__steps li").length).toBe(2);
    expect(host.querySelectorAll(".dk-help__line").length).toBe(2);
    expect(host.querySelector("figcaption")!.textContent).toBe("a plus shape is legal");
  });

  it("hides a drawn example from assistive technology and keeps the lines readable", () => {
    const host = el("div");
    const draw = vi.fn((target: HTMLElement) => target.appendChild(el("div")));
    renderHelpPanel(host, { ...content, example: { ...content.example, draw } });
    expect(draw).toHaveBeenCalledTimes(1);
    expect(host.querySelector(".dk-help__example-body")!.getAttribute("aria-hidden")).toBe("true");
    const hidden = host.querySelector(".dk-visually-hidden")!;
    expect(hidden.textContent).toBe("line oneline two");
    expect(host.querySelectorAll(".dk-help__line").length).toBe(0);
  });

  it("destroy detaches everything it added", () => {
    const host = el("div");
    const handle = renderHelpPanel(host, content);
    handle.destroy();
    expect(host.children.length).toBe(0);
  });
});
