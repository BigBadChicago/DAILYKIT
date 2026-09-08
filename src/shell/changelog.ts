/**
 * Layer 5. The changelog. Requirement 3.3.3's `lastSeenVersion`, which storage
 * has persisted since Phase 3 and nothing has ever read.
 *
 * Suite level in feel, per game in storage, which is the correct split: a
 * player who only ever opens POKER GRID should not be shown what changed in a
 * game they have never played. An entry therefore names the games it touches,
 * and `SUITE_WIDE` means all of them.
 *
 * Versions are integers and only ever increase. Adding an entry means adding to
 * this list with the next integer, and nothing else anywhere.
 */

export const SUITE_WIDE = "suite" as const;

export interface ChangelogEntry {
  readonly version: number;
  /** Displayed as written. Local dates are the player's, release dates are not. */
  readonly date: string;
  /** Game ids this entry is worth showing to, or SUITE_WIDE for all of them. */
  readonly games: readonly string[] | typeof SUITE_WIDE;
  readonly lines: readonly string[];
}

/** Newest last. The list is the source of truth for APP_VERSION below. */
export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    version: 1,
    date: "2026-09-08",
    games: SUITE_WIDE,
    lines: [
      "The site now works without a connection once you have loaded it, and keeps the next several days of puzzles on your device.",
      "Added an about page covering what is stored and what is not.",
    ],
  },
];

export const APP_VERSION: number = CHANGELOG_ENTRIES.reduce(
  (highest, entry) => Math.max(highest, entry.version),
  0,
);

function touches(entry: ChangelogEntry, gameId: string): boolean {
  return entry.games === SUITE_WIDE || entry.games.includes(gameId);
}

/**
 * What to show this player, newest first.
 *
 * Empty for a first ever visit, where `lastSeenVersion` is zero: a changelog
 * for a product the player has not used yet is noise, and the help panel is
 * what that visit gets instead. Empty as well for a player already current, and
 * for one whose stored version is somehow ahead of this build, which is the
 * same cached older deploy case engine decision 11 refuses to guess at.
 */
export function pendingChangelog(
  lastSeenVersion: number,
  gameId: string,
): readonly ChangelogEntry[] {
  if (!Number.isInteger(lastSeenVersion) || lastSeenVersion <= 0) return [];
  if (lastSeenVersion >= APP_VERSION) return [];
  return CHANGELOG_ENTRIES.filter(
    (entry) => entry.version > lastSeenVersion && touches(entry, gameId),
  ).sort((left, right) => right.version - left.version);
}
