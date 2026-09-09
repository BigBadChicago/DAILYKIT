// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isOk } from "../../../src/core/result.js";
import type { MountContext } from "../../../src/contract/types.js";
import { mountCipher, feedbackText, shapeName } from "../../../src/games/cipher/render.js";
import type { CipherPuzzle } from "../../../src/games/cipher/generator.js";
import {
  applyCipherAction,
  initialCipherState,
  type CipherAction,
  type CipherState,
  type Code,
} from "../../../src/games/cipher/rules.js";

const CODE: Code = [1, 1, 4, 5];
const puzzle: CipherPuzzle = { number: 12, code: CODE, levers: ["one-pair"], best: { remaining: 105, line: 5 } };

let hosts: HTMLElement[] = [];

/** The shell applies synchronously and calls update from inside dispatch. Phase
 *  10 defect 1 was a renderer that assumed otherwise, so this harness is
 *  deliberately synchronous. */
function mount(initial: CipherState = initialCipherState(CODE)) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  const rejected: string[] = [];
  let current = initial;
  const context: MountContext<CipherState, CipherAction, CipherPuzzle> = {
    puzzle,
    initial,
    dispatch(action) {
      const result = applyCipherAction(current, action);
      if (isOk(result)) {
        current = result.value;
        view.update(current);
      } else {
        rejected.push(result.error.code);
      }
    },
    announce,
    reducedMotion: false,
    readOnly: false,
  };
  const view = mountCipher(host, context, { reducedMotion: false });
  return { host, view, announce, rejected, state: () => current };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("cipher renderer", () => {
  it("draws six palette keys and four empty slots, all reachable and labelled", () => {
    const { host } = mount();
    const keys = host.querySelectorAll("[data-symbol]");
    const slots = host.querySelectorAll("[data-slot]");
    expect(keys).toHaveLength(6);
    expect(slots).toHaveLength(4);
    keys.forEach((key, index) => {
      expect(key.getAttribute("aria-label")).toBe(`${shapeName(index)}, key ${index + 1}`);
      expect(key.tagName).toBe("BUTTON");
    });
    slots.forEach((slot, index) => {
      expect(slot.getAttribute("aria-label")).toBe(`Slot ${index + 1}, empty`);
      expect(slot.getAttribute("data-empty")).toBe("true");
    });
  });

  it("fills slots left to right on tap and clears one when it is tapped again", () => {
    const { host, state } = mount();
    const keys = host.querySelectorAll<HTMLButtonElement>("[data-symbol]");
    keys[2]!.click();
    keys[3]!.click();
    expect(state().draft).toEqual([2, 3, null, null]);
    host.querySelectorAll<HTMLButtonElement>("[data-slot]")[0]!.click();
    expect(state().draft).toEqual([null, 3, null, null]);
    expect(host.querySelectorAll("[data-slot]")[0]!.getAttribute("data-empty")).toBe("true");
  });

  it("keeps submit disabled until the code is complete, and never submits on the fourth tap", () => {
    const { host, state } = mount();
    const submit = host.querySelector<HTMLButtonElement>(".cipher-submit")!;
    const keys = host.querySelectorAll<HTMLButtonElement>("[data-symbol]");
    expect(submit.getAttribute("disabled")).toBe("true");
    for (const symbol of [0, 1, 2, 3]) keys[symbol]!.click();
    expect(state().guesses).toHaveLength(0);
    expect(submit.getAttribute("disabled")).toBeNull();
    submit.click();
    expect(state().guesses).toHaveLength(1);
    expect(submit.getAttribute("disabled")).toBe("true");
  });

  it("plays entirely from the keyboard", () => {
    const { host, state } = mount();
    const root = host.querySelector<HTMLElement>(".cipher")!;
    const press = (key: string): void => {
      root.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };
    for (const key of ["2", "2", "5", "6"]) press(key);
    expect(state().draft).toEqual([1, 1, 4, 5]);
    press("Backspace");
    expect(state().draft).toEqual([1, 1, 4, null]);
    press("6");
    press("Enter");
    expect(state().guesses).toHaveLength(1);
    expect(state().solved).toBe(true);
  });

  it("announces feedback and shows it in the history without naming a slot", () => {
    const { host, announce } = mount();
    const keys = host.querySelectorAll<HTMLButtonElement>("[data-symbol]");
    for (const symbol of [1, 4, 5, 1]) keys[symbol]!.click();
    host.querySelector<HTMLButtonElement>(".cipher-submit")!.click();
    expect(announce).toHaveBeenCalledWith(feedbackText(1, 3));
    const row = host.querySelector(".cipher-row")!;
    expect(row.querySelector(".cipher-feedback")!.textContent).toBe("1 in place, 3 misplaced");
    expect(row.getAttribute("aria-label")).toContain("Guess 1");
    expect(row.getAttribute("aria-label")).not.toContain("slot");
  });

  it("reveals the code and disables every control once the guesses run out", () => {
    let state = initialCipherState(CODE);
    for (const guess of [[0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2], [0, 0, 0, 3], [0, 0, 0, 4]] as Code[]) {
      for (let slot = 0; slot < 4; slot += 1) {
        const set = applyCipherAction(state, { kind: "set", slot, symbol: guess[slot] as number });
        if (isOk(set)) state = set.value;
      }
      const submit = applyCipherAction(state, { kind: "submit" });
      if (isOk(submit)) state = submit.value;
    }
    const { host } = mount(state);
    const keys = host.querySelectorAll<HTMLButtonElement>("[data-symbol]");
    for (const symbol of [0, 0, 1, 0]) keys[symbol]!.click();
    host.querySelector<HTMLButtonElement>(".cipher-submit")!.click();
    const status = host.querySelector(".cipher-status")!.textContent ?? "";
    expect(status).toContain("Out of guesses");
    expect(status).toContain(shapeName(1));
    for (const key of keys) expect(key.getAttribute("disabled")).toBe("true");
  });

  it("refuses a repeated code and says so rather than spending a guess", () => {
    const { host, rejected, state } = mount();
    const keys = host.querySelectorAll<HTMLButtonElement>("[data-symbol]");
    for (const symbol of [0, 1, 2, 3]) keys[symbol]!.click();
    host.querySelector<HTMLButtonElement>(".cipher-submit")!.click();
    for (const symbol of [0, 1, 2, 3]) keys[symbol]!.click();
    host.querySelector<HTMLButtonElement>(".cipher-submit")!.click();
    expect(rejected).toContain("repeat-guess");
    expect(state().guesses).toHaveLength(1);
  });

  it("removes everything it created on unmount", () => {
    const { host, view } = mount();
    expect(host.childElementCount).toBe(1);
    view.unmount();
    expect(host.childElementCount).toBe(0);
  });
});
