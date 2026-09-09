import { describe, expect, it } from "vitest";
import { ok } from "../../src/core/result.js";
import type { AnyGameModule } from "../../src/contract/game-module.js";
import { PuzzleSource } from "../../src/shell/boot.js";

/** Only the fields PuzzleSource reads. The rest of the contract is irrelevant
 *  here and stubbing it would be noise. */
function moduleStub(overrides: Partial<AnyGameModule> = {}): AnyGameModule {
  return {
    identity: { id: "stub" },
    manifest: {
      urlForChunk: () => "/data/stub/chunk.json",
      indexUrl: "/data/stub/index.json",
      lookaheadDays: 7,
    },
    parsePuzzle: (_number: number, raw: unknown) => ok(raw),
    generatePuzzle: (number: number) => ok({ generated: number }),
    ...overrides,
  } as unknown as AnyGameModule;
}

const index = { horizon: 10, chunks: [{ from: 1, to: 10, url: "/data/stub/chunk.json" }] };

function sourceOf(chunk: unknown, module = moduleStub()): PuzzleSource {
  return new PuzzleSource(module, async (url) => (url === index.chunks[0]!.url ? chunk : index));
}

describe("PuzzleSource chunk format", () => {
  it("reads an entry by puzzle number", async () => {
    const source = sourceOf({ entries: { "3": { day: 3 } } });
    const load = await source.load(3);
    expect(load).toEqual({ kind: "ok", puzzle: { day: 3 }, rated: true });
  });

  /* Phase 11 correction, defect 7. A missing day and an unreadable chunk are
     different faults and the message must not confuse them, because the old
     one reported missing content whenever the format was wrong. */
  it("says a day is unpublished when the chunk simply lacks it", async () => {
    const load = await sourceOf({ entries: { "4": { day: 4 } } }).load(3);
    expect(load).toEqual({ kind: "unavailable", detail: "No puzzle is published for day 3." });
  });

  it("says the format is unexpected when the chunk has no entries at all", async () => {
    for (const chunk of [{ boards: [{ number: 3 }] }, { entries: [] }, "chunk", null]) {
      const load = await sourceOf(chunk).load(3);
      expect(load).toEqual({ kind: "unavailable", detail: "The puzzle list is in an unexpected format." });
    }
  });

  it("generates past the horizon and marks the result unrated", async () => {
    const load = await sourceOf({ entries: {} }).load(11);
    expect(load).toEqual({ kind: "ok", puzzle: { generated: 11 }, rated: false });
  });

  it("never generates inside the horizon, even when the chunk cannot be read", async () => {
    const source = new PuzzleSource(moduleStub(), async (url) => {
      if (url === "/data/stub/index.json") return index;
      throw new Error("offline");
    });
    const load = await source.load(3);
    expect(load).toMatchObject({ kind: "unavailable" });
  });

  it("fetches a chunk once and serves later days from memory", async () => {
    let fetches = 0;
    const source = new PuzzleSource(moduleStub(), async (url) => {
      fetches += 1;
      return url === index.chunks[0]!.url ? { entries: { "1": { day: 1 }, "2": { day: 2 } } } : index;
    });
    await source.load(1);
    await source.load(2);
    expect(fetches).toBe(2);
  });
});
