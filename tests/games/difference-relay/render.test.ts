// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MountContext } from "../../../src/contract/types.js";
import { mountDifferenceRelay, stationLabel } from "../../../src/games/difference-relay/render.js";
import {
  applyAction,
  initialState,
  makePuzzle,
  type DifferenceRelayAction,
  type DifferenceRelayPuzzle,
  type DifferenceRelayState,
} from "../../../src/games/difference-relay/rules.js";

function puzzle(): DifferenceRelayPuzzle {
  const made = makePuzzle(3, [6, 9, 7, 2, 1, 5], [3, 2, null, null, 4], [7, 1, 9, 6, 2, 5], ["range-wide", "hidden-2"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}

let hosts: HTMLElement[] = [];

function mount(readOnly = false) {
  const p = puzzle();
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  let current = initialState(p);
  const context: MountContext<DifferenceRelayState, DifferenceRelayAction, DifferenceRelayPuzzle> = {
    puzzle: p,
    initial: current,
    dispatch(action) {
      const next = applyAction(current, action);
      if (next.ok) {
        current = next.value;
        view.update(current);
      }
    },
    announce,
    reducedMotion: true,
    readOnly,
  };
  const view = mountDifferenceRelay(host, context);
  const stations = [...host.querySelectorAll<HTMLButtonElement>(".dr-station")];
  const run = host.querySelector<HTMLButtonElement>(".dr-run");
  return { host, stations, run, announce, view, state: () => current, puzzle: p };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("DIFFERENCE RELAY renderer", () => {
  it("renders six labelled station buttons, five gaps and a run button", () => {
    const { host, stations, run, puzzle: p } = mount();
    expect(stations).toHaveLength(6);
    expect(host.querySelectorAll(".dr-gap")).toHaveLength(5);
    expect(run).not.toBeNull();
    stations.forEach((button, slot) => {
      expect(button.type).toBe("button");
      expect(button.textContent).toBe(String(p.startOrder[slot]));
      expect(button.getAttribute("aria-label")).toBe(stationLabel(p.startOrder[slot] as number, slot, false));
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  it("shows a hidden gap as a question mark and a visible gap as its difference", () => {
    const { host } = mount();
    const gaps = [...host.querySelectorAll<HTMLElement>(".dr-gap")];
    expect(gaps.map((gap) => gap.textContent)).toEqual(["3", "2", "?", "?", "4"]);
  });

  it("swaps two numbers when one is selected and another is tapped", () => {
    const { stations, state } = mount();
    (stations[0] as HTMLButtonElement).click();
    expect(stations[0]?.getAttribute("aria-pressed")).toBe("true");
    (stations[1] as HTMLButtonElement).click();
    expect(state().order[0]).toBe(1);
    expect(state().order[1]).toBe(7);
    expect(state().runs).toHaveLength(0);
  });

  it("runs the relay from the run button and announces where the baton reached", () => {
    const { run, announce, state } = mount();
    (run as HTMLButtonElement).click();
    expect(state().runs).toHaveLength(1);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce.mock.calls[0]?.[0]).toMatch(/baton reached station|relay is open/);
  });

  it("dispatches nothing in a read only view and removes only its own board", () => {
    const { host, stations, run, view, state } = mount(true);
    (stations[0] as HTMLButtonElement).click();
    (run as HTMLButtonElement).click();
    expect(state().runs).toHaveLength(0);
    view.unmount();
    expect(host.children).toHaveLength(0);
  });
});
