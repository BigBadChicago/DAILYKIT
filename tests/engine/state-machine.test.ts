import { describe, expect, it, vi } from "vitest";
import {
  LIFECYCLE_STATES,
  SessionMachine,
  transitionTable,
  type LifecycleEvent,
  type LifecycleState,
} from "../../src/engine/state-machine.js";

function machine(strict = true): SessionMachine<string> {
  return new SessionMachine<string>({ strict });
}

describe("transition table", () => {
  it("names only real states as targets", () => {
    const table = transitionTable();
    for (const targets of Object.values(table)) {
      for (const target of Object.values(targets)) {
        expect(LIFECYCLE_STATES).toContain(target as LifecycleState);
      }
    }
  });

  it("makes every state reachable, counting ROLLOVER for LOADING", () => {
    const table = transitionTable();
    const reachable = new Set<LifecycleState>(["LOADING"]);
    for (const targets of Object.values(table)) {
      for (const target of Object.values(targets)) reachable.add(target as LifecycleState);
    }
    for (const state of LIFECYCLE_STATES) expect(reachable.has(state)).toBe(true);
  });

  it("declares no state named WON or LOST", () => {
    expect(LIFECYCLE_STATES).not.toContain("WON" as LifecycleState);
    expect(LIFECYCLE_STATES).not.toContain("LOST" as LifecycleState);
  });
});

describe("legal paths", () => {
  it("walks a first ever visit through the tutorial to a finished day", () => {
    const m = machine();
    expect(m.context.state).toBe("LOADING");
    m.beginSession(1, "live", null);
    m.send("LOADED_TUTORIAL");
    expect(m.context.state).toBe("TUTORIAL");
    m.send("TUTORIAL_DONE");
    /* The tutorial board is not a day, so finishing it returns to LOADING and
       today is fetched from there. */
    expect(m.context.state).toBe("LOADING");
    m.send("LOADED_NEW");
    expect(m.context.state).toBe("PLAYING");
    m.send("FINISHED");
    expect(m.context.state).toBe("COMPLETE");
    m.send("DISMISS_RESULT");
    expect(m.context.state).toBe("WAITING_FOR_NEXT");
  });

  it("resumes an in progress board straight into play", () => {
    const m = machine();
    m.beginSession(250, "live", "half played");
    m.send("LOADED_RESUME");
    expect(m.context.state).toBe("PLAYING");
    expect(m.context.board).toBe("half played");
  });

  it("reopens a day already finished directly in COMPLETE", () => {
    const m = machine();
    m.beginSession(250, "live", "done");
    m.send("LOADED_FINISHED");
    expect(m.context.state).toBe("COMPLETE");
  });

  it("pauses and resumes on tab visibility", () => {
    const m = machine();
    m.beginSession(250, "live", null);
    m.send("LOADED_NEW");
    m.send("HIDDEN");
    expect(m.context.state).toBe("PAUSED");
    m.send("SHOWN");
    expect(m.context.state).toBe("PLAYING");
  });

  it("enters and leaves the archive from both post game states", () => {
    const paths: LifecycleEvent[][] = [["DISMISS_RESULT", "OPEN_ARCHIVE"], ["OPEN_ARCHIVE"]];
    for (const path of paths) {
      const m = machine();
      m.beginSession(250, "live", null);
      m.send("LOADED_FINISHED");
      for (const event of path) m.send(event);
      expect(m.context.state).toBe("ARCHIVED_VIEW");
      m.send("EXIT_ARCHIVE");
      expect(m.context.state).toBe("LOADING");
    }
  });
});

describe("archive semantics", () => {
  it("marks the context read only in ARCHIVED_VIEW and nowhere else", () => {
    const m = machine();
    m.beginSession(12, "archive", null);
    m.send("LOADED_ARCHIVE");
    expect(m.context.readOnly).toBe(true);
    expect(m.context.mode).toBe("archive");

    m.send("EXIT_ARCHIVE");
    m.beginSession(250, "live", null);
    m.send("LOADED_NEW");
    expect(m.context.readOnly).toBe(false);
  });

  it("does not let a finished replay reach COMPLETE", () => {
    const m = machine(false);
    m.beginSession(12, "archive", null);
    m.send("LOADED_ARCHIVE");
    expect(m.send("FINISHED")).toBe(false);
    expect(m.context.state).toBe("ARCHIVED_VIEW");
  });
});

describe("rollover", () => {
  it("is legal from every state and clears the board", () => {
    const starts: [LifecycleEvent[], LifecycleState][] = [
      [["LOADED_NEW"], "PLAYING"],
      [["LOADED_NEW", "HIDDEN"], "PAUSED"],
      [["LOADED_FINISHED"], "COMPLETE"],
      [["LOADED_FINISHED", "DISMISS_RESULT"], "WAITING_FOR_NEXT"],
      [["LOADED_ARCHIVE"], "ARCHIVED_VIEW"],
      [["LOADED_TUTORIAL"], "TUTORIAL"],
    ];
    for (const [events, expected] of starts) {
      const m = machine();
      m.beginSession(250, "live", "board");
      for (const event of events) m.send(event);
      expect(m.context.state).toBe(expected);
      expect(m.send("ROLLOVER")).toBe(true);
      expect(m.context.state).toBe("LOADING");
      expect(m.context.board).toBeNull();
    }
  });
});

describe("illegal transitions", () => {
  it("throws under strict", () => {
    const m = machine(true);
    expect(() => m.send("FINISHED")).toThrow(/illegal transition FINISHED from LOADING/);
  });

  it("stays put, reports a fault, and returns false in production", () => {
    const fault = vi.fn();
    const m = new SessionMachine<string>({ strict: false, telemetry: { track: vi.fn(), fault } });
    expect(m.send("FINISHED")).toBe(false);
    expect(m.context.state).toBe("LOADING");
    expect(fault).toHaveBeenCalledOnce();
  });

  it("refuses to pause anything other than play", () => {
    const m = machine(false);
    m.beginSession(250, "live", null);
    m.send("LOADED_FINISHED");
    expect(m.send("HIDDEN")).toBe(false);
    expect(m.context.state).toBe("COMPLETE");
  });
});

describe("board and listeners", () => {
  it("notifies on a board change without moving state", () => {
    const m = machine();
    m.beginSession(250, "live", null);
    m.send("LOADED_NEW");

    const seen: string[] = [];
    m.subscribe((context) => seen.push(`${context.state}:${String(context.board)}`));
    m.setBoard("one");
    m.setBoard("two");
    expect(seen).toEqual(["PLAYING:one", "PLAYING:two"]);
    expect(m.context.state).toBe("PLAYING");
  });

  it("stops notifying after unsubscribe", () => {
    const m = machine();
    const listener = vi.fn();
    const off = m.subscribe(listener);
    m.beginSession(1, "live", null);
    m.send("LOADED_NEW");
    off();
    m.send("FINISHED");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("carries the puzzle number set before the load event", () => {
    const m = machine();
    const seen: number[] = [];
    m.subscribe((context) => {
      if (context.state === "PLAYING") seen.push(context.puzzleNumber);
    });
    m.beginSession(250, "live", null);
    m.send("LOADED_NEW");
    expect(seen).toEqual([250]);
  });
});

describe("can", () => {
  it("agrees with send", () => {
    const m = machine(false);
    expect(m.can("LOADED_NEW")).toBe(true);
    expect(m.can("FINISHED")).toBe(false);
    expect(m.can("ROLLOVER")).toBe(true);
  });
});
