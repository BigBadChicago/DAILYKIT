import { describe, expect, it } from "vitest";

import { buildGraph } from "../../../src/games/word-ladder/ladder.js";
import { difficultyOf, hasFamiliarShortestPath, solve, solveWith } from "../../../src/games/word-ladder/solver.js";

/* A path graph cold-cord-word-ward-warm, all four apart, plus an off path pair. */
const ACCEPTED = ["cold", "cord", "word", "ward", "warm", "wart", "wars"];

describe("WORD LADDER par is the exact shortest path", () => {
  it("measures par as the breadth first distance", () => {
    const result = solve(ACCEPTED, ACCEPTED, "cold", "warm");
    expect(result.solvable).toBe(true);
    expect(result.par).toBe(4);
  });

  it("reports unsolvable and zero par for a disconnected goal", () => {
    const result = solve(["cold", "cord", "care"], ["cold", "cord", "care"], "cold", "care");
    expect(result.solvable).toBe(false);
    expect(result.par).toBe(0);
  });
});

describe("WORD LADDER fairness, the familiar shortest path", () => {
  const acceptedGraph = buildGraph(ACCEPTED);

  it("is fair when the familiar subgraph reaches the goal in par", () => {
    /* Every word on the shortest path is familiar here. */
    const familiar = buildGraph(["cold", "cord", "word", "ward", "warm"]);
    expect(hasFamiliarShortestPath(familiar, "cold", "warm", 4)).toBe(true);
  });

  it("is unfair when the only shortest path needs an unfamiliar rung", () => {
    /* Drop WORD from the familiar list, so no familiar shortest path exists. */
    const familiar = buildGraph(["cold", "cord", "ward", "warm"]);
    expect(hasFamiliarShortestPath(familiar, "cold", "warm", 4)).toBe(false);
  });

  it("solveWith folds solvability, par, fairness and difficulty together", () => {
    const familiarGraph = buildGraph(["cold", "cord", "word", "ward", "warm"]);
    const result = solveWith(acceptedGraph, familiarGraph, "cold", "warm");
    expect(result).toMatchObject({ solvable: true, par: 4, familiarFair: true });
    expect(result.difficulty).toBeGreaterThan(0);
  });
});

describe("WORD LADDER difficulty is the search ball below par", () => {
  it("counts accepted words within par minus one of the start", () => {
    const graph = buildGraph(ACCEPTED);
    /* par(cold,warm) is 4, so the ball is words within 3 of cold: cold, cord,
       word, ward. */
    const ball = difficultyOf(graph, "cold", "warm");
    expect(ball).toBe(4);
  });

  it("is zero for an unsolvable pair", () => {
    const graph = buildGraph(["cold", "cord", "care"]);
    expect(difficultyOf(graph, "cold", "care")).toBe(0);
  });
});
