/**
 * Layer 5. Suite level services shared by the hub and by every game shell.
 *
 * Requirement 7.3.3 wants namespaced but unified storage. That splits cleanly:
 * Layer 1 owns the two record shapes and their migrations, and this file owns
 * the fact that there are five of the first kind and one of the second. Neither
 * the engine nor a game ever learns how many games exist.
 */

import { localCivilDate } from "../core/date.js";
import { err, type Result } from "../core/result.js";
import type { SerializedState } from "../core/types.js";
import {
  GameStore,
  SuiteStore,
  detectBackend,
  emptySuiteRecord,
  type GameRecord,
  type MigratePayload,
  type PayloadFailure,
  type StorageBackend,
  type StoredResult,
  type SuiteRecord,
} from "../engine/storage.js";
import { resultFor } from "../engine/stats.js";
import { resolve, type Resolution } from "../engine/scheduler.js";
import {
  dailyCardBlock,
  dailyCardSummary,
  type DailyCardEntry,
  type DailyCardInput,
} from "../engine/dailycard.js";
import type { ThemeChoice as UiThemeChoice, ThemePort } from "../ui/theme.js";
import { SUITE_GAMES, type SuiteGameEntry } from "./registry.js";

/**
 * The hub never resumes a board, so it opens every game's record with a
 * migration that refuses. A refusal drops the in progress payload and keeps the
 * record, which is exactly the hub's need: it reads results and watermarks and
 * never deserializes a board.
 */
const REFUSE_MIGRATION: MigratePayload = (
  fromVersion: number,
): Result<SerializedState, PayloadFailure> =>
  err({ code: "unsupported-version", detail: `hub does not migrate v${fromVersion}` });

export function openGameStore(
  backend: StorageBackend,
  entry: SuiteGameEntry,
  migratePayload: MigratePayload = REFUSE_MIGRATION,
): GameStore {
  return new GameStore(backend, entry.id, entry.stateVersion, entry.bucketCount, migratePayload);
}

export interface SuiteHandle {
  readonly backend: StorageBackend;
  readonly store: SuiteStore;
  record: SuiteRecord;
  readonly recovered: boolean;
  readonly persistent: boolean;
  update(next: SuiteRecord): void;
}

export function openSuite(backend: StorageBackend = detectBackend()): SuiteHandle {
  const store = new SuiteStore(backend);
  const loaded = store.load();
  const handle: SuiteHandle = {
    backend,
    store,
    record: loaded.record,
    recovered: loaded.recovered,
    persistent: loaded.persistent,
    update(next: SuiteRecord): void {
      handle.record = next;
      store.save(next);
    },
  };
  return handle;
}

/**
 * Theme persistence for Layer 2, backed by the suite record rather than a key
 * of its own. Presentation decision 6 keeps the storage key name out of the
 * presentation kit, and requirement 7.3.3 puts theme at the suite level so a
 * choice made inside one game is already made in the next.
 *
 * The suite record's ThemeChoice admits "contrast", which the UI controller
 * does not, because contrast is a CSS layer rather than a fourth choice. A
 * stored "contrast" from a future build reads as null here and the controller
 * falls back to following the system.
 */
export function suiteThemePort(handle: SuiteHandle): ThemePort {
  return {
    read(): UiThemeChoice | null {
      const stored = handle.record.theme;
      return stored === "light" || stored === "dark" || stored === "system" ? stored : null;
    },
    write(choice: UiThemeChoice): void {
      handle.update({ ...handle.record, theme: choice });
    },
  };
}

// ---------------------------------------------------------------------------
// Today, per game
// ---------------------------------------------------------------------------

export type PlayState = "not-started" | "in-progress" | "finished" | "before-epoch" | "planned";

export interface GameStatus {
  readonly entry: SuiteGameEntry;
  readonly play: PlayState;
  /** Null for a planned game and before a game's epoch. */
  readonly puzzleNumber: number | null;
  readonly result: StoredResult | null;
  readonly currentStreak: number;
  readonly record: GameRecord | null;
  readonly resolution: Resolution | null;
}

/**
 * Read only. Opens the game's own key, resolves that game's puzzle number from
 * its own epoch, and reports what the player has done with it today. Nothing
 * here writes, so opening the hub can never advance a watermark or discard an
 * in progress board.
 */
export function statusFor(
  backend: StorageBackend,
  entry: SuiteGameEntry,
  now: Date,
): GameStatus {
  if (entry.status === "planned") {
    return {
      entry,
      play: "planned",
      puzzleNumber: null,
      result: null,
      currentStreak: 0,
      record: null,
      resolution: null,
    };
  }

  const record = openGameStore(backend, entry).load().record;
  const resolution = resolve(entry.epoch, record.watermark, now);
  if (resolution.kind === "before-epoch") {
    return {
      entry,
      play: "before-epoch",
      puzzleNumber: null,
      result: null,
      currentStreak: record.currentStreak,
      record,
      resolution,
    };
  }

  const puzzleNumber = resolution.puzzleNumber;
  const result = resultFor(record, puzzleNumber);
  const live = record.live;
  const inProgress =
    result === null && live !== null && live.puzzleNumber === puzzleNumber && live.state !== null;

  return {
    entry,
    play: result !== null ? "finished" : inProgress ? "in-progress" : "not-started",
    puzzleNumber,
    result,
    currentStreak: record.currentStreak,
    record,
    resolution,
  };
}

export function allStatuses(backend: StorageBackend, now: Date): readonly GameStatus[] {
  return SUITE_GAMES.map((entry) => statusFor(backend, entry, now));
}

// ---------------------------------------------------------------------------
// The daily card
// ---------------------------------------------------------------------------

/** ISO calendar date in local time, which is the day the player just played. */
export function localDateLabel(now: Date): string {
  const date = localCivilDate(now);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

export function dailyCardInput(
  statuses: readonly GameStatus[],
  suite: SuiteRecord,
  now: Date,
): DailyCardInput {
  const finished: DailyCardEntry[] = [];
  for (const status of statuses) {
    if (status.play !== "finished" || status.result === null) continue;
    finished.push({ gameId: status.entry.displayName, tier: status.result.tier });
  }
  return {
    date: localDateLabel(now),
    finished,
    totalGames: statuses.length,
    suiteStreak: suite.currentStreak,
  };
}

export { dailyCardBlock, dailyCardSummary, emptySuiteRecord };
