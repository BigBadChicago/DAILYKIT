import { describe, expect, it } from "vitest";

import {
  BAND_EDGES,
  CLUE_CEILING,
  CLUE_FLOOR,
  DEPTH_FLOOR,
  OPENING_MAX_PERCENT,
  WEEKDAY_BAND,
  bandForPuzzle,
  bandOf,
  carve,
  firstSessionBoard,
  generateUnrated,
  passesScreens,
  weekdayOf,
  type Draw,
  type GeneratedBoard,
} from "../../../src/games/vector/generator.js";
import {
  CELLS,
  buildGeometry,
  candidateList,
  cluesSumToBlanks,
  everyLineHasClue,
  propagate,
  satisfies,
} from "../../../src/games/vector/propagate.js";

/** Local generator, so the carve is tested without the engine's rng. */
function draws(seed: number): Draw {
  let state = seed >>> 0 || 1;
  return {
    intBelow(bound: number): number {
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state % bound;
    },
  };
}

const LEVERS = new Set([
  "clue-sparse",
  "clue-dense",
  "zero-heavy",
  "edge-weighted",
  "centre-weighted",
  "none",
]);

function boards(count: number, from = 1): GeneratedBoard[] {
  const out: GeneratedBoard[] = [];
  for (let seed = from; out.length < count && seed < from + 4000; seed += 1) {
    const board = carve(draws(seed * 2654435761));
    if (board !== null) out.push(board);
  }
  return out;
}

const sample = boards(40);

describe("carve", () => {
  it("produces boards at all", () => {
    expect(sample.length).toBe(40);
  });

  it("lands inside the clue range", () => {
    for (const board of sample) {
      const clues = buildGeometry(board.clues).clueCells.length;
      expect(clues).toBeGreaterThanOrEqual(CLUE_FLOOR);
      expect(clues).toBeLessThanOrEqual(CLUE_CEILING);
    }
  });

  it("satisfies every placement invariant", () => {
    for (const board of sample) {
      const geometry = buildGeometry(board.clues);
      expect(board.clues).toHaveLength(CELLS);
      expect(everyLineHasClue(board.clues)).toBe(true);
      expect(cluesSumToBlanks(geometry)).toBe(true);
      for (const cell of geometry.blankCells) {
        expect(candidateList(geometry, cell).length).toBeGreaterThanOrEqual(2);
      }
      for (const clue of geometry.clueCells) {
        expect((geometry.suppliers.get(clue) ?? []).length).toBeGreaterThan(0);
      }
    }
  });

  it("returns only boards that resolve, and the solution it reports", () => {
    for (const board of sample) {
      const geometry = buildGeometry(board.clues);
      const result = propagate(geometry);
      expect(result.kind).toBe("resolved");
      if (result.kind !== "resolved") continue;
      expect(result.arrows).toEqual(board.solution);
      expect(satisfies(geometry, board.solution)).toBe(true);
    }
  });

  it("reports depth, opening, blanks and intensity consistently", () => {
    for (const board of sample) {
      const geometry = buildGeometry(board.clues);
      const result = propagate(geometry);
      if (result.kind !== "resolved") continue;
      expect(board.depth).toBe(result.depth);
      expect(board.opening).toBe(result.opening);
      expect(board.blanks).toBe(geometry.blankCells.length);
      let total = 0;
      for (const cell of geometry.blankCells) total += result.rounds[cell] as number;
      expect(board.intensity).toBe(Math.floor((total * 100) / board.blanks));
    }
  });

  it("draws levers only from the fixed vocabulary", () => {
    for (const board of sample) {
      expect(board.levers.length).toBeGreaterThan(0);
      for (const lever of board.levers) expect(LEVERS.has(lever)).toBe(true);
    }
  });

  it("is deterministic for a seed", () => {
    const first = carve(draws(12345));
    const second = carve(draws(12345));
    expect(second).toEqual(first);
  });

  it("gives different seeds different boards", () => {
    const layouts = new Set(sample.map((board) => board.clues.join(",")));
    expect(layouts.size).toBe(sample.length);
  });
});

describe("screens", () => {
  it("refuses a board below the depth floor", () => {
    const shallow = { ...(sample[0] as GeneratedBoard), depth: DEPTH_FLOOR - 1 };
    expect(passesScreens(shallow)).toBe(false);
  });

  it("refuses a board whose opening is above the cap", () => {
    const board = sample[0] as GeneratedBoard;
    const wide = { ...board, opening: Math.floor((OPENING_MAX_PERCENT * board.blanks) / 100) + 1 };
    expect(passesScreens(wide)).toBe(false);
  });

  it("accepts a board exactly at the cap", () => {
    const board = sample[0] as GeneratedBoard;
    const exact = { ...board, opening: Math.floor((OPENING_MAX_PERCENT * board.blanks) / 100) };
    expect(passesScreens(exact)).toBe(true);
  });

  it("passes every carved board it is meant to", () => {
    for (const board of sample) {
      if (board.depth < DEPTH_FLOOR) continue;
      if (board.opening * 100 > OPENING_MAX_PERCENT * board.blanks) continue;
      expect(passesScreens(board)).toBe(true);
    }
  });
});

describe("bands", () => {
  it("puts an intensity below the first edge in the gentlest band", () => {
    expect(bandOf((BAND_EDGES[0] as number) - 1)).toBe(0);
    expect(bandOf(BAND_EDGES[0] as number)).toBe(0);
    expect(bandOf((BAND_EDGES[0] as number) + 1)).toBe(1);
  });

  it("puts an intensity above the last edge in the hardest band", () => {
    const last = BAND_EDGES[BAND_EDGES.length - 1] as number;
    expect(bandOf(last)).toBe(BAND_EDGES.length - 1);
    expect(bandOf(last + 1)).toBe(BAND_EDGES.length);
  });

  it("keeps the edges strictly increasing", () => {
    for (let at = 1; at < BAND_EDGES.length; at += 1) {
      expect(BAND_EDGES[at] as number).toBeGreaterThan(BAND_EDGES[at - 1] as number);
    }
  });

  it("uses every band exactly once across a week", () => {
    expect(new Set(WEEKDAY_BAND).size).toBe(7);
    expect(WEEKDAY_BAND.length).toBe(BAND_EDGES.length + 1);
  });

  it("runs gentle Monday to hard Saturday with Sunday between Thursday and Friday", () => {
    const [mon, tue, wed, thu, fri, sat, sun] = WEEKDAY_BAND;
    expect(mon).toBeLessThan(tue as number);
    expect(tue).toBeLessThan(wed as number);
    expect(wed).toBeLessThan(thu as number);
    expect(thu).toBeLessThan(sun as number);
    expect(sun).toBeLessThan(fri as number);
    expect(fri).toBeLessThan(sat as number);
  });

  it("starts the week on Monday, because the epoch is a Monday", () => {
    expect(weekdayOf(1)).toBe(0);
    expect(weekdayOf(7)).toBe(6);
    expect(weekdayOf(8)).toBe(0);
    expect(bandForPuzzle(1)).toBe(WEEKDAY_BAND[0]);
  });
});

describe("the fallback past the horizon", () => {
  it("returns a board that resolves and passes the screens", () => {
    const board = generateUnrated(draws(777));
    expect(board).not.toBeNull();
    if (board === null) return;
    expect(passesScreens(board)).toBe(true);
    expect(propagate(buildGeometry(board.clues)).kind).toBe("resolved");
  });

  it("does not enforce the weekday band", () => {
    // Over several boards the fallback should land in more than one band, which
    // it could not do if it were filtering.
    const bands = new Set<number>();
    for (let seed = 1; seed <= 12; seed += 1) {
      const board = generateUnrated(draws(seed * 7919));
      if (board !== null) bands.add(bandOf(board.intensity));
    }
    expect(bands.size).toBeGreaterThan(1);
  });
});

describe("the first session board", () => {
  const board = firstSessionBoard();

  it("resolves and satisfies its own clues", () => {
    const geometry = buildGeometry(board.clues);
    expect(propagate(geometry).kind).toBe("resolved");
    expect(satisfies(geometry, board.solution)).toBe(true);
  });

  it("holds every placement invariant", () => {
    const geometry = buildGeometry(board.clues);
    expect(everyLineHasClue(board.clues)).toBe(true);
    expect(cluesSumToBlanks(geometry)).toBe(true);
  });

  it("is no harder than the gentlest band", () => {
    expect(board.intensity).toBeLessThanOrEqual(BAND_EDGES[0] as number);
    expect(bandOf(board.intensity)).toBe(0);
  });

  it("is not so shallow that it reads as broken", () => {
    expect(board.depth).toBeGreaterThanOrEqual(DEPTH_FLOOR);
  });
});
