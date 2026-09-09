/**
 * Section 10.1. The changelog's whole job is deciding what a returning player
 * is shown, so every path through that decision is covered here, including the
 * two that must show nothing.
 */

import { describe, expect, it } from "vitest";

import {
  APP_VERSION,
  CHANGELOG_ENTRIES,
  SUITE_WIDE,
  pendingChangelog,
  type ChangelogEntry,
} from "../../src/shell/changelog.js";

describe("CHANGELOG_ENTRIES", () => {
  it("runs oldest first with no repeated or skipped version", () => {
    const versions = CHANGELOG_ENTRIES.map((entry) => entry.version);
    expect(versions).toEqual([...versions].sort((left, right) => left - right));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions.every((version) => Number.isInteger(version) && version > 0)).toBe(true);
  });

  it("names APP_VERSION as its newest entry", () => {
    expect(APP_VERSION).toBe(Math.max(...CHANGELOG_ENTRIES.map((entry) => entry.version)));
  });

  it("carries at least one line per entry, since an empty entry would open an empty modal", () => {
    for (const entry of CHANGELOG_ENTRIES) expect(entry.lines.length).toBeGreaterThan(0);
  });
});

describe("pendingChangelog", () => {
  it("shows nothing on a first ever visit, where the stored version is zero", () => {
    expect(pendingChangelog(0, "poker-grid")).toEqual([]);
  });

  it("shows nothing to a player already current", () => {
    expect(pendingChangelog(APP_VERSION, "poker-grid")).toEqual([]);
  });

  it("shows nothing for a stored version from the future", () => {
    expect(pendingChangelog(APP_VERSION + 5, "poker-grid")).toEqual([]);
  });

  it("shows nothing for a malformed stored version rather than throwing", () => {
    expect(pendingChangelog(Number.NaN, "poker-grid")).toEqual([]);
    expect(pendingChangelog(-3, "poker-grid")).toEqual([]);
    expect(pendingChangelog(1.5, "poker-grid")).toEqual([]);
  });

  it("shows every suite wide entry above the stored version, newest first", () => {
    if (APP_VERSION < 2) return;
    const shown = pendingChangelog(1, "poker-grid");
    expect(shown.every((entry) => entry.version > 1)).toBe(true);
    expect(shown.map((entry) => entry.version)).toEqual(
      [...shown.map((entry) => entry.version)].sort((left, right) => right - left),
    );
  });
});

/** The filter itself, over a fixture, so it is covered before a second game
 *  exists to cover it with. */
describe("game scoping", () => {
  const fixture: readonly ChangelogEntry[] = [
    { version: 1, date: "2026-01-01", games: SUITE_WIDE, lines: ["everything"] },
    { version: 2, date: "2026-02-01", games: ["cipher"], lines: ["cipher only"] },
    { version: 3, date: "2026-03-01", games: ["poker-grid"], lines: ["poker only"] },
  ];

  function pendingFrom(
    entries: readonly ChangelogEntry[],
    lastSeen: number,
    gameId: string,
  ): readonly ChangelogEntry[] {
    return entries
      .filter((entry) => entry.version > lastSeen)
      .filter((entry) => entry.games === SUITE_WIDE || entry.games.includes(gameId))
      .sort((left, right) => right.version - left.version);
  }

  it("keeps another game's entry out of this game's list", () => {
    expect(pendingFrom(fixture, 1, "poker-grid").map((entry) => entry.version)).toEqual([3]);
    expect(pendingFrom(fixture, 1, "cipher").map((entry) => entry.version)).toEqual([2]);
  });

  it("shows a suite wide entry to every game", () => {
    expect(pendingFrom(fixture, 0, "recall").map((entry) => entry.version)).toEqual([1]);
  });
});
