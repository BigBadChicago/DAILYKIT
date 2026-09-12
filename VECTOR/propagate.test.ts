import { describe, expect, it } from "vitest";

import {
  CELLS,
  COLS,
  DOWN,
  LEFT,
  NO_TARGET,
  RIGHT,
  ROWS,
  UP,
  arrivals,
  buildGeometry,
  candidateList,
  cellAt,
  cluesSumToBlanks,
  everyLineHasClue,
  isCandidate,
  nextCandidate,
  propagate,
  rayTarget,
  satisfies,
  solutionOf,
  type ClueLayout,
  type Direction,
} from "../../../src/games/vector/propagate.js";
import {
  CONTRADICTORY_LAYOUT,
  FIXTURE_BLANKS,
  FIXTURE_CLUES,
  FIXTURE_DEPTH,
  FIXTURE_LAYOUT,
  FIXTURE_OPENING,
  FIXTURE_SOLUTION,
  STALLING_LAYOUT,
} from "./fixtures.js";

const geometry = buildGeometry(FIXTURE_LAYOUT);

describe("geometry", () => {
  it("splits the board into clue cells and blanks", () => {
    expect(geometry.clueCells).toHaveLength(FIXTURE_CLUES);
    expect(geometry.blankCells).toHaveLength(FIXTURE_BLANKS);
    expect(geometry.clueCells.length + geometry.blankCells.length).toBe(CELLS);
  });

  it("stops a ray at the first clue and never at another arrow", () => {
    // Cell 0 sees the 6 at cell 3 to its right, past two blanks.
    expect(rayTarget(FIXTURE_LAYOUT, 0, RIGHT)).toBe(3);
    // And the 1 at cell 12 below it, past cell 6.
    expect(rayTarget(FIXTURE_LAYOUT, 0, DOWN)).toBe(12);
  });

  it("reports no target for a ray that leaves the board", () => {
    expect(rayTarget(FIXTURE_LAYOUT, 0, UP)).toBe(NO_TARGET);
    expect(rayTarget(FIXTURE_LAYOUT, 0, LEFT)).toBe(NO_TARGET);
  });

  it("offers only the directions that reach a clue", () => {
    expect(candidateList(geometry, 0)).toEqual([RIGHT, DOWN]);
    expect(candidateList(geometry, 9)).toEqual([UP, DOWN, LEFT]);
    expect(isCandidate(geometry, 0, UP)).toBe(false);
    expect(isCandidate(geometry, 0, RIGHT)).toBe(true);
  });

  it("gives every blank at least two candidates, invariant 3", () => {
    for (const cell of geometry.blankCells) {
      expect(candidateList(geometry, cell).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("holds a clue in every row and every column, invariant 2", () => {
    expect(everyLineHasClue(FIXTURE_LAYOUT)).toBe(true);
  });

  it("closes the system, invariant 4", () => {
    expect(cluesSumToBlanks(geometry)).toBe(true);
  });

  it("makes suppliers the exact transpose of candidates", () => {
    let slots = 0;
    for (const cell of geometry.blankCells) slots += candidateList(geometry, cell).length;
    let supplied = 0;
    for (const clue of geometry.clueCells) {
      const list = geometry.suppliers.get(clue) ?? [];
      supplied += list.length;
      for (const supplier of list) {
        expect(geometry.targets[supplier.cell * 4 + supplier.dir]).toBe(clue);
      }
    }
    expect(supplied).toBe(slots);
  });

  it("never lets two directions of one cell share a target", () => {
    for (const cell of geometry.blankCells) {
      const targets = candidateList(geometry, cell).map(
        (dir) => geometry.targets[cell * 4 + dir],
      );
      expect(new Set(targets).size).toBe(targets.length);
    }
  });

  it("gives every clue at least one supplier", () => {
    for (const clue of geometry.clueCells) {
      expect((geometry.suppliers.get(clue) ?? []).length).toBeGreaterThan(0);
    }
  });
});

describe("nextCandidate", () => {
  it("cycles through the candidates and wraps to empty", () => {
    expect(nextCandidate(geometry, 0, null)).toBe(RIGHT);
    expect(nextCandidate(geometry, 0, RIGHT)).toBe(DOWN);
    expect(nextCandidate(geometry, 0, DOWN)).toBe(null);
  });

  it("walks a three candidate cell in direction order", () => {
    expect(nextCandidate(geometry, 9, null)).toBe(UP);
    expect(nextCandidate(geometry, 9, UP)).toBe(DOWN);
    expect(nextCandidate(geometry, 9, DOWN)).toBe(LEFT);
    expect(nextCandidate(geometry, 9, LEFT)).toBe(null);
  });

  it("restarts from a direction that is not a candidate", () => {
    expect(nextCandidate(geometry, 0, UP)).toBe(RIGHT);
  });
});

describe("satisfies", () => {
  it("accepts the solution", () => {
    expect(satisfies(geometry, FIXTURE_SOLUTION)).toBe(true);
  });

  it("counts arrivals only on clue cells", () => {
    const counts = arrivals(geometry, FIXTURE_SOLUTION);
    for (const clue of geometry.clueCells) {
      expect(counts[clue]).toBe(FIXTURE_LAYOUT[clue]);
    }
    for (const cell of geometry.blankCells) expect(counts[cell]).toBe(0);
  });

  it("refuses an incomplete board", () => {
    const partial = FIXTURE_SOLUTION.slice();
    partial[geometry.blankCells[0]] = null;
    expect(satisfies(geometry, partial)).toBe(false);
  });

  it("refuses a board with one arrow turned", () => {
    const turned = FIXTURE_SOLUTION.slice();
    const cell = geometry.blankCells[0];
    const other = candidateList(geometry, cell).find((dir) => dir !== turned[cell]);
    turned[cell] = other as Direction;
    expect(satisfies(geometry, turned)).toBe(false);
  });
});

describe("propagate", () => {
  it("resolves the fixture and reproduces its depth and opening", () => {
    const result = propagate(geometry);
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.depth).toBe(FIXTURE_DEPTH);
    expect(result.opening).toBe(FIXTURE_OPENING);
    expect(result.arrows).toEqual(FIXTURE_SOLUTION);
  });

  it("resolves to a board that satisfies every clue", () => {
    const solution = solutionOf(geometry);
    expect(solution).not.toBeNull();
    expect(satisfies(geometry, solution as ArrowBoardLike)).toBe(true);
  });

  it("assigns every blank cell and no clue cell", () => {
    const solution = solutionOf(geometry) as ArrowBoardLike;
    for (const cell of geometry.blankCells) expect(solution[cell]).not.toBeNull();
    for (const cell of geometry.clueCells) expect(solution[cell]).toBeNull();
  });

  it("only ever assigns a direction the cell could take", () => {
    const solution = solutionOf(geometry) as ArrowBoardLike;
    for (const cell of geometry.blankCells) {
      expect(isCandidate(geometry, cell, solution[cell] as Direction)).toBe(true);
    }
  });

  it("stalls rather than guessing", () => {
    const result = propagate(buildGeometry(STALLING_LAYOUT));
    expect(result.kind).toBe("stalled");
    if (result.kind !== "stalled") return;
    expect(result.assigned).toBeLessThan(FIXTURE_BLANKS);
  });

  it("reports a contradiction on a layout no assignment can meet", () => {
    const result = propagate(buildGeometry(CONTRADICTORY_LAYOUT));
    expect(result.kind).toBe("contradiction");
  });

  it("is deterministic", () => {
    const first = propagate(buildGeometry(FIXTURE_LAYOUT));
    const second = propagate(buildGeometry(FIXTURE_LAYOUT));
    expect(second).toEqual(first);
  });

  it("uniqueness, by exhaustive search from every other first move", () => {
    // The independent check VECTOR.md section 10 assertion 6 puts in the
    // verifier, run here on one board so the propagator's claim is tested by
    // something other than the propagator.
    const solution = solutionOf(geometry) as ArrowBoardLike;
    for (const cell of geometry.blankCells) {
      for (const dir of candidateList(geometry, cell)) {
        if (dir === solution[cell]) continue;
        expect(hasSolutionWith(FIXTURE_LAYOUT, cell, dir)).toBe(false);
      }
    }
  });
});

type ArrowBoardLike = (Direction | null)[];

/**
 * A plain backtracking search, written separately from the propagator on
 * purpose. It fixes one cell and asks whether any complete assignment satisfies
 * every clue.
 */
function hasSolutionWith(layout: ClueLayout, fixedCell: number, fixedDir: Direction): boolean {
  const local = buildGeometry(layout);
  const arrows: ArrowBoardLike = new Array<Direction | null>(CELLS).fill(null);
  const counts: number[] = new Array<number>(CELLS).fill(0);
  const order = local.blankCells.filter((cell) => cell !== fixedCell);

  const place = (cell: number, dir: Direction): boolean => {
    const target = local.targets[cell * 4 + dir];
    if (counts[target] + 1 > (layout[target] as number)) return false;
    arrows[cell] = dir;
    counts[target] += 1;
    return true;
  };
  const lift = (cell: number): void => {
    const dir = arrows[cell] as Direction;
    counts[local.targets[cell * 4 + dir]] -= 1;
    arrows[cell] = null;
  };

  if (!place(fixedCell, fixedDir)) return false;

  const walk = (at: number): boolean => {
    if (at === order.length) return satisfies(local, arrows);
    const cell = order[at];
    for (const dir of candidateList(local, cell)) {
      if (!place(cell, dir)) continue;
      if (walk(at + 1)) return true;
      lift(cell);
    }
    return false;
  };
  return walk(0);
}

describe("board shape", () => {
  it("is six by six", () => {
    expect(COLS).toBe(6);
    expect(ROWS).toBe(6);
    expect(CELLS).toBe(36);
    expect(cellAt(2, 3)).toBe(15);
  });
});
