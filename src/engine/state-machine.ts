/**
 * Layer 1. Requirement 3.2 and 4.1.4.
 *
 * `WON` and `LOST` do not exist. The terminal state is `COMPLETE` and it
 * carries the module's outcome, whose `won` field is true, false, or null.
 * Encoding the same fact as both a state name and an outcome field gives two
 * representations with nothing keeping them agreed, and requirement 7.1.3
 * guarantees the suite contains continuum scored games for which a `LOST` state
 * is permanently unreachable. Resolution 11 and POKER-GRID.md 14.3 are settled
 * here.
 *
 * The machine is generic over the module's board state so the shell never names
 * a concrete game type. It stores the board and nothing else about it.
 */

import type { PuzzleNumber } from "../core/types.js";
import { NO_OP_TELEMETRY, type Telemetry } from "./telemetry.js";

export type LifecycleState =
  | "LOADING"
  | "TUTORIAL"
  | "PLAYING"
  | "PAUSED"
  | "COMPLETE"
  | "WAITING_FOR_NEXT"
  | "ARCHIVED_VIEW";

/**
 * Events, not state assignments. The shell describes what happened and the
 * table decides where that lands, which is what makes an illegal transition
 * detectable at all.
 */
export type LifecycleEvent =
  /** Load resolved a live puzzle with no stored board. */
  | "LOADED_NEW"
  /** Load resolved a live puzzle with a board in progress. */
  | "LOADED_RESUME"
  /** Load resolved a live puzzle already finished today. */
  | "LOADED_FINISHED"
  /** Load resolved a first ever visit and the module supplies a tutorial. */
  | "LOADED_TUTORIAL"
  /** Load resolved a puzzle strictly below the watermark. */
  | "LOADED_ARCHIVE"
  | "TUTORIAL_DONE"
  /** Tab hidden and shown. Requirement 3.2. */
  | "HIDDEN"
  | "SHOWN"
  /** The module's inspect reported a finished outcome. */
  | "FINISHED"
  /** Player dismissed the end screen. */
  | "DISMISS_RESULT"
  | "OPEN_ARCHIVE"
  | "EXIT_ARCHIVE"
  /** Local midnight passed with the tab open. Legal from everywhere. */
  | "ROLLOVER";

/**
 * PAUSED is reachable from PLAYING only. No other state runs a timer or an
 * animation, so pausing them would be a state with no behavior attached, and a
 * state that does nothing is a state someone will later transition into by
 * mistake.
 */
const TRANSITIONS: Readonly<
  Record<LifecycleState, Readonly<Partial<Record<LifecycleEvent, LifecycleState>>>>
> = {
  LOADING: {
    LOADED_NEW: "PLAYING",
    LOADED_RESUME: "PLAYING",
    LOADED_FINISHED: "COMPLETE",
    LOADED_TUTORIAL: "TUTORIAL",
    LOADED_ARCHIVE: "ARCHIVED_VIEW",
  },
  TUTORIAL: {
    TUTORIAL_DONE: "PLAYING",
  },
  PLAYING: {
    HIDDEN: "PAUSED",
    FINISHED: "COMPLETE",
  },
  PAUSED: {
    SHOWN: "PLAYING",
  },
  COMPLETE: {
    DISMISS_RESULT: "WAITING_FOR_NEXT",
    OPEN_ARCHIVE: "ARCHIVED_VIEW",
  },
  WAITING_FOR_NEXT: {
    OPEN_ARCHIVE: "ARCHIVED_VIEW",
  },
  ARCHIVED_VIEW: {
    /* Finishing an archived board does not enter COMPLETE. The end screen for a
       replay is rendered inside the archive view, because entering COMPLETE
       would put a replay one DISMISS_RESULT away from the live countdown. */
    EXIT_ARCHIVE: "LOADING",
  },
};

/** Legal from every state, so a rollover can never be refused. */
const ROLLOVER_TARGET: LifecycleState = "LOADING";

export type SessionMode = "live" | "archive";

export interface SessionContext<TBoard> {
  readonly state: LifecycleState;
  readonly mode: SessionMode;
  readonly puzzleNumber: PuzzleNumber;
  readonly board: TBoard | null;
  /** True in ARCHIVED_VIEW. Passed to the module's MountContext so a renderer
   *  can suppress result reveal chrome. */
  readonly readOnly: boolean;
}

export type SessionListener<TBoard> = (context: SessionContext<TBoard>) => void;

export interface MachineOptions {
  /**
   * Throw on an illegal transition instead of recovering. The shell passes
   * `import.meta.env.DEV`, which keeps the build global out of Layer 1.
   */
  readonly strict?: boolean;
  readonly telemetry?: Telemetry;
}

export class SessionMachine<TBoard> {
  private state: LifecycleState = "LOADING";

  private mode: SessionMode = "live";

  private puzzleNumber: PuzzleNumber = 0;

  private board: TBoard | null = null;

  private readonly listeners = new Set<SessionListener<TBoard>>();

  private readonly strict: boolean;

  private readonly telemetry: Telemetry;

  constructor(options: MachineOptions = {}) {
    this.strict = options.strict ?? false;
    this.telemetry = options.telemetry ?? NO_OP_TELEMETRY;
  }

  get context(): SessionContext<TBoard> {
    return {
      state: this.state,
      mode: this.mode,
      puzzleNumber: this.puzzleNumber,
      board: this.board,
      readOnly: this.state === "ARCHIVED_VIEW",
    };
  }

  subscribe(listener: SessionListener<TBoard>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set before dispatching the matching LOADED_ event, so a listener never sees
   * a PLAYING context still holding the previous day's number.
   */
  beginSession(puzzleNumber: PuzzleNumber, mode: SessionMode, board: TBoard | null): void {
    this.puzzleNumber = puzzleNumber;
    this.mode = mode;
    this.board = board;
  }

  /** Every accepted player action lands here. Does not change lifecycle state. */
  setBoard(board: TBoard): void {
    this.board = board;
    this.emit();
  }

  /**
   * Returns true when the machine moved. An illegal transition throws under
   * strict and otherwise stays put, reports a fault, and returns false, so a
   * production defect degrades to an ignored input rather than a blank screen.
   */
  send(event: LifecycleEvent): boolean {
    if (event === "ROLLOVER") {
      this.state = ROLLOVER_TARGET;
      this.board = null;
      this.emit();
      return true;
    }

    const target = TRANSITIONS[this.state][event];
    if (target === undefined) {
      const message = `illegal transition ${event} from ${this.state}`;
      if (this.strict) throw new Error(message);
      this.telemetry.fault(message, { state: this.state, event });
      return false;
    }

    this.state = target;
    if (target === "LOADING") this.board = null;
    this.emit();
    return true;
  }

  /** Test and shell introspection. Never used to decide a transition. */
  can(event: LifecycleEvent): boolean {
    return event === "ROLLOVER" || TRANSITIONS[this.state][event] !== undefined;
  }

  private emit(): void {
    const snapshot = this.context;
    for (const listener of this.listeners) listener(snapshot);
  }
}

export const LIFECYCLE_STATES: readonly LifecycleState[] = Object.keys(
  TRANSITIONS,
) as LifecycleState[];

/** Exposed for the transition table test, which asserts the table names only
 *  real states and that every state is reachable. */
export function transitionTable(): Readonly<
  Record<LifecycleState, Readonly<Partial<Record<LifecycleEvent, LifecycleState>>>>
> {
  return TRANSITIONS;
}
