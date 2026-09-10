import { el, setText } from "../../ui/dom.js";
import type { GameView, MountContext } from "../../contract/types.js";

import { GRID_SIZE, isTerminal, type Action, type State, type Puzzle } from "./rules.js";

export function renderGridBoard(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
  const grid = el("div", { class: "dk-grid dk-grid-3" });
  const buttons: HTMLButtonElement[] = [];

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const button = el("button", {
      class: "dk-cell",
      attrs: { type: "button", "aria-label": `Cell ${index + 1}` },
      on: {
        click: () => {
          context.dispatch({ kind: "tap", cell: index });
        },
      },
    });
    buttons.push(button);
    grid.appendChild(button);
  }

  host.appendChild(grid);

  function paint(next: State): void {
    for (let index = 0; index < buttons.length; index += 1) {
      const button = buttons[index];
      if (button === undefined) continue;
      const pressed = next.tapped.includes(index);
      const isTarget = index === next.target && !pressed;
      button.dataset["state"] = pressed ? "pressed" : isTarget ? "target" : "empty";
      setText(button, pressed ? "X" : isTarget ? "?" : "·");
      button.disabled = isTerminal(next);
    }
  }

  paint(context.initial);
  return {
    update(state) {
      paint(state);
    },
    unmount() {
      host.textContent = "";
    },
  };
}
