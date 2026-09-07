import { HAND_ORDINAL } from "../../shared/poker-hands.js";
import { handOrdinal } from "./evaluator.js";
import { applyPokerAction, enumerateSelections, type PokerState } from "./rules.js";

export interface SolverResult {
  readonly score: number;
  readonly hands: number;
  readonly nodes: number;
  readonly method: "exact" | "beam";
}

export interface SolverOptions {
  readonly maxNodes?: number;
}

export function solve(initial: PokerState, options: SolverOptions = {}): SolverResult {
  const maxNodes = options.maxNodes ?? Number.POSITIVE_INFINITY;
  let nodes = 0;
  let best = { score: initial.score, hands: initial.hands.length };

  const visit = (state: PokerState): void => {
    if (nodes >= maxNodes) return;
    nodes += 1;
    if (state.score > best.score || (state.score === best.score && state.hands.length > best.hands)) {
      best = { score: state.score, hands: state.hands.length };
    }
    for (const selection of enumerateSelections(state.grid)) {
      if (nodes >= maxNodes) return;
      const cards = selection.map((cell) => state.grid[cell] as number);
      if (handOrdinal(cards) <= HAND_ORDINAL["high-card"]) continue;
      let selected: PokerState = { ...state, selection: [] };
      for (const cell of selection) {
        const added = applyPokerAction(selected, { kind: "add", cell });
        if (!added.ok) {
          selected = { ...state, selection: [] };
          break;
        }
        selected = added.value;
      }
      const result = applyPokerAction(selected, { kind: "commit" });
      if (result.ok) visit(result.value);
    }
  };

  visit(initial);
  return {
    ...best,
    nodes,
    method: nodes >= maxNodes ? "beam" : "exact",
  };
}
