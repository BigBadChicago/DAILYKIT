import { describe, expect, it } from "vitest";

import {
  ballSize,
  buildGraph,
  differingPositions,
  distance,
  distancesFrom,
  isOneChange,
} from "../../../src/games/word-ladder/ladder.js";

describe("WORD LADDER one letter change relation", () => {
  it("is true for exactly one differing position", () => {
    expect(isOneChange("cold", "cord")).toBe(true);
    expect(isOneChange("word", "ward")).toBe(true);
  });

  it("is false for zero, two, or a length mismatch", () => {
    expect(isOneChange("cold", "cold")).toBe(false);
    expect(isOneChange("cold", "warm")).toBe(false);
    expect(isOneChange("cold", "colder")).toBe(false);
    expect(isOneChange("cat", "cot")).toBe(false);
  });

  it("is symmetric", () => {
    expect(isOneChange("mare", "mire")).toBe(isOneChange("mire", "mare"));
  });
});

describe("WORD LADDER graph and search", () => {
  const words = ["cold", "cord", "word", "ward", "warm", "xxyz", "xxzz"];
  const graph = buildGraph(words);

  it("links only words one change apart, both directions", () => {
    expect(graph.get("cold")).toContain("cord");
    expect(graph.get("cord")).toContain("cold");
    expect(graph.get("cord")).toContain("word");
    expect(graph.get("cold")).not.toContain("warm");
  });

  it("finds the shortest distance and null when unreachable", () => {
    expect(distance(graph, "cold", "cold")).toBe(0);
    expect(distance(graph, "cold", "warm")).toBe(4);
    /* xxyz and xxzz form an island disconnected from the cold ladder. */
    expect(distance(graph, "cold", "xxyz")).toBeNull();
  });

  it("distancesFrom agrees with distance for every reachable word", () => {
    const dist = distancesFrom(graph, "cold");
    expect(dist.get("warm")).toBe(4);
    expect(dist.get("word")).toBe(2);
    expect(dist.has("xxyz")).toBe(false);
  });

  it("ballSize counts words within a radius, including the source", () => {
    expect(ballSize(graph, "cold", 0)).toBe(1);
    expect(ballSize(graph, "cold", 1)).toBe(2); // cold, cord
    expect(ballSize(graph, "cold", -1)).toBe(0);
  });

  it("counts differing positions for the detour measure", () => {
    expect(differingPositions("cold", "warm")).toBe(4);
    expect(differingPositions("cold", "cord")).toBe(1);
    expect(differingPositions("cold", "cold")).toBe(0);
  });
});
