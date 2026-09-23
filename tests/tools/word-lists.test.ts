import { describe, expect, it } from "vitest";
import {
  cleanWordText,
  distinctLetters,
  getCommandLineFlag,
  parseScowlLevels,
} from "../../tools/word-lists.js";

describe("word lists utilities", () => {
  it("cleanWordText strips tags, comments, and whitespace", () => {
    expect(cleanWordText("<tag>hello{comment}# comment")).toBe("hello");
    expect(cleanWordText("  apple  ")).toBe("apple");
  });

  it("distinctLetters counts unique characters", () => {
    expect(distinctLetters("apple")).toBe(4);
    expect(distinctLetters("letter")).toBe(4);
    expect(distinctLetters("abc")).toBe(3);
  });

  it("getCommandLineFlag extracts flag values from arguments array", () => {
    const args = ["node", "script.js", "--scowl", "scowl.txt", "--enable", "enable.txt"];
    expect(getCommandLineFlag("scowl", args)).toBe("scowl.txt");
    expect(getCommandLineFlag("enable", args)).toBe("enable.txt");
    expect(getCommandLineFlag("missing", args)).toBeNull();
  });

  it("parseScowlLevels parses SCOWL entries correctly", () => {
    const mockScowl = [
      "35: <head>apple: apples, appled",
      "50: A: <head>color: colors",
      "35: B: <head>colour: colours",
    ].join("\n");

    const levels = parseScowlLevels(mockScowl);
    expect(levels.any.get("apple")).toBe(35);
    expect(levels.head.get("apple")).toBe(35);
    expect(levels.any.get("apples")).toBe(35);
    expect(levels.any.get("color")).toBe(50);
    expect(levels.any.has("colour")).toBe(false);
  });
});
