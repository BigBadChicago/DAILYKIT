/**
 * Tools layer. `npm run new-game`, the scaffold. Charter Phase 12, rewritten for
 * the v3 contract in v3 migration phase 6.
 *
 * It writes a small but complete daily game against GameModuleV3, the tests the
 * game's certification plan names, and three insertions: a `planned` registry
 * row, a build target that is never production safe, and a GAME_PLANS row in
 * tools/certify.ts. The game ships only through its own committed certification
 * record, and the plan the scaffold writes cannot produce a safe one until the
 * author replaces its five empty steps. NEW_GAME.md is the procedure.
 *
 * Template decision 10, approved 2026-09-17: an id that already has a `planned`
 * registry row is adopted rather than refused. The slate's unbuilt games are
 * registry rows before they are code, so the scaffold reads the row's display
 * name, rule, accent, epoch, bucket count, win and loss flag and state version,
 * writes the game from them, and leaves the registry alone. A `live` id is
 * still refused. The row's values are provisional inputs the author may correct.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SUITE_GAMES } from "../src/shell/registry.js";

const REGISTRY_MARKER = "/* NEW_GAME_INSERTION: SUITE_GAMES */";
const TARGETS_MARKER = "/* NEW_GAME_INSERTION: TARGETS */";
/** Defined here and not in certify.ts, because a marker constant in the file it
 *  marks would be the first match insertAtMarker finds. */
export const GAME_PLANS_MARKER = "/* NEW_GAME_INSERTION: GAME_PLANS */";

export interface NewGameOptions {
  readonly id: string;
  /** Required for a new id. Optional when adopting a planned row, and refused
   *  when it disagrees with the row, because the row is the one source. */
  readonly name?: string;
  readonly hue?: number;
}

export interface NewGameOutput {
  readonly files: ReadonlyMap<string, string>;
  /** Null when the id adopted an existing planned row, which is left untouched. */
  readonly registryInsertion: string | null;
  /** True when the game was generated from an existing planned registry row. */
  readonly adopted: boolean;
  readonly targetsInsertion: string;
  readonly plansInsertion: string;
}

export const NEW_GAME_CONFIG_MARKERS = {
  registry: "SUITE_GAMES",
  targets: "TARGETS",
  plans: "GAME_PLANS",
} as const;

/** What every template reads. */
interface Names {
  readonly id: string;
  readonly displayName: string;
  readonly hue: number;
  readonly oneLineRule: string;
  readonly boardFontStack: string;
  readonly epoch: { readonly year: number; readonly month: number; readonly day: number };
  readonly bucketCount: number;
  readonly hasWinLoss: boolean;
  readonly stateVersion: number;
}

/** The subset of a registry row the scaffold reads. */
export interface AdoptableRow {
  readonly id: string;
  readonly displayName: string;
  readonly oneLineRule: string;
  readonly accent: { readonly hue: string; readonly boardFontStack: string };
  readonly epoch: { readonly year: number; readonly month: number; readonly day: number };
  readonly bucketCount: number;
  readonly hasWinLoss: boolean;
  readonly stateVersion: number;
  readonly status: "live" | "planned";
}

/** What a new id gets. Template decision 4 fixes the epoch. */
const DEFAULT_RULE = "Tap the target cell before the board says no.";
const DEFAULT_FONT_STACK = "ui-monospace, monospace";
const DEFAULT_EPOCH = { year: 2026, month: 1, day: 5 } as const;
const DEFAULT_BUCKETS = 4;

/* The stub allows one miss fewer than it has buckets and shares one row per tap,
   so three buckets is the fewest that leaves a miss before the find and seven
   the most whose longest run fits the seven share rows. */
export const MIN_BUCKETS = 3;
export const MAX_BUCKETS = 7;

/** Refuses a malformed id, a live id and the fixture id. A planned id passes;
 *  adoptedRow says whether it has a row to adopt. */
export function validateGameId(id: string, games: readonly AdoptableRow[] = SUITE_GAMES): string {
  const clean = id.trim();
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(clean)) {
    throw new RangeError(`game id must be lowercase kebab case, got ${JSON.stringify(id)}`);
  }
  const existing = games.find((entry) => entry.id === clean);
  if (existing !== undefined && existing.status !== "planned") {
    throw new RangeError(`game id already exists in SUITE_GAMES as a ${existing.status} game: ${clean}`);
  }
  if (clean === "toy-v3") {
    throw new RangeError("toy-v3 is reserved for the contract fixture");
  }
  return clean;
}

/** The planned row an id adopts, or null for a new id. */
export function adoptedRow(id: string, games: readonly AdoptableRow[] = SUITE_GAMES): AdoptableRow | null {
  return games.find((entry) => entry.id === id && entry.status === "planned") ?? null;
}

/* Everything the templates put inside a double quoted string. */
function templateSafe(label: string, value: string): string {
  if (value.length === 0 || /["`\\$\n]/.test(value)) {
    throw new RangeError(`${label} must be non empty and free of quotes, backticks, backslashes, dollar signs and newlines`);
  }
  return value;
}

function namesFromRow(row: AdoptableRow, options: NewGameOptions): Names {
  if (options.name !== undefined && displayNameFrom(options.name) !== row.displayName) {
    throw new RangeError(`--name disagrees with the planned registry row for ${row.id}, which says ${row.displayName}; edit the row instead`);
  }
  const hue = Number(row.accent.hue);
  if (!Number.isInteger(hue) || hue < 0 || hue > 359) {
    throw new RangeError(`the planned registry row for ${row.id} has hue ${row.accent.hue}, not an integer from 0 to 359`);
  }
  if (options.hue !== undefined && options.hue !== hue) {
    throw new RangeError(`--hue disagrees with the planned registry row for ${row.id}, which says ${row.accent.hue}; edit the row instead`);
  }
  if (!Number.isInteger(row.bucketCount) || row.bucketCount < MIN_BUCKETS || row.bucketCount > MAX_BUCKETS) {
    throw new RangeError(`the planned registry row for ${row.id} has ${String(row.bucketCount)} buckets; the scaffold writes ${String(MIN_BUCKETS)} to ${String(MAX_BUCKETS)}`);
  }
  if (!Number.isInteger(row.stateVersion) || row.stateVersion < 1) {
    throw new RangeError(`the planned registry row for ${row.id} has state version ${String(row.stateVersion)}`);
  }
  const { year, month, day } = row.epoch;
  if (![year, month, day].every(Number.isInteger)) {
    throw new RangeError(`the planned registry row for ${row.id} has a malformed epoch`);
  }
  return {
    id: row.id,
    displayName: templateSafe("display name", displayNameFrom(row.displayName)),
    hue,
    oneLineRule: templateSafe("one line rule", row.oneLineRule),
    boardFontStack: templateSafe("board font stack", row.accent.boardFontStack),
    epoch: { year, month, day },
    bucketCount: row.bucketCount,
    hasWinLoss: row.hasWinLoss,
    stateVersion: row.stateVersion,
  };
}

function namesForNewId(id: string, options: NewGameOptions): Names {
  if (options.name === undefined || options.hue === undefined) {
    throw new RangeError(`${id} has no planned registry row, so --name and --hue are required`);
  }
  return {
    id,
    displayName: displayNameFrom(options.name),
    hue: hueFrom(options.hue),
    oneLineRule: DEFAULT_RULE,
    boardFontStack: DEFAULT_FONT_STACK,
    epoch: DEFAULT_EPOCH,
    bucketCount: DEFAULT_BUCKETS,
    hasWinLoss: true,
    stateVersion: 1,
  };
}

function epochText(n: Names): string {
  return `{ year: ${String(n.epoch.year)}, month: ${String(n.epoch.month)}, day: ${String(n.epoch.day)} }`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"] as const;

/** Cells the stub's tests tap as misses, never the given target, in order. */
function missCells(target: number, count: number): string {
  const cells: number[] = [];
  for (let cell = 0; cell < 9 && cells.length < count; cell += 1) if (cell !== target) cells.push(cell);
  return `[${cells.join(", ")}]`;
}

function displayNameFrom(name: string): string {
  const value = name.trim().split(/\s+/).filter(Boolean).join(" ").toUpperCase();
  if (value.length === 0) throw new RangeError("game name must not be empty");
  if (/["`\\$]/.test(value)) throw new RangeError("game name must not contain quotes, backticks, backslashes or dollar signs");
  return value;
}

function hueFrom(hue: number): number {
  return Number.isInteger(hue) ? Math.max(0, Math.min(359, hue)) : 0;
}

function registryInsertion(n: Names): string {
  return `  {
    id: "${n.id}",
    displayName: "${n.displayName}",
    oneLineRule: "${n.oneLineRule}",
    path: "/${n.id}/",
    accent: { hue: "${String(n.hue)}", boardFontStack: "${n.boardFontStack}" },
    epoch: ${epochText(n)},
    bucketCount: ${String(n.bucketCount)},
    hasWinLoss: ${String(n.hasWinLoss)},
    stateVersion: ${String(n.stateVersion)},
    status: "planned",
  },`;
}

function targetsInsertion(n: Names): string {
  return `  "${n.id}": {
    outPath: "${n.id}",
    html: "src/shell/entries/${n.id}.html",
    gameId: "${n.id}",
    productionSafe: false,
  },`;
}

/* The row names the stub plan and nothing else. The author replaces a step by
   overriding its key after the spread, the way the live rows override theirs. */
function plansInsertion(n: Names): string {
  return `  "${n.id}": {
    ...newGamePlan("${n.id}"),
  },`;
}

function entryFile(n: Names): string {
  return `/** Layer 5. The ${n.id} entry. One file per game, listed in vite.config.ts. It
 *  mounts the module's default export, the v3 module the shell reads. */

import gameModule from "../../games/${n.id}/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
`;
}

function htmlFile(n: Names): string {
  return `<!doctype html>
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
    <script type="module" src="./${n.id}.ts"></script>
  </body>
</html>
`;
}

function rulesFile(n: Names): string {
  return `/**
 * Layer 4. ${n.displayName} rules, written by npm run new-game. Pure: no DOM, no
 * clock and no randomness. Replace the tap search with the real puzzle rule by
 * rule, keeping every refused action a value and never an exception.
 */

import { err, ok, type Result } from "../../core/result.js";
import type { BucketId, Rejection, TierOrdinal } from "../../core/types.js";

export const GRID_SIZE = 9;
export const MAX_MISSES = ${String(n.bucketCount - 1)};

export interface Puzzle {
  readonly number: number;
  readonly target: number;
}

export interface State {
  readonly puzzle: Puzzle;
  /** Every tapped cell in play order. The run log is read from this. */
  readonly tapped: readonly number[];
}

export type Action = { readonly kind: "tap"; readonly cell: number };

export function initialState(puzzle: Puzzle): State {
  return { puzzle, tapped: [] };
}

export function found(state: State): boolean {
  return state.tapped.includes(state.puzzle.target);
}

export function misses(state: State): number {
  return state.tapped.filter((cell) => cell !== state.puzzle.target).length;
}

export function isTerminal(state: State): boolean {
  return found(state) || misses(state) >= MAX_MISSES;
}

export function applyAction(state: State, action: Action): Result<State, Rejection> {
  if (isTerminal(state)) {
    return err({ code: "game-over", announce: "This puzzle is finished." });
  }
  if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell >= GRID_SIZE) {
    return err({ code: "out-of-range", announce: "That cell does not exist." });
  }
  if (state.tapped.includes(action.cell)) {
    return err({ code: "already-tapped", announce: "That cell is already tapped." });
  }
  return ok({ ...state, tapped: [...state.tapped, action.cell] });
}

/** Index into the module's distribution labels: misses before the find, and
 *  the last bucket for a board never found. */
export function bucketFor(state: State): BucketId {
  return found(state) ? misses(state) : MAX_MISSES;
}

/** Tier by misses, capped below the worst tier, which a board never found takes. */
export function tierFor(state: State): TierOrdinal {
  return found(state) ? (Math.min(misses(state), 3) as TierOrdinal) : 4;
}
`;
}

function generatorFile(n: Names): string {
  return `/**
 * Layer 4. ${n.displayName} puzzle generation, written by npm run new-game. Seeded
 * and deterministic, so Node and every browser produce the same day.
 */

import { intBelow } from "../../core/rng.js";
import { rngFromSeed } from "../../core/seed.js";
import type { PuzzleNumber, Seed } from "../../core/types.js";

import { GRID_SIZE, type Puzzle } from "./rules.js";

export function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Puzzle {
  return { number: puzzleNumber, target: intBelow(rngFromSeed(seed), GRID_SIZE) };
}
`;
}

function distributionLabels(n: Names): string {
  const labels: string[] = [];
  for (let miss = 0; miss < n.bucketCount - 1; miss += 1) labels.push(`"${String(miss)} ${miss === 1 ? "miss" : "misses"}"`);
  labels.push('"Not found"');
  return labels.join(", ");
}

function moduleFile(n: Names): string {
  return `/**
 * Layer 4. The ${n.displayName} module, written by npm run new-game against the v3
 * contract, the only contract since v3 migration phase 6. The default export is
 * what the entry mounts. The game ships only through its own certification
 * record; see NEW_GAME.md.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  DistributionSpec,
  FinishedOutcomeV3,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  Seed,
  SerializedState,
  ShareContext,
  ShareRow,
} from "../../core/types.js";
import { defineGameV3, type GameModuleV3 } from "../../contract/v3/game-module.js";
import type { ShareCapabilities } from "../../contract/v3/types.js";
import type {
  GameIdentity,
  GameView,
  HelpContent,
  InputDescriptor,
  ManifestDescriptor,
  MountContext,
  PuzzleFailure,
  StateFailure,
} from "../../contract/types.js";
import type { ArtifactModel, Fingerprint, RunLog } from "../../engine/telemetry.js";

import { generatePuzzle as generateFromSeed } from "./generator.js";
import { HELP } from "./help.js";
import { renderGridBoard } from "./render.js";
import {
  GRID_SIZE,
  MAX_MISSES,
  applyAction,
  bucketFor,
  found,
  initialState,
  isTerminal,
  misses,
  tierFor,
  type Action,
  type Puzzle,
  type State,
} from "./rules.js";

const STATE_VERSION = ${String(n.stateVersion)};
const RUN_LOG_VERSION = 1;

const identity: GameIdentity = {
  id: "${n.id}",
  displayName: "${n.displayName}",
  /* First Monday of the epoch year, so puzzle 1 lands in the gentlest band. */
  epoch: ${epochText(n)},
  shareUrl: "dailykit.providentia.games",
  accent: { hue: "${String(n.hue)}", boardFontStack: "${n.boardFontStack}" },
  oneLineRule: "${n.oneLineRule}",
};

const input: InputDescriptor = { kind: "grid", cols: 3, rows: 3, pointer: "tap" };
const manifest: ManifestDescriptor = { indexUrl: \`/data/\${identity.id}/manifest.index.json\`, lookaheadDays: 7 };
const distribution: DistributionSpec = {
  labels: [${distributionLabels(n)}],
  distinguishedIndex: 0,
};
/* One row per tap, and a player taps at most every miss plus the find. */
const shareCapabilities: ShareCapabilities = {
  grammar: "A",
  patterns: ["deterministic-output", "emergent-fingerprint"],
  maxRows: MAX_MISSES + 1,
};

function parsePuzzle(puzzleNumber: PuzzleNumber, raw: unknown): Result<Puzzle, PuzzleFailure> {
  const target = (raw as { target?: unknown } | null)?.target;
  if (typeof target !== "number" || !Number.isInteger(target) || target < 0 || target >= GRID_SIZE) {
    return err({ code: "malformed", detail: "target must be a cell index" });
  }
  return ok({ number: puzzleNumber, target });
}

function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Result<Puzzle, PuzzleFailure> {
  return ok(generateFromSeed(puzzleNumber, seed));
}

function serialize(state: State): SerializedState {
  return { v: STATE_VERSION, data: { t: state.tapped } };
}

function deserialize(puzzle: Puzzle, raw: SerializedState): Result<State, StateFailure> {
  if (raw.v !== STATE_VERSION) {
    return err({ code: "unsupported-version", detail: \`version \${String(raw.v)}\` });
  }
  const tapped = (raw.data as { t?: unknown } | null)?.t;
  if (!Array.isArray(tapped) || tapped.some((cell) => !Number.isInteger(cell) || cell < 0 || cell >= GRID_SIZE)) {
    return err({ code: "malformed", detail: "tapped cells are not cell indexes" });
  }
  /* Replayed through the rules, so a save no legal game could reach is refused. */
  let state = initialState(puzzle);
  for (const cell of tapped as number[]) {
    const next = applyAction(state, { kind: "tap", cell });
    if (!next.ok) return err({ code: "malformed", detail: \`tap \${String(cell)} refused: \${next.error.code}\` });
    state = next.value;
  }
  return ok(state);
}

function migrateState(fromVersion: number, _raw: SerializedState): Result<SerializedState, StateFailure> {
  return err({ code: "unsupported-version", detail: \`no path from version \${String(fromVersion)}\` });
}

function apply(state: State, action: Action): Result<State, Rejection> {
  return applyAction(state, action);
}

/** Measured from the puzzle, never read from the manifest. Every board of this
 *  stub is the same size, so every board measures the same. */
function difficulty(_puzzle: Puzzle): number {
  return GRID_SIZE;
}

function finishedOutcome(state: State): FinishedOutcomeV3 {
  const won = found(state);
  return {
    kind: "finished",
    score: won ? MAX_MISSES - misses(state) : 0,
    ${n.hasWinLoss ? "won" : "won: null"},
    detail: won ? \`Found after \${String(misses(state))} misses\` : "Not found",
    tier: tierFor(state),
    bucket: bucketFor(state),
    difficulty: difficulty(state.puzzle),
  };
}

function inspect(state: State): OutcomeV3 {
  return isTerminal(state) ? finishedOutcome(state) : { kind: "ongoing" };
}

/** The local run log: one entry per tap, holding whether it found the target
 *  and never which cell it was. */
function telemetry(state: State): RunLog {
  return {
    v: RUN_LOG_VERSION,
    entries: state.tapped.map((cell, index) => ({ index, hit: cell === state.puzzle.target })),
  };
}

function hits(run: RunLog): boolean[] {
  return run.entries.map((entry) => (entry as { hit?: unknown }).hit === true);
}

/** The pure mapper from run log to artifact. It reads the run log and the
 *  outcome, never a cell, so no row can say where the target was. */
function shareArtifact(_puzzle: Puzzle, state: State, run: RunLog, context: ShareContext): ArtifactModel {
  const taps = hits(run);
  const rows: ShareRow[] = taps.map((hit) => [hit ? "best" : "miss"]);
  const fingerprint: Fingerprint = {
    points: taps.map((hit, x) => ({ x, y: hit ? 1 : 0, shape: hit ? "accepted" : "refused" })),
  };
  const outcome = finishedOutcome(state);
  const label = found(state) ? \`found in \${String(taps.length)}\` : "not found";
  const streak = context.currentStreak > 1 ? \`, streak \${String(context.currentStreak)}\` : "";
  return {
    title: \`\${identity.displayName} #\${String(context.puzzleNumber)} \${label}\${streak}\`,
    rows,
    outcome,
    fingerprint,
  };
}

function mount(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
  return renderGridBoard(host, context);
}

function help(): HelpContent {
  return HELP;
}

const game: GameModuleV3<State, Action, Puzzle> = {
  identity,
  input,
  manifest,
  archiveEnabled: true,
  hasWinLoss: ${String(n.hasWinLoss)},
  stateVersion: STATE_VERSION,
  distribution,
  shareCapabilities,
  parsePuzzle,
  generatePuzzle,
  initialState,
  serialize,
  deserialize,
  migrateState,
  apply,
  inspect,
  difficulty,
  telemetry,
  shareArtifact,
  mount,
  help,
};

export default defineGameV3(game);

/** Typed access for this game's tests. Nothing in the shell reads these. */
export const internals = { parsePuzzle, serialize, deserialize, inspect, telemetry, shareArtifact, STATE_VERSION };
`;
}

function renderFile(n: Names): string {
  return `/**
 * Layer 4. ${n.displayName} renderer, written by npm run new-game. Buttons carry
 * their own focus and keyboard activation, every tap is announced, and no cell
 * shows the target until a tap finds it.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { el, setAttr, setText } from "../../ui/dom.js";

import { GRID_SIZE, isTerminal, type Action, type Puzzle, type State } from "./rules.js";
import "./style.css";

export function cellLabel(cell: number): string {
  return \`Cell \${String(cell + 1)}\`;
}

export function renderGridBoard(host: HTMLElement, context: MountContext<State, Action, Puzzle>): GameView<State> {
  const grid = el("div", { class: "${n.id}-grid", attrs: { role: "group", "aria-label": "Board" } });
  const buttons: HTMLButtonElement[] = [];
  let shown = context.initial;

  for (let cell = 0; cell < GRID_SIZE; cell += 1) {
    const button = el("button", {
      class: "${n.id}-cell",
      attrs: { type: "button", "data-cell": cell },
      on: {
        click: () => {
          if (context.readOnly) return;
          context.dispatch({ kind: "tap", cell });
        },
      },
    });
    buttons.push(button);
    grid.appendChild(button);
  }
  host.appendChild(grid);

  function paint(state: State): void {
    const finished = isTerminal(state);
    for (const [cell, button] of buttons.entries()) {
      const tapped = state.tapped.includes(cell);
      const hit = tapped && cell === state.puzzle.target;
      const mark = hit ? "found" : tapped ? "miss" : "open";
      button.dataset["state"] = mark;
      /* The mark is text as well as color, so meaning never rests on color. */
      setText(button, hit ? "O" : tapped ? "X" : "");
      setAttr(button, "aria-label", \`\${cellLabel(cell)}, \${mark}\`);
      button.disabled = finished || tapped || context.readOnly;
    }
  }

  paint(shown);
  return {
    update(state) {
      const tap = state.tapped[state.tapped.length - 1];
      if (state.tapped.length > shown.tapped.length && tap !== undefined) {
        context.announce(\`\${cellLabel(tap)}, \${tap === state.puzzle.target ? "found" : "miss"}\`);
      }
      shown = state;
      paint(state);
    },
    unmount() {
      host.removeChild(grid);
    },
  };
}
`;
}

function styleFile(n: Names): string {
  return `/* ${n.displayName} play area only, written by npm run new-game. The engine owns the
   chrome and sets --dk-accent and --dk-board-font from the game's identity. */

.${n.id}-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(2.75rem, 1fr));
  gap: 0.5rem;
  width: min(20rem, 100%);
  margin: 0 auto;
  font-family: var(--dk-board-font);
}

.${n.id}-cell {
  aspect-ratio: 1;
  min-height: 2.75rem;
  border: 2px solid var(--dk-accent);
  border-radius: 0.75rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1.4rem;
  touch-action: manipulation;
}

.${n.id}-cell:focus-visible {
  outline: 3px solid var(--dk-accent);
  outline-offset: 2px;
}

.${n.id}-cell[data-state="found"] {
  background: var(--dk-accent);
  color: white;
}

.${n.id}-cell[data-state="miss"] {
  opacity: 0.6;
}
`;
}

function helpFile(n: Names): string {
  return `/** Layer 4. ${n.displayName} help, written by npm run new-game. One screen, with a
 *  worked example whose lines are its own text equivalent. */

import type { HelpContent } from "../../core/types.js";

export const HELP: HelpContent = {
  headline: "${n.oneLineRule}",
  steps: [
    "Every day has one target cell, the same for everyone.",
    "A wrong cell is a miss, and ${NUMBER_WORDS[n.bucketCount - 1] ?? String(n.bucketCount - 1)} misses end the day.",
    "Finding the target ends the day at once.",
  ],
  example: {
    caption: "Two misses, then the find in the middle.",
    lines: ["X . .", ". O .", ". . X"],
  },
};
`;
}

function rulesTestFile(n: Names): string {
  return `import { describe, expect, it } from "vitest";

import {
  GRID_SIZE,
  MAX_MISSES,
  applyAction,
  bucketFor,
  initialState,
  isTerminal,
  tierFor,
  type State,
} from "../../../src/games/${n.id}/rules.js";

const puzzle = { number: 1, target: 4 };

function play(cells: readonly number[]): State {
  let state = initialState(puzzle);
  for (const cell of cells) {
    const next = applyAction(state, { kind: "tap", cell });
    if (!next.ok) throw new Error(next.error.code);
    state = next.value;
  }
  return state;
}

describe("${n.displayName} rules", () => {
  it("records a tap and ends the day on the target", () => {
    const state = play([0, 4]);
    expect(state.tapped).toEqual([0, 4]);
    expect(isTerminal(state)).toBe(true);
  });

  it("refuses a cell off the board, a repeated cell and any tap after the end", () => {
    const start = initialState(puzzle);
    expect(applyAction(start, { kind: "tap", cell: -1 })).toMatchObject({ ok: false, error: { code: "out-of-range" } });
    expect(applyAction(start, { kind: "tap", cell: GRID_SIZE })).toMatchObject({ ok: false, error: { code: "out-of-range" } });
    expect(applyAction(start, { kind: "tap", cell: 1.5 })).toMatchObject({ ok: false, error: { code: "out-of-range" } });
    expect(applyAction(play([0]), { kind: "tap", cell: 0 })).toMatchObject({ ok: false, error: { code: "already-tapped" } });
    expect(applyAction(play([4]), { kind: "tap", cell: 0 })).toMatchObject({ ok: false, error: { code: "game-over" } });
  });

  it("ends the day after the last allowed miss", () => {
    const misses = ${missCells(4, n.bucketCount - 1)};
    expect(misses).toHaveLength(MAX_MISSES);
    expect(isTerminal(play(misses.slice(0, -1)))).toBe(false);
    expect(isTerminal(play(misses))).toBe(true);
  });

  it("buckets and tiers by misses, with the last bucket and worst tier for a day not found", () => {
    expect([bucketFor(play([4])), tierFor(play([4]))]).toEqual([0, 0]);
    expect([bucketFor(play([0, 1, 4])), tierFor(play([0, 1, 4]))]).toEqual([2, 2]);
    const lost = play(${missCells(4, n.bucketCount - 1)});
    expect([bucketFor(lost), tierFor(lost)]).toEqual([MAX_MISSES, 4]);
  });

  it("never reaches a state with a repeated tap or more taps than a day allows", () => {
    for (let target = 0; target < GRID_SIZE; target += 1) {
      for (let first = 0; first < GRID_SIZE; first += 1) {
        let state = initialState({ number: 1, target });
        for (let step = 0; step < GRID_SIZE; step += 1) {
          const next = applyAction(state, { kind: "tap", cell: (first + step) % GRID_SIZE });
          if (next.ok) state = next.value;
        }
        expect(new Set(state.tapped).size).toBe(state.tapped.length);
        expect(state.tapped.length).toBeLessThanOrEqual(MAX_MISSES + 1);
        expect(isTerminal(state)).toBe(true);
      }
    }
  });
});
`;
}

function generatorTestFile(n: Names): string {
  return `import { describe, expect, it } from "vitest";

import { seedFor } from "../../../src/core/seed.js";
import { generatePuzzle } from "../../../src/games/${n.id}/generator.js";
import { GRID_SIZE } from "../../../src/games/${n.id}/rules.js";

describe("${n.displayName} generator", () => {
  it("produces the same puzzle for the same day", () => {
    for (let day = 1; day <= 30; day += 1) {
      const seed = seedFor("${n.id}", day);
      expect(generatePuzzle(day, seed)).toEqual(generatePuzzle(day, seed));
    }
  });

  it("puts every target on the board and numbers the puzzle by its day", () => {
    for (let day = 1; day <= 365; day += 1) {
      const puzzle = generatePuzzle(day, seedFor("${n.id}", day));
      expect(puzzle.number).toBe(day);
      expect(Number.isInteger(puzzle.target)).toBe(true);
      expect(puzzle.target).toBeGreaterThanOrEqual(0);
      expect(puzzle.target).toBeLessThan(GRID_SIZE);
    }
  });
});
`;
}

function moduleTestFile(n: Names): string {
  return `import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import { validateRunLog } from "../../../src/engine/telemetry.js";
import type { ShareContext } from "../../../src/core/types.js";
import { entryFor } from "../../../src/shell/registry.js";
import game, { internals } from "../../../src/games/${n.id}/module.js";
import { cellLabel } from "../../../src/games/${n.id}/render.js";
import { GRID_SIZE, applyAction, initialState, type Puzzle, type State } from "../../../src/games/${n.id}/rules.js";

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 7,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

function play(puzzle: Puzzle, cells: readonly number[]): State {
  let state = initialState(puzzle);
  for (const cell of cells) {
    const next = applyAction(state, { kind: "tap", cell });
    if (!next.ok) throw new Error(next.error.code);
    state = next.value;
  }
  return state;
}

function artifactOf(state: State, overrides: Partial<ShareContext> = {}) {
  return internals.shareArtifact(state.puzzle, state, internals.telemetry(state), context(overrides));
}

describe("${n.displayName} contract surface", () => {
  it("default exports a v3 module whose distribution fits its buckets", () => {
    expect(game.identity.id).toBe("${n.id}");
    expect(game.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(game.shareCapabilities.maxRows).toBeLessThanOrEqual(7);
    expect(game.distribution.labels.length).toBe(${String(n.bucketCount)});
  });

  it("agrees with its registry entry", () => {
    const entry = entryFor("${n.id}");
    expect(entry).not.toBeNull();
    expect(entry?.bucketCount).toBe(game.distribution.labels.length);
    expect(entry?.hasWinLoss).toBe(game.hasWinLoss);
    expect(entry?.stateVersion).toBe(game.stateVersion);
    expect(entry?.oneLineRule).toBe(game.identity.oneLineRule);
    expect(entry?.displayName).toBe(game.identity.displayName);
    expect(entry?.epoch).toEqual(game.identity.epoch);
    expect(entry?.accent).toEqual(game.identity.accent);
  });
});

describe("${n.displayName} manifest round trip", () => {
  it("parses an entry and refuses one it cannot trust", () => {
    expect(internals.parsePuzzle(12, { target: 5 })).toEqual({ ok: true, value: { number: 12, target: 5 } });
    expect(internals.parsePuzzle(12, null).ok).toBe(false);
    expect(internals.parsePuzzle(12, { target: GRID_SIZE }).ok).toBe(false);
    expect(internals.parsePuzzle(12, { target: "5" }).ok).toBe(false);
  });
});

describe("${n.displayName} state round trip", () => {
  const puzzle = { number: 12, target: 5 };

  it("restores every reachable state it serialized", () => {
    for (const cells of [[], [0], [0, 5], ${missCells(5, n.bucketCount - 1)}]) {
      const state = play(puzzle, cells);
      expect(internals.deserialize(puzzle, internals.serialize(state))).toEqual({ ok: true, value: state });
    }
  });

  it("refuses a foreign version, a malformed payload and taps no game could make", () => {
    expect(internals.deserialize(puzzle, { v: 2, data: { t: [] } }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: { t: "0" } }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: { t: [0, 0] } }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: { t: [5, 0] } }).ok).toBe(false);
    expect(game.migrateState(0, { v: 0, data: null }).ok).toBe(false);
  });
});

describe("${n.displayName} outcome and share", () => {
  const puzzle = { number: 7, target: 0 };

  it("grades a finished day with its bucket and difficulty", () => {
    expect(internals.inspect(play(puzzle, [1]))).toEqual({ kind: "ongoing" });
    expect(internals.inspect(play(puzzle, [1, 0]))).toEqual({
      kind: "finished",
      score: ${String(n.bucketCount - 2)},
      won: ${n.hasWinLoss ? "true" : "null"},
      detail: "Found after 1 misses",
      tier: 1,
      bucket: 1,
      difficulty: GRID_SIZE,
    });
  });

  it("shares one row per tap and names the outcome", () => {
    const artifact = artifactOf(play(puzzle, [1, 0]));
    expect(artifact.title).toBe("${n.displayName} #7 found in 2");
    expect(artifact.rows).toEqual([["miss"], ["best"]]);
    expect(artifactOf(play(puzzle, ${missCells(0, n.bucketCount - 1)})).title).toBe("${n.displayName} #7 not found");
    expect(artifactOf(play(puzzle, [0]), { currentStreak: 4 }).title).toBe("${n.displayName} #7 found in 1, streak 4");
  });

  it("validates, renders inside the grammar and ends with the URL", () => {
    for (const cells of [[0], [1, 0], ${missCells(0, n.bucketCount - 1)}]) {
      const state = play(puzzle, cells);
      expect(validateRunLog(internals.telemetry(state)).ok).toBe(true);
      const artifact = artifactOf(state);
      expect(validateArtifact(artifact, game.identity.shareUrl).ok).toBe(true);
      const lines = renderArtifact(artifact, game.identity.shareUrl).split("\\n");
      expect(lines.length).toBeLessThanOrEqual(9);
      expect(lines.at(-1)).toBe(game.identity.shareUrl);
    }
  });

  /* ARCHITECTURE2 section 16. The rows must be the same for every target, so a
     reader cannot learn the cell from where the best token sits. */
  it("leaks neither the target cell nor its position", () => {
    const samples: LeakSample[] = [];
    for (let target = 0; target < GRID_SIZE; target += 1) {
      const misses = [0, 1, 2, 3].filter((cell) => cell !== target).slice(0, 2);
      const state = play({ number: 7, target }, [...misses, target]);
      samples.push({ artifact: artifactOf(state), answerKey: cellLabel(target) });
    }
    expect(runShareLeakChecks(samples, {
      positionLeak: (sample) => JSON.stringify(sample.artifact.rows) !== JSON.stringify(samples[0]?.artifact.rows),
    })).toEqual({ ok: true, failures: [] });
  });

  it("gives two runs of different length different fingerprints", () => {
    expect(artifactOf(play(puzzle, [0])).fingerprint).not.toEqual(artifactOf(play(puzzle, [1, 0])).fingerprint);
  });
});
`;
}

function renderTestFile(n: Names): string {
  return `// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MountContext } from "../../../src/contract/types.js";
import { renderGridBoard } from "../../../src/games/${n.id}/render.js";
import {
  GRID_SIZE,
  applyAction,
  initialState,
  type Action,
  type Puzzle,
  type State,
} from "../../../src/games/${n.id}/rules.js";

const puzzle: Puzzle = { number: 3, target: 4 };
let hosts: HTMLElement[] = [];

/** The shell applies synchronously and calls update from inside dispatch, so
 *  this harness does too. */
function mount(readOnly = false) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  let current = initialState(puzzle);
  const context: MountContext<State, Action, Puzzle> = {
    puzzle,
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
  const view = renderGridBoard(host, context);
  const cells = [...host.querySelectorAll<HTMLButtonElement>("button")];
  return { host, cells, announce, view, state: () => current };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("${n.displayName} renderer", () => {
  it("renders one labelled, focusable button per cell", () => {
    const { cells } = mount();
    expect(cells).toHaveLength(GRID_SIZE);
    for (const [cell, button] of cells.entries()) {
      expect(button.type).toBe("button");
      expect(button.getAttribute("aria-label")).toBe(\`Cell \${String(cell + 1)}, open\`);
      button.focus();
      expect(document.activeElement).toBe(button);
    }
  });

  it("shows nothing about the target before it is found", () => {
    const { cells } = mount();
    const target = cells[puzzle.target] as HTMLButtonElement;
    const other = cells[0] as HTMLButtonElement;
    expect(target.outerHTML.replace("Cell 5", "Cell 1").replace('data-cell="4"', 'data-cell="0"')).toBe(other.outerHTML);
  });

  it("marks and announces each tap in text, not color alone, and ends the board on the find", () => {
    const { cells, announce, state } = mount();
    (cells[0] as HTMLButtonElement).click();
    expect(cells[0]?.textContent).toBe("X");
    expect(cells[0]?.getAttribute("aria-label")).toBe("Cell 1, miss");
    expect(announce).toHaveBeenLastCalledWith("Cell 1, miss");
    (cells[4] as HTMLButtonElement).click();
    expect(cells[4]?.textContent).toBe("O");
    expect(announce).toHaveBeenLastCalledWith("Cell 5, found");
    expect(state().tapped).toEqual([0, 4]);
    expect(cells.every((button) => button.disabled)).toBe(true);
  });

  it("dispatches nothing in a read only view and removes only its own board", () => {
    const { host, cells, view, state } = mount(true);
    (cells[0] as HTMLButtonElement).click();
    expect(state().tapped).toEqual([]);
    view.unmount();
    expect(host.children).toHaveLength(0);
  });
});
`;
}

export function buildNewGame(options: NewGameOptions, games: readonly AdoptableRow[] = SUITE_GAMES): NewGameOutput {
  const id = validateGameId(options.id, games);
  const row = adoptedRow(id, games);
  const n: Names = row === null ? namesForNewId(id, options) : namesFromRow(row, options);
  const gameDir = `src/games/${n.id}`;
  const testDir = `tests/games/${n.id}`;

  /* The four test paths are the ones newGamePlan in tools/certify.ts names as
     evidence. A test in new-game.test.ts holds the two lists together. */
  const files = new Map<string, string>([
    [`${gameDir}/rules.ts`, rulesFile(n)],
    [`${gameDir}/generator.ts`, generatorFile(n)],
    [`${gameDir}/module.ts`, moduleFile(n)],
    [`${gameDir}/render.ts`, renderFile(n)],
    [`${gameDir}/style.css`, styleFile(n)],
    [`${gameDir}/help.ts`, helpFile(n)],
    [`src/shell/entries/${n.id}.ts`, entryFile(n)],
    [`src/shell/entries/${n.id}.html`, htmlFile(n)],
    [`${testDir}/rules.test.ts`, rulesTestFile(n)],
    [`${testDir}/generator.test.ts`, generatorTestFile(n)],
    [`${testDir}/module.test.ts`, moduleTestFile(n)],
    [`${testDir}/render.test.ts`, renderTestFile(n)],
  ]);

  return {
    files,
    registryInsertion: row === null ? registryInsertion(n) : null,
    adopted: row !== null,
    targetsInsertion: targetsInsertion(n),
    plansInsertion: plansInsertion(n),
  };
}

/* The marker line already carries the two space indent of a sibling entry, so
   the insertion's own leading indent would double it on the opening line. */
export function insertAtMarker(source: string, marker: string, insertion: string): string {
  const at = source.indexOf(marker);
  if (at < 0 || source.indexOf(marker, at + marker.length) >= 0) {
    throw new Error(`expected exactly one ${marker}`);
  }
  return source.replace(marker, `${insertion.replace(/^ +/, "")}\n  ${marker}`);
}

interface ConfigFile {
  readonly path: string;
  readonly marker: string;
  /** Text that already present means the id is taken in this file. */
  readonly taken: string;
  readonly insertion: string;
}

/* An adopted row is already in the registry, so the registry is not patched. */
function configFiles(root: string, id: string, output: NewGameOutput): ConfigFile[] {
  const registry: ConfigFile[] =
    output.registryInsertion === null
      ? []
      : [{ path: resolve(root, "src/shell/registry.ts"), marker: REGISTRY_MARKER, taken: `id: "${id}"`, insertion: output.registryInsertion }];
  return [
    ...registry,
    { path: resolve(root, "vite.config.ts"), marker: TARGETS_MARKER, taken: `"${id}": {`, insertion: output.targetsInsertion },
    { path: resolve(root, "tools/certify.ts"), marker: GAME_PLANS_MARKER, taken: `"${id}": {`, insertion: output.plansInsertion },
  ];
}

export function main(argv: readonly string[]): void {
  const flags = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag !== undefined && value !== undefined) flags.set(flag, value);
  }
  const id = flags.get("--id");
  const name = flags.get("--name");
  const hue = flags.get("--hue");
  if (id === undefined) {
    throw new Error('usage: npm run new-game -- --id <kebab-case-id> [--name "<DISPLAY NAME>" --hue <0-359>], name and hue required unless the id has a planned registry row');
  }

  const output = buildNewGame({
    id,
    ...(name === undefined ? {} : { name }),
    ...(hue === undefined ? {} : { hue: Number.parseInt(hue, 10) }),
  });
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cleanId = id.trim();

  /* Every check runs before any write, so a refusal leaves the tree untouched. */
  const collisions = [...output.files.keys()].filter((path) => existsSync(resolve(root, path)));
  if (collisions.length > 0) {
    throw new Error(`refusing to overwrite existing game files: ${collisions.join(", ")}`);
  }
  const configs = configFiles(root, cleanId, output).map((config) => ({ ...config, source: readFileSync(config.path, "utf8") }));
  for (const config of configs) {
    if (!config.source.includes(config.marker)) throw new Error(`${config.marker} is missing from ${config.path}`);
    if (config.source.includes(config.taken)) throw new Error(`${cleanId} already exists in ${config.path}`);
  }
  const patched = configs.map((config) => ({ path: config.path, text: insertAtMarker(config.source, config.marker, config.insertion) }));

  for (const [path, contents] of output.files) {
    const target = resolve(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents, "utf8");
  }
  for (const { path, text } of patched) writeFileSync(path, text, "utf8");
  const adopted = output.adopted ? " from its planned registry row, which was left as it is" : "";
  process.stdout.write(`scaffolded ${cleanId}${adopted}; it ships only through data/${cleanId}/certification.json, see NEW_GAME.md\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/new-game.ts")) {
  main(process.argv.slice(2));
}
