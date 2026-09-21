import { describe, expect, it } from "vitest";

import {
  PATTERN_COUNT,
  SOLVED_PATTERN,
  countsOf,
  isWordShape,
  marksFor,
  marksOfPattern,
  patternOf,
  patternOfMarks,
  type Mark,
} from "../../../src/games/five-letters/feedback.js";

/** The single pass marking the two pass rule exists to replace. */
function naive(answer: string, guess: string): Mark[] {
  return guess.split("").map((letter, i) => (answer[i] === letter ? 2 : answer.includes(letter) ? 1 : 0));
}

const RIGHT = 2;
const PRESENT = 1;
const ABSENT = 0;

describe("FIVE LETTERS two pass feedback", () => {
  it("marks every letter right on the answer itself", () => {
    expect(marksFor("heart", "heart")).toEqual([2, 2, 2, 2, 2]);
    expect(patternOf("heart", "heart")).toBe(SOLVED_PATTERN);
  });

  it("a later exact match claims the only copy, so an earlier copy is absent", () => {
    /* HEART against TREAT: the last T is right; naive marking calls the first T present. */
    expect(marksFor("heart", "treat")).toEqual([ABSENT, PRESENT, PRESENT, PRESENT, RIGHT]);
    expect(naive("heart", "treat")[0]).toBe(PRESENT);
  });

  it("marks only as many copies present as the answer holds, leftmost first", () => {
    /* One E in CRANE; SPEED has two, neither in place: only the first is present. */
    expect(marksFor("crane", "speed")).toEqual([ABSENT, ABSENT, PRESENT, ABSENT, ABSENT]);
    expect(naive("crane", "speed")).toEqual([ABSENT, ABSENT, PRESENT, PRESENT, ABSENT]);
  });

  it("an exact match outranks an earlier misplaced copy", () => {
    /* ABBEY has two Bs; BOBBY guesses three. Position 3 B is right, position 1 B
       takes the other copy as present, position 4 B is absent. */
    expect(marksFor("abbey", "bobby")).toEqual([PRESENT, ABSENT, RIGHT, ABSENT, RIGHT]);
  });

  it("gives each answer copy its own mark when the guess has as many", () => {
    /* LLAMA against ALLAY: A present, L right, L present, the second A present
       on the answer's second A, Y absent. */
    expect(marksFor("llama", "allay")).toEqual([PRESENT, RIGHT, PRESENT, PRESENT, ABSENT]);
  });

  it("a letter absent from the answer is absent every time", () => {
    expect(marksFor("heart", "fluff")).toEqual([0, 0, 0, 0, 0]);
  });

  it("round trips every pattern and counts marks", () => {
    for (let p = 0; p < PATTERN_COUNT; p += 1) expect(patternOfMarks(marksOfPattern(p))).toBe(p);
    expect(countsOf([2, 1, 1, 1, 2])).toEqual({ right: 2, present: 3 });
  });

  it("never marks more copies than the answer holds, over many pairs", () => {
    const words = ["abbey", "bobby", "llama", "allay", "speed", "crane", "geese", "eerie", "treat", "heart", "sassy", "kayak"];
    for (const answer of words) {
      for (const guess of words) {
        const marks = marksFor(answer, guess);
        for (const letter of new Set(guess)) {
          const marked = guess.split("").filter((l, i) => l === letter && marks[i] !== 0).length;
          const held = answer.split("").filter((l) => l === letter).length;
          expect(marked).toBe(Math.min(held, guess.split("").filter((l) => l === letter).length));
        }
        const { right, present } = countsOf(marks);
        expect(right === 4 && present === 1).toBe(false);
      }
    }
  });

  it("recognises the word shape", () => {
    expect(isWordShape("heart")).toBe(true);
    expect(isWordShape("hear")).toBe(false);
    expect(isWordShape("Heart")).toBe(false);
  });
});
