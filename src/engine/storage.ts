/**
 * Layer 1. Requirement 3.3 and 7.3.3.
 *
 * Two version integers, never one. `ev` is the engine's envelope version and
 * `gv` is the module's payload version. The engine migrates the envelope for
 * every game identically and never opens `data`; the module migrates `data` and
 * never sees the envelope. That split is what makes 7.3.3 true: a defect in one
 * game's migration cannot reach another game's key, because no engine code path
 * ever parsed the other game's payload.
 *
 * Every read failure converges on one outcome, a fresh record with
 * `recovered: true`. There are five distinct ways a read can fail and handling
 * them as five paths means five chances to throw during boot, which is
 * unrecoverable because there is no UI yet in which to show the error.
 */

import type { PuzzleNumber, SerializedState } from "../core/types.js";
import { isErr, type Result } from "../core/result.js";
import { TIER_COUNT, type TierIndex } from "./tiers.js";

export const ENVELOPE_VERSION = 1;

export const KEY_PREFIX = "dailykit";

/** Resolution 6. Both lists are capped; lifetime aggregates are counters held
 *  outside them so eviction can never change a displayed total. */
export const HISTORY_CAP = 400;

export function gameKey(gameId: string): string {
  return `${KEY_PREFIX}:${gameId}`;
}

export const SUITE_KEY = `${KEY_PREFIX}:suite`;

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

/**
 * The narrow slice of localStorage this project uses. Narrow so the memory
 * fallback is four lines and so a test never needs a DOM.
 */
export interface StorageBackend {
  readonly persistent: boolean;
  read(key: string): string | null;
  /** False means the write did not land, which today means quota exceeded. */
  write(key: string, value: string): boolean;
  remove(key: string): void;
}

export function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    persistent: false,
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function createWebBackend(store: Storage): StorageBackend {
  return {
    persistent: true,
    read(key) {
      try {
        return store.getItem(key);
      } catch {
        /* Safari can throw on read in some locked down configurations. */
        return null;
      }
    },
    write(key, value) {
      try {
        store.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        store.removeItem(key);
      } catch {
        /* Nothing useful to do; the caller already treats storage as lossy. */
      }
    },
  };
}

/**
 * Probes with a real write, because iOS Safari private browsing exposes a
 * localStorage object whose setItem throws. Presence of the object proves
 * nothing.
 */
export function detectBackend(candidate?: Storage | null): StorageBackend {
  const store =
    candidate === undefined
      ? typeof localStorage === "undefined"
        ? null
        : localStorage
      : candidate;
  if (store === null) return createMemoryBackend();

  const probeKey = `${KEY_PREFIX}:probe`;
  try {
    store.setItem(probeKey, "1");
    store.removeItem(probeKey);
  } catch {
    return createMemoryBackend();
  }
  return createWebBackend(store);
}

// ---------------------------------------------------------------------------
// Record shapes
// ---------------------------------------------------------------------------

/** A finished live puzzle, as the engine stores it. `tier` is null past the
 *  manifest horizon, where no stored optimum exists. */
export interface StoredResult {
  readonly score: number;
  /** Null when the module sets hasWinLoss false. */
  readonly won: boolean | null;
  readonly bucket: number;
  readonly detail: string;
  readonly tier: TierIndex | null;
}

export interface HistoryEntry {
  readonly puzzleNumber: PuzzleNumber;
  readonly result: StoredResult;
}

/** The day currently loaded. Holds in progress board state, the result once
 *  finished, or both while the end screen is open. Requirement 3.3.3. */
export interface LiveSession {
  readonly puzzleNumber: PuzzleNumber;
  readonly state: SerializedState | null;
  readonly result: StoredResult | null;
}

export interface GameRecord {
  /** Highest puzzle number ever resolved. Requirement 3.1.3. */
  readonly watermark: PuzzleNumber;
  /** 0 means nothing has ever been completed. */
  readonly lastCompletedPuzzle: PuzzleNumber;
  readonly currentStreak: number;
  readonly maxStreak: number;
  readonly played: number;
  readonly won: number;
  /** Lifetime counts indexed by the module's bucketOf. Requirement 3.4. */
  readonly distribution: readonly number[];
  readonly live: LiveSession | null;
  /** Completed live puzzles, oldest first, capped. */
  readonly history: readonly HistoryEntry[];
  /** Replays of past puzzles. Requirement 3.6.1 keeps these out of every
   *  aggregate above, so they live in their own list. */
  readonly archive: readonly HistoryEntry[];
  readonly tutorialSeen: boolean;
  readonly lastSeenVersion: number;
}

export function emptyGameRecord(bucketCount: number): GameRecord {
  return {
    watermark: 0,
    lastCompletedPuzzle: 0,
    currentStreak: 0,
    maxStreak: 0,
    played: 0,
    won: 0,
    distribution: new Array<number>(bucketCount).fill(0),
    live: null,
    history: [],
    archive: [],
    tutorialSeen: false,
    lastSeenVersion: 0,
  };
}

export type ThemeChoice = "system" | "light" | "dark" | "contrast";

/**
 * Requirement 7.3.3 and 7.3.4. Days here are absolute day numbers from
 * core/date.ts, not per game puzzle numbers, so a game launching later inherits
 * no fake suite history. Resolution 4.
 */
export interface SuiteRecord {
  readonly theme: ThemeChoice;
  readonly lastCompletedDay: number;
  readonly currentStreak: number;
  readonly maxStreak: number;
  /** Game id to the last absolute day it was completed. Drives the least
   *  recently played choice in requirement 7.3.7. */
  readonly lastPlayed: Readonly<Record<string, number>>;
}

export function emptySuiteRecord(): SuiteRecord {
  return { theme: "system", lastCompletedDay: 0, currentStreak: 0, maxStreak: 0, lastPlayed: {} };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Structural. contract/types.ts StateFailure satisfies this, which is how the
 *  module's migrateState is accepted without the engine importing Layer 3. */
export interface PayloadFailure {
  readonly code: string;
  readonly detail: string;
}

export type MigratePayload = (
  fromVersion: number,
  raw: SerializedState,
) => Result<SerializedState, PayloadFailure>;

interface Envelope {
  readonly ev: number;
  readonly gv: number;
  readonly data: unknown;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEnvelope(text: string): Envelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecordObject(parsed)) return null;
  if (!Number.isInteger(parsed["ev"]) || !Number.isInteger(parsed["gv"])) return null;
  return { ev: parsed["ev"] as number, gv: parsed["gv"] as number, data: parsed["data"] };
}

/**
 * Envelope migration. At version 1 there is nothing to migrate, and the switch
 * exists so that adding version 2 is a compile time obligation rather than a
 * remembered chore. An envelope from the future is rejected, not guessed at: a
 * player who used a newer deploy and then hit a cached older one loses the day
 * rather than having a shape reinterpreted wrongly.
 */
function migrateEnvelope(ev: number, data: unknown): unknown | null {
  switch (ev) {
    case 1:
      return data;
    default:
      return null;
  }
}

function isSerializedState(value: unknown): value is SerializedState {
  return isRecordObject(value) && Number.isInteger(value["v"]) && "data" in value;
}

function isStoredResult(value: unknown): value is StoredResult {
  if (!isRecordObject(value)) return false;
  if (typeof value["score"] !== "number" || !Number.isFinite(value["score"])) return false;
  if (!(value["won"] === null || typeof value["won"] === "boolean")) return false;
  if (!Number.isInteger(value["bucket"]) || (value["bucket"] as number) < 0) return false;
  if (typeof value["detail"] !== "string") return false;
  const tier = value["tier"];
  if (!(tier === null || (Number.isInteger(tier) && (tier as number) >= 0 && (tier as number) < TIER_COUNT))) {
    return false;
  }
  return true;
}

function parseHistory(value: unknown): HistoryEntry[] | null {
  if (!Array.isArray(value)) return null;
  const out: HistoryEntry[] = [];
  for (const entry of value) {
    if (!isRecordObject(entry)) return null;
    if (!Number.isInteger(entry["puzzleNumber"])) return null;
    if (!isStoredResult(entry["result"])) return null;
    out.push({ puzzleNumber: entry["puzzleNumber"] as number, result: entry["result"] });
  }
  return out;
}

/**
 * Total validation, not a cast. A partially valid record is treated as invalid
 * rather than repaired field by field, because a repair path is a second
 * representation of the schema that will drift from this one.
 */
function parseGameRecord(value: unknown, bucketCount: number): GameRecord | null {
  if (!isRecordObject(value)) return null;

  const ints = [
    "watermark",
    "lastCompletedPuzzle",
    "currentStreak",
    "maxStreak",
    "played",
    "won",
    "lastSeenVersion",
  ] as const;
  for (const field of ints) {
    if (!Number.isInteger(value[field]) || (value[field] as number) < 0) return null;
  }
  if (typeof value["tutorialSeen"] !== "boolean") return null;

  if (!Array.isArray(value["distribution"])) return null;
  const distribution: number[] = [];
  for (const count of value["distribution"] as unknown[]) {
    if (!Number.isInteger(count) || (count as number) < 0) return null;
    distribution.push(count as number);
  }
  /* A module that changed its bucket count is a game side migration concern,
     but the engine still must not render a mismatched histogram. Resize by
     padding, never by truncating a nonzero tail. */
  if (distribution.length > bucketCount && distribution.slice(bucketCount).some((n) => n > 0)) {
    return null;
  }
  while (distribution.length < bucketCount) distribution.push(0);
  distribution.length = bucketCount;

  const history = parseHistory(value["history"]);
  const archive = parseHistory(value["archive"]);
  if (history === null || archive === null) return null;

  let live: LiveSession | null = null;
  const rawLive = value["live"];
  if (rawLive !== null && rawLive !== undefined) {
    if (!isRecordObject(rawLive)) return null;
    if (!Number.isInteger(rawLive["puzzleNumber"])) return null;
    const state = rawLive["state"];
    if (!(state === null || isSerializedState(state))) return null;
    const result = rawLive["result"];
    if (!(result === null || isStoredResult(result))) return null;
    live = {
      puzzleNumber: rawLive["puzzleNumber"] as number,
      state: state === null ? null : (state as SerializedState),
      result: result === null ? null : (result as StoredResult),
    };
  }

  return {
    watermark: value["watermark"] as number,
    lastCompletedPuzzle: value["lastCompletedPuzzle"] as number,
    currentStreak: value["currentStreak"] as number,
    maxStreak: value["maxStreak"] as number,
    played: value["played"] as number,
    won: value["won"] as number,
    distribution,
    live,
    history,
    archive,
    tutorialSeen: value["tutorialSeen"] as boolean,
    lastSeenVersion: value["lastSeenVersion"] as number,
  };
}

function parseSuiteRecord(value: unknown): SuiteRecord | null {
  if (!isRecordObject(value)) return null;
  const themes: readonly string[] = ["system", "light", "dark", "contrast"];
  if (typeof value["theme"] !== "string" || !themes.includes(value["theme"] as string)) return null;
  for (const field of ["lastCompletedDay", "currentStreak", "maxStreak"] as const) {
    if (!Number.isInteger(value[field]) || (value[field] as number) < 0) return null;
  }
  if (!isRecordObject(value["lastPlayed"])) return null;
  const lastPlayed: Record<string, number> = {};
  for (const [id, day] of Object.entries(value["lastPlayed"] as Record<string, unknown>)) {
    if (!Number.isInteger(day)) return null;
    lastPlayed[id] = day as number;
  }
  return {
    theme: value["theme"] as ThemeChoice,
    lastCompletedDay: value["lastCompletedDay"] as number,
    currentStreak: value["currentStreak"] as number,
    maxStreak: value["maxStreak"] as number,
    lastPlayed,
  };
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export interface LoadOutcome<T> {
  readonly record: T;
  /** True when stored data was absent, unreadable, or rejected. The shell shows
   *  one line and moves on. Requirement 8.3. */
  readonly recovered: boolean;
  readonly persistent: boolean;
}

export type SaveOutcome = "written" | "unchanged" | "not-persistent";

/**
 * Holds the backend, the key, and the last written string.
 *
 * The dirty check exists because requirement 3.3.4 demands a save on every
 * state mutation, and in POKER GRID an `add` action fires on every cell crossed
 * during a drag. Comparing the serialized string costs one comparison and
 * removes the redundant writes without weakening the guarantee, since a genuine
 * change always differs.
 */
export class GameStore {
  private backend: StorageBackend;

  private readonly key: string;

  private lastWritten: string | null = null;

  constructor(
    backend: StorageBackend,
    private readonly gameId: string,
    private readonly payloadVersion: number,
    private readonly bucketCount: number,
    private readonly migratePayload: MigratePayload,
  ) {
    this.backend = backend;
    this.key = gameKey(gameId);
  }

  get persistent(): boolean {
    return this.backend.persistent;
  }

  load(): LoadOutcome<GameRecord> {
    const fresh = (): LoadOutcome<GameRecord> => ({
      record: emptyGameRecord(this.bucketCount),
      recovered: true,
      persistent: this.backend.persistent,
    });

    const text = this.backend.read(this.key);
    if (text === null) {
      /* Absent is the first ever visit, which is not a recovery. */
      return {
        record: emptyGameRecord(this.bucketCount),
        recovered: false,
        persistent: this.backend.persistent,
      };
    }

    const envelope = readEnvelope(text);
    if (envelope === null) return fresh();

    const migrated = migrateEnvelope(envelope.ev, envelope.data);
    if (migrated === null) return fresh();

    const record = parseGameRecord(migrated, this.bucketCount);
    if (record === null) return fresh();

    if (envelope.gv === this.payloadVersion) {
      return { record, recovered: false, persistent: this.backend.persistent };
    }
    if (envelope.gv > this.payloadVersion) return fresh();

    const upgraded = this.upgradePayloads(record, envelope.gv);
    if (upgraded === null) return fresh();
    return { record: upgraded, recovered: false, persistent: this.backend.persistent };
  }

  /**
   * Only the live in progress payload is migrated. History and archive entries
   * hold engine owned results, never game payloads, which is why requirement
   * 3.3.2's "must not lose their streak" holds even when a module's migration
   * gives up: the worst case is losing one unfinished board.
   */
  private upgradePayloads(record: GameRecord, fromVersion: number): GameRecord | null {
    if (record.live === null || record.live.state === null) return record;
    const result: Result<SerializedState, PayloadFailure> = this.migratePayload(
      fromVersion,
      record.live.state,
    );
    if (isErr(result)) return { ...record, live: { ...record.live, state: null } };
    return { ...record, live: { ...record.live, state: result.value } };
  }

  save(record: GameRecord): SaveOutcome {
    const text = JSON.stringify({ ev: ENVELOPE_VERSION, gv: this.payloadVersion, data: record });
    if (text === this.lastWritten) return "unchanged";

    if (!this.backend.write(this.key, text)) {
      /* Quota exceeded. Downgrade the whole session rather than retrying, so
         every later write takes one predictable path and the banner shown to
         the player stays true for the rest of the session. */
      this.backend = createMemoryBackend();
      this.backend.write(this.key, text);
      this.lastWritten = text;
      return "not-persistent";
    }

    this.lastWritten = text;
    return this.backend.persistent ? "written" : "not-persistent";
  }

  /** Requirement 8.3. Used only by an explicit player action in the settings
   *  panel, never by a recovery path. */
  clear(): void {
    this.backend.remove(this.key);
    this.lastWritten = null;
  }

  describe(): string {
    return `${this.gameId} at ${this.key}`;
  }
}

export class SuiteStore {
  private backend: StorageBackend;

  private lastWritten: string | null = null;

  constructor(backend: StorageBackend) {
    this.backend = backend;
  }

  get persistent(): boolean {
    return this.backend.persistent;
  }

  load(): LoadOutcome<SuiteRecord> {
    const text = this.backend.read(SUITE_KEY);
    if (text === null) {
      return { record: emptySuiteRecord(), recovered: false, persistent: this.backend.persistent };
    }
    const envelope = readEnvelope(text);
    const migrated = envelope === null ? null : migrateEnvelope(envelope.ev, envelope.data);
    const record = migrated === null ? null : parseSuiteRecord(migrated);
    if (record === null) {
      return { record: emptySuiteRecord(), recovered: true, persistent: this.backend.persistent };
    }
    return { record, recovered: false, persistent: this.backend.persistent };
  }

  save(record: SuiteRecord): SaveOutcome {
    /* gv is 0 for the suite key: the suite record has no game payload inside
       it, and a nonzero value here would imply one. */
    const text = JSON.stringify({ ev: ENVELOPE_VERSION, gv: 0, data: record });
    if (text === this.lastWritten) return "unchanged";
    if (!this.backend.write(SUITE_KEY, text)) {
      this.backend = createMemoryBackend();
      this.backend.write(SUITE_KEY, text);
      this.lastWritten = text;
      return "not-persistent";
    }
    this.lastWritten = text;
    return this.backend.persistent ? "written" : "not-persistent";
  }
}
