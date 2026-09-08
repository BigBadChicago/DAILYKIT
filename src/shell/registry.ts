/**
 * Layer 5. The suite's list of games, as data.
 *
 * Zero imports on purpose. The hub renders five cards and reads five storage
 * keys, and it must do that without loading a single game's code, or
 * requirement 7.3.2's "navigating to a game downloads only that game's chunk"
 * is false on the landing page itself. Everything here is therefore a copy of
 * facts a built game also states in its GameIdentity, and a test asserts the
 * two agree for every game that exists.
 *
 * Games that are approved but not yet built carry status "planned". The hub
 * lists all five from day one, per requirement 7.3.1, which is what makes the
 * suite read as a suite before it is finished. Changing the slate is an edit to
 * this file and nothing else until a game is actually built.
 */

export type GameStatus = "live" | "planned";

export interface SuiteGameEntry {
  /** Storage key namespace and RNG stream name. Changing it is a migration. */
  readonly id: string;
  readonly displayName: string;
  /** Requirement 7.1.6. Rendered on the hub card. */
  readonly oneLineRule: string;
  /** Absolute path, root scope per the build model. */
  readonly path: string;
  readonly accent: { readonly hue: string; readonly boardFontStack: string };
  readonly epoch: { readonly year: number; readonly month: number; readonly day: number };
  /** Length of the module's DistributionSpec.labels. The hub opens a game's
   *  record without loading the game, and GameStore needs the bucket count to
   *  validate a stored histogram. Asserted against the module in tests. */
  readonly bucketCount: number;
  readonly hasWinLoss: boolean;
  readonly stateVersion: number;
  readonly status: GameStatus;
}

/** Bare host, no scheme. Last line of every share block, including the daily
 *  card, which has no game to take it from. */
export const SUITE_SHARE_URL = "dailykit.providentia.games";

/**
 * Ids the engine has already taken under the `dailykit:` prefix. A game with
 * one of these ids would write its board over the suite record or over the
 * storage probe, silently and only on the machines of players who had both.
 *
 * Uniqueness of a game's namespace rests on three things, and this list is the
 * third. First, the deployed origin is a dedicated subdomain, so the whole
 * `localStorage` area belongs to the suite and nothing else on
 * providentia.games can reach it. Second, every key the suite writes carries
 * the `dailykit:` prefix, so even a shared origin would not collide with an
 * unrelated application. Third, no game id may equal a name the engine has
 * already spent. A test asserts all three, so an id is checked when it is
 * added rather than when a player loses a streak.
 */
export const RESERVED_GAME_IDS: readonly string[] = ["suite", "probe"];

export const HUB_PATH = "/";

const MONO = "ui-monospace, monospace";

/**
 * Order is the hub's order and the daily card's row order. It runs from the
 * longest session to the shortest, so a player with two minutes finds the two
 * minute games without reading every card.
 */
export const SUITE_GAMES: readonly SuiteGameEntry[] = [
  {
    id: "poker-grid",
    displayName: "POKER GRID",
    oneLineRule: "Clear the board with connected five card poker hands.",
    path: "/poker-grid/",
    accent: { hue: "148", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 1 },
    bucketCount: 8,
    hasWinLoss: false,
    stateVersion: 1,
    status: "live",
  },
  {
    id: "vector",
    displayName: "VECTOR",
    oneLineRule: "Point every arrow so each numbered cell is the first one that exactly that many arrows reach.",
    path: "/vector/",
    accent: { hue: "28", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 1 },
    /* Solved on submission one, two, or three, or failed. */
    bucketCount: 4,
    hasWinLoss: true,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "cipher",
    displayName: "CIPHER",
    oneLineRule: "Break a four symbol code in six guesses from exact and misplaced counts.",
    path: "/cipher/",
    accent: { hue: "268", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 1 },
    bucketCount: 7,
    hasWinLoss: true,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "tally-drop",
    displayName: "TALLY DROP",
    oneLineRule: "Slide the five number strips until every row adds up to the totals in the margins.",
    path: "/tally-drop/",
    accent: { hue: "202", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 1 },
    bucketCount: 5,
    hasWinLoss: false,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "recall",
    displayName: "RECALL",
    oneLineRule: "Study a pattern of lit cells, then reproduce it from memory three times.",
    path: "/recall/",
    accent: { hue: "342", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 1 },
    bucketCount: 4,
    hasWinLoss: false,
    stateVersion: 1,
    status: "planned",
  },
];

export const LIVE_GAMES: readonly SuiteGameEntry[] = SUITE_GAMES.filter(
  (entry) => entry.status === "live",
);

export function entryFor(id: string): SuiteGameEntry | null {
  return SUITE_GAMES.find((entry) => entry.id === id) ?? null;
}

/** Requirement 7.3.7 offers exactly one other game. A planned game is never
 *  offered, because a cross promotion to a page that does not exist is worse
 *  than none. */
/**
 * True when an id is safe to use as a game's storage namespace and RNG stream
 * name. Called by the test, and by hand before adding a game.
 */
export function isUsableGameId(id: string): boolean {
  return /^[a-z]+(-[a-z]+)*$/.test(id) && !RESERVED_GAME_IDS.includes(id);
}

export function promotableIds(): readonly string[] {
  return LIVE_GAMES.map((entry) => entry.id);
}
