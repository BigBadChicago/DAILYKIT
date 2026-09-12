/**
 * Play VECTOR in a terminal. The step two exit condition: the game is playable
 * before a browser sees it, so the renderer is written against rules that are
 * already known to work.
 *
 * The layout below is a carved board embedded by hand because the generator is
 * step three. Replace this constant with a call into generator.ts then.
 *
 *   npx tsx tools/vector-play.ts
 *   npx tsx tools/vector-play.ts --auto
 */

import { createInterface } from "node:readline/promises";
import { argv, stdin, stdout } from "node:process";

import {
  COLS,
  ROWS,
  cellAt,
  candidateList,
  solutionOf,
  type ArrowBoard,
  type ClueLayout,
  type Direction,
} from "../src/games/vector/propagate.js";
import {
  MAX_SUBMISSIONS,
  apply,
  initialState,
  inspect,
  isComplete,
  makePuzzle,
  type VectorAction,
  type VectorState,
} from "../src/games/vector/rules.js";

const LAYOUT: ClueLayout = [
  null, null, null, 6, null, null,
  null, null, 5, null, null, null,
  1, 0, null, 4, 3, null,
  null, null, null, null, null, 2,
  null, 0, 2, null, null, null,
  null, null, null, null, 3, null,
];

const GLYPH = ["^", ">", "v", "<"];

function board(state: VectorState): string {
  const lines: string[] = ["    " + [...Array(COLS).keys()].map((c) => ` ${String(c)} `).join("")];
  for (let row = 0; row < ROWS; row += 1) {
    let line = `  ${String(row)} `;
    for (let col = 0; col < COLS; col += 1) {
      const cell = cellAt(row, col);
      const clue = state.puzzle.clues[cell];
      if (clue !== null) {
        line += `[${String(clue)}]`;
        continue;
      }
      const dir = state.arrows[cell];
      line += dir === null ? " . " : ` ${GLYPH[dir] as string} `;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function status(state: VectorState): string {
  const left = MAX_SUBMISSIONS - state.submissions;
  const filled = state.puzzle.geometry.blankCells.filter(
    (cell) => state.arrows[cell] !== null,
  ).length;
  const total = state.puzzle.geometry.blankCells.length;
  return `${String(filled)} of ${String(total)} placed, ${String(left)} submissions left`;
}

function report(state: VectorState): void {
  const outcome = inspect(state);
  if (outcome.kind !== "finished") return;
  stdout.write(`\n${outcome.detail}, tier ordinal ${String(outcome.tier)}\n`);
  if (outcome.won) return;
  const solution = solutionOf(state.puzzle.geometry);
  if (solution === null) return;
  stdout.write(`\nThe answer was:\n${board({ ...state, arrows: solution })}\n`);
}

function step(state: VectorState, action: VectorAction): VectorState {
  const result = apply(state, action);
  if (result.ok) return result.value;
  stdout.write(`refused: ${result.error.code}, ${result.error.announce}\n`);
  return state;
}

function auto(start: VectorState): void {
  const solution = solutionOf(start.puzzle.geometry) as ArrowBoard;
  let state = start;
  for (const cell of state.puzzle.geometry.blankCells) {
    state = step(state, { kind: "set", cell, dir: solution[cell] as Direction });
  }
  stdout.write(`${board(state)}\n${status(state)}\n`);
  state = step(state, { kind: "submit" });
  report(state);
}

async function interactive(start: VectorState): Promise<void> {
  const io = createInterface({ input: stdin, output: stdout });
  let state = start;
  stdout.write(
    "\nCommands: <row> <col> to turn an arrow, s to submit, c <row> <col> to list a cell's\n" +
      "candidates, q to quit. Rows and columns are zero indexed.\n\n",
  );
  for (;;) {
    stdout.write(`\n${board(state)}\n${status(state)}\n`);
    if (inspect(state).kind === "finished") break;
    const line = (await io.question("> ")).trim().toLowerCase();
    if (line === "q") break;
    if (line === "s") {
      if (!isComplete(state)) stdout.write("board is not full yet\n");
      state = step(state, { kind: "submit" });
      continue;
    }
    const parts = line.split(/\s+/);
    const listing = parts[0] === "c";
    const numbers = (listing ? parts.slice(1) : parts).map(Number);
    if (numbers.length !== 2 || numbers.some((n) => !Number.isInteger(n))) {
      stdout.write("not a command\n");
      continue;
    }
    const row = numbers[0] as number;
    const col = numbers[1] as number;
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      stdout.write("that cell is not on the board\n");
      continue;
    }
    const cell = cellAt(row, col);
    if (listing) {
      const dirs = candidateList(state.puzzle.geometry, cell)
        .map((dir) => GLYPH[dir] as string)
        .join(" ");
      stdout.write(dirs === "" ? "no candidates\n" : `candidates: ${dirs}\n`);
      continue;
    }
    state = step(state, { kind: "cycle", cell });
  }
  report(state);
  io.close();
}

const puzzle = makePuzzle(1, LAYOUT, null, ["none"]);
const start = initialState(puzzle);
if (argv.includes("--auto")) auto(start);
else await interactive(start);
