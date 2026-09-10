import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SUITE_GAMES } from "../src/shell/registry.js";

const REGISTRY_MARKER = "/* NEW_GAME_INSERTION: SUITE_GAMES */";
const TARGETS_MARKER = "/* NEW_GAME_INSERTION: TARGETS */";

export interface NewGameOptions {
  readonly id: string;
  readonly name: string;
  readonly hue: number;
}

export interface NewGameOutput {
  readonly files: ReadonlyMap<string, string>;
  readonly registryInsertion: string;
  readonly targetsInsertion: string;
}

export const NEW_GAME_CONFIG_MARKERS = {
  registry: "SUITE_GAMES",
  targets: "TARGETS",
} as const;

function displayNameFrom(name: string): string {
  const value = name.trim();
  if (value.length === 0) {
    throw new RangeError("game name must not be empty");
  }
  return value;
}

export function validateGameId(id: string): string {
  const clean = id.trim();
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(clean)) {
    throw new RangeError(`game id must be lowercase kebab case, got ${JSON.stringify(id)}`);
  }
  const usedIds = new Set(SUITE_GAMES.map((entry) => entry.id));
  if (usedIds.has(clean)) {
    throw new RangeError(`game id already exists in SUITE_GAMES: ${clean}`);
  }
  if (clean === "toy-tap") {
    throw new RangeError("toy-tap is reserved for the contract fixture");
  }
  return clean;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function renderRegistryInsertion(id: string, name: string, hue: number): string {
  const label = titleCase(name);
  return `  {
    id: "${id}",
    displayName: "${label.toUpperCase()}",
    oneLineRule: "Tap the target cell before the board says no.",
    path: "/${id}/",
    accent: { hue: "${String(Math.max(0, Math.min(359, Math.round(hue))))}", boardFontStack: "ui-monospace, monospace" },
    epoch: { year: 2026, month: 1, day: 1 },
    bucketCount: 4,
    hasWinLoss: true,
    stateVersion: 1,
    status: "planned",
  },`;
}

function renderTargetsInsertion(id: string): string {
  return `  "${id}": {
    outPath: "${id}",
    html: "src/shell/entries/${id}.html",
    gameId: "${id}",
    productionSafe: false,
  },`;
}

function cellsToRows(cells: readonly number[]): string {
  return JSON.stringify(cells);
}

export function buildNewGame(options: NewGameOptions): NewGameOutput {
  const id = validateGameId(options.id);
  const name = displayNameFrom(options.name);
  const hueValue = Number.isInteger(options.hue) ? options.hue : 0;
  const safeHue = Math.max(0, Math.min(359, hueValue));
  const moduleName = titleCase(name);
  const displayName = moduleName.toUpperCase();

  const gameDir = `src/games/${id}`;
  const entryDir = `src/shell/entries`;
  const testDir = `tests/games/${id}`;

  const rulesFile = `import { err, ok, type Result } from "../../core/result.js";
import type { Outcome, Rejection, SerializedState } from "../../core/types.js";

export const GRID_SIZE = 9;

export interface Puzzle {
  readonly number: number;
  readonly target: number;
}

export interface State {
  readonly puzzleNumber: number;
  readonly target: number;
  readonly tapped: readonly number[];
  readonly misses: number;
}

export type Action = { readonly kind: "tap"; readonly cell: number };

export function initialState(puzzle: Puzzle): State {
  return { puzzleNumber: puzzle.number, target: puzzle.target, tapped: [], misses: 0 };
}

export function isTerminal(state: State): boolean {
  return state.tapped.includes(state.target) || state.misses >= 3;
}

export function applyAction(state: State, action: Action): Result<State, Rejection> {
  if (isTerminal(state)) {
    return err({ code: "gameOver", announce: "This puzzle is finished." });
  }
  if (action.cell < 0 || action.cell >= GRID_SIZE) {
    return err({ code: "outOfRange", announce: "That cell does not exist." });
  }
  if (state.tapped.includes(action.cell)) {
    return err({ code: "alreadyTapped", announce: "That cell is already tapped." });
  }
  if (action.cell === state.target) {
    return ok({ ...state, tapped: [...state.tapped, action.cell] });
  }
  return ok({ ...state, misses: state.misses + 1, tapped: [...state.tapped, action.cell] });
}

export function inspect(state: State): Outcome {
  if (!isTerminal(state)) {
    return { kind: "ongoing" };
  }
  const won = state.tapped.includes(state.target);
  return {
    kind: "finished",
    score: won ? Math.max(0, 100 + state.misses * -10) : 0,
    won,
    detail: \`\${state.misses} misses\`,
    tier: won ? 0 : 4,
  };
}

export function bucketOf(state: State): number {
  return Math.min(3, state.misses);
}

export function serializeState(state: State): SerializedState {
  return { v: 1, data: { t: state.tapped, m: state.misses, target: state.target } };
}

export function deserializeState(raw: SerializedState): State {
  const data = raw.data as { t?: unknown; m?: unknown; target?: unknown } | null;
  if (raw.v !== 1 || data === null || !Array.isArray(data.t) || !Number.isInteger(data.m) || !Number.isInteger(data.target)) {
    throw new Error("invalid state");
  }
  return { puzzleNumber: 0, target: data.target as number, tapped: data.t as number[], misses: data.m as number };
}
`;

  const generatorFile = `import { intBelow } from "../../core/rng.js";
import { rngFromSeed } from "../../core/seed.js";
import type { PuzzleNumber, Seed } from "../../core/types.js";

import { GRID_SIZE, type Puzzle } from "./rules.js";

export function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Puzzle {
  const rng = rngFromSeed(seed);
  const target = intBelow(rng, GRID_SIZE);
  return { number: puzzleNumber, target };
}
`;

  const moduleFile = `import { err, ok, type Result } from "../../core/result.js";
import type { FinishedOutcome, Outcome, PuzzleNumber, Rejection, Seed, SerializedState, ShareBlock, ShareContext } from "../../core/types.js";
import { defineGame } from "../../contract/game-module.js";
import type { GameView, HelpContent, MountContext, PuzzleFailure, StateFailure } from "../../contract/types.js";
import { renderGridBoard } from "./render.js";
import { generatePuzzle } from "./generator.js";
import { applyAction, bucketOf, initialState, inspect, type Action, type Puzzle, type State } from "./rules.js";

const gameTitle = "${displayName}";

function parsePuzzleNumber(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : null;
}

export default defineGame<State, Action, Puzzle>({
  identity: {
    id: "${id}",
    displayName: "${displayName}",
    epoch: { year: 2026, month: 1, day: 1 },
    shareUrl: "dailykit.providentia.games",
    accent: { hue: "${String(safeHue)}", boardFontStack: "ui-monospace, monospace" },
    oneLineRule: "Tap the target cell before the board says no.",
  },
  input: { kind: "grid", cols: 3, rows: 3, pointer: "tap" },
  manifest: { indexUrl: "/data/${id}/manifest.index.json", lookaheadDays: 7 },
  archiveEnabled: true,
  hasWinLoss: true,
  stateVersion: 1,
  distribution: { labels: ["0 misses", "1 miss", "2 misses", "3 or more"], distinguishedIndex: 0 },

  parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<Puzzle, PuzzleFailure> {
    if (typeof raw !== "object" || raw === null) {
      return err({ code: "malformed", detail: "puzzle must be an object" });
    }
    const value = raw as { target?: unknown; number?: unknown };
    const target = typeof value.target === "number" && Number.isInteger(value.target) && value.target >= 0 && value.target < 9 ? value.target : null;
    if (target === null) {
      return err({ code: "malformed", detail: "target must be a cell index" });
    }
    const parsed = parsePuzzleNumber(value.number ?? puzzleNumber);
    if (parsed === null) {
      return err({ code: "malformed", detail: "number must be a positive integer" });
    }
    return ok({ number: parsed, target });
  },

  generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<Puzzle, PuzzleFailure> {
    return ok(generatePuzzle(puzzleNumber, seed));
  },

  initialState: (puzzle) => initialState(puzzle),

  serialize: (state) => ({ v: 1, data: { target: state.target, t: state.tapped, m: state.misses } }),

  deserialize(puzzle, raw): Result<State, StateFailure> {
    if (raw.v !== 1 || typeof raw.data !== "object" || raw.data === null) {
      return err({ code: "unsupported-version", detail: \`v\${raw.v}\` });
    }
    const data = raw.data as { target?: unknown; t?: unknown; m?: unknown };
    if (!Number.isInteger(data.target) || !Array.isArray(data.t) || !Number.isInteger(data.m)) {
      return err({ code: "malformed", detail: "state payload is invalid" });
    }
    return ok({ puzzleNumber: puzzle.number, target: data.target as number, tapped: data.t as number[], misses: data.m as number });
  },

  migrateState: (fromVersion) => err({ code: "unsupported-version", detail: \`no path from v\${fromVersion}\` }),

  apply: (state, action) => applyAction(state, action),

  inspect: (state) => inspect(state),

  bucketOf: (_outcome: FinishedOutcome, state) => bucketOf(state),

  shareBlock(state, context: ShareContext): ShareBlock {
    const label = state.tapped.includes(state.target) ? "won" : "play";
    return {
      title: \`\${gameTitle} #\${context.puzzleNumber} \${label}\`,
      rows: [["best", "best", "best"]],
    };
  },

  mount(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
    return renderGridBoard(host, context);
  },

  help(): HelpContent {
    return {
      headline: "Tap the target cell.",
      steps: ["The target is fixed for the day.", "Wrong cells count as misses.", "Tap the right cell to finish."],
      example: {
        caption: "Find the target before the misses pile up.",
        lines: ["1 2 3", "4 5 6", "7 8 9"],
      },
    };
  },
});
`;

  const renderFile = `import { el, setText } from "../../ui/dom.js";
import type { GameView, MountContext } from "../../contract/types.js";

import { GRID_SIZE, isTerminal, type Action, type State, type Puzzle } from "./rules.js";

export function renderGridBoard(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
  const grid = el("div", { class: "dk-grid dk-grid-3" });
  const buttons: HTMLButtonElement[] = [];

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const button = el("button", {
      class: "dk-cell",
      attrs: { type: "button", "aria-label": \`Cell \${index + 1}\` },
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
`;

  const styleFile = `:root {
  --dk-accent: hsl(${safeHue} 80% 60%);
}

.dk-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  width: min(20rem, 100%);
}

.dk-cell {
  aspect-ratio: 1;
  border: 2px solid var(--dk-accent);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--dk-accent) 22%, white);
  color: inherit;
  font-size: 1.4rem;
}

.dk-cell[data-state="pressed"] {
  background: var(--dk-accent);
  color: white;
}

.dk-cell[data-state="target"] {
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.2);
}
`;

  const helpFile = `export const HELP = {
  headline: "Tap the target cell.",
  steps: ["Every day has one target cell.", "Wrong cells count as misses.", "A solved board ends immediately."],
  example: {
    caption: "The target is the one square to find.",
    lines: ["1 2 3", "4 5 6", "7 8 9"],
  },
};
`;

  const entryFile = `import gameModule from "../../games/${id}/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
`;

  const htmlFile = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="light dark" />
    <meta name="description" content="A daily puzzle from DAILYKIT. One puzzle a day, the same for everyone." />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <title>DAILYKIT</title>
  </head>
  <body>
    <div id="app" class="dk-app"></div>
    <script type="module" src="./${id}.ts"></script>
  </body>
</html>
`;

  const rulesTest = `import { describe, expect, it } from "vitest";

import { applyAction, inspect, initialState, isTerminal, type State } from "../../../src/games/${id}/rules.js";

const puzzle = { number: 1, target: 4 };
const start = initialState(puzzle);

describe("${displayName} rules", () => {
  it("accepts the target and rejects an already tapped cell", () => {
    const solved = applyAction(start, { kind: "tap", cell: 4 });
    expect(solved.ok).toBe(true);
    expect(solved.ok && solved.value.tapped).toEqual([4]);
    const again = applyAction(solved.ok ? solved.value : start, { kind: "tap", cell: 4 });
    expect(again.ok).toBe(false);
  });

  it("returns values for out of range input and a finished puzzle", () => {
    expect(applyAction(start, { kind: "tap", cell: -1 })).toMatchObject({
      ok: false,
      error: { code: "outOfRange" },
    });
    let state = start;
    for (const cell of [0, 1, 2]) {
      const result = applyAction(state, { kind: "tap", cell });
      if (!result.ok) throw new Error(result.error.code);
      state = result.value;
    }
    expect(isTerminal(state)).toBe(true);
    expect(applyAction(state, { kind: "tap", cell: 3 })).toMatchObject({
      ok: false,
      error: { code: "gameOver" },
    });
  });

  it("marks a finished board and records misses", () => {
    const state: State = { puzzleNumber: 1, target: 4, tapped: [4], misses: 2 };
    expect(inspect(state)).toMatchObject({ kind: "finished", won: true, detail: "2 misses" });
    expect(inspect({ puzzleNumber: 1, target: 4, tapped: [0, 1, 2], misses: 3 })).toMatchObject({
      kind: "finished",
      won: false,
      tier: 4,
    });
  });
});
`;

  const moduleTest = `import { describe, expect, it } from "vitest";
import { isOk } from "../../../src/core/result.js";
import game from "../../../src/games/${id}/module.js";

describe("${displayName} module", () => {
  it("parses a puzzle and serializes it back", () => {
    const parsed = game.parsePuzzle(12, { target: 5, number: 12 });
    expect(isOk(parsed)).toBe(true);
    const puzzle = (parsed as unknown as { value: { number: number; target: number } }).value;
    const state = game.initialState(puzzle as never);
    const raw = game.serialize(state);
    const restored = game.deserialize(puzzle as never, raw);
    expect(isOk(restored)).toBe(true);
  });

  it("shares a title and a compact row", () => {
    const state = game.initialState({ number: 7, target: 0 } as never);
    const share = game.shareBlock(state, { puzzleNumber: 7, currentStreak: 0, rated: true });
    expect(share.title).toContain("#7");
    expect(share.rows[0]).toHaveLength(3);
  });
});
`;

  const files = new Map<string, string>([
    [`${gameDir}/rules.ts`, rulesFile],
    [`${gameDir}/generator.ts`, generatorFile],
    [`${gameDir}/module.ts`, moduleFile],
    [`${gameDir}/render.ts`, renderFile],
    [`${gameDir}/style.css`, styleFile],
    [`${gameDir}/help.ts`, helpFile],
    [`${entryDir}/${id}.ts`, entryFile],
    [`${entryDir}/${id}.html`, htmlFile],
    [`${testDir}/rules.test.ts`, rulesTest],
    [`${testDir}/module.test.ts`, moduleTest],
  ]);

  return {
    files,
    registryInsertion: renderRegistryInsertion(id, name, safeHue),
    targetsInsertion: renderTargetsInsertion(id),
  };
}

function ensureNoExistingFiles(paths: readonly string[]): void {
  const collisions = paths.filter((target) => existsSync(target));
  if (collisions.length > 0) {
    throw new Error(`refusing to overwrite existing game files: ${collisions.join(", ")}`);
  }
}

function writeFileWithParents(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
}

function assertConfigReady(id: string): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const registrySource = readFileSync(resolve(root, "../src/shell/registry.ts"), "utf8");
  const targetsSource = readFileSync(resolve(root, "../vite.config.ts"), "utf8");
  if (!registrySource.includes(REGISTRY_MARKER)) {
    throw new Error("registry marker missing from src/shell/registry.ts");
  }
  if (!targetsSource.includes(TARGETS_MARKER)) {
    throw new Error("targets marker missing from vite.config.ts");
  }
  if (registrySource.includes(`id: "${id}"`)) {
    throw new Error(`game id already exists in src/shell/registry.ts: ${id}`);
  }
  if (targetsSource.includes(`"${id}": {`)) {
    throw new Error(`game id already exists in vite.config.ts: ${id}`);
  }
}

function patchConfigFiles(id: string, registryInsertion: string, targetsInsertion: string): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const registryPath = resolve(root, "../src/shell/registry.ts");
  const targetsPath = resolve(root, "../vite.config.ts");

  const registrySource = readFileSync(registryPath, "utf8");
  const registryUpdated = registrySource.replace(REGISTRY_MARKER, `${registryInsertion}\n  ${REGISTRY_MARKER}`);
  writeFileSync(registryPath, registryUpdated, "utf8");

  const targetsSource = readFileSync(targetsPath, "utf8");
  const targetsUpdated = targetsSource.replace(TARGETS_MARKER, `${targetsInsertion}\n  ${TARGETS_MARKER}`);
  writeFileSync(targetsPath, targetsUpdated, "utf8");

  if (id.trim().length === 0) {
    throw new Error("game id must not be empty");
  }
}

export function main(argv: readonly string[]): void {
  let id: string | undefined;
  let name: string | undefined;
  let hue: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined) continue;
    if (flag === "--id" && value !== undefined) id = value;
    if (flag === "--name" && value !== undefined) name = value;
    if (flag === "--hue" && value !== undefined) hue = value;
    if (flag.startsWith("--") && value !== undefined) index += 1;
  }

  if (id === undefined || name === undefined || hue === undefined) {
    throw new Error("usage: npm run new-game -- --id <kebab-case-id> --name \"<DISPLAY NAME>\" --hue <0-359>");
  }

  const options: NewGameOptions = {
    id: id,
    name: name,
    hue: Number.parseInt(hue, 10),
  };

  const output = buildNewGame(options);
  const allPaths = [...output.files.keys()].map((filePath) => resolve(process.cwd(), filePath));
  ensureNoExistingFiles(allPaths);
  assertConfigReady(options.id);

  for (const [relativePath, contents] of output.files) {
    writeFileWithParents(resolve(process.cwd(), relativePath), contents);
  }

  patchConfigFiles(id, output.registryInsertion, output.targetsInsertion);
  console.log(`scaffolded ${id}`);
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("new-game.ts")) {
  main(process.argv.slice(2));
}
