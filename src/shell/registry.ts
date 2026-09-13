/**
 * Layer 5. The suite's list of games, as data.
 *
 * Zero imports on purpose. The hub renders eight cards and reads eight storage
 * keys, and it must do that without loading a single game's code, or
 * requirement 7.3.2's "navigating to a game downloads only that game's chunk"
 * is false on the landing page itself. Everything here is therefore a copy of
 * facts a built game also states in its GameIdentity, and a test asserts the
 * two agree for every game that exists.
 *
 * Games that are approved but not yet built carry status "planned". The hub
 * lists all eight from day one, per requirement 7.3.1, which is what makes the
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
  /** Per game. Every game from CIPHER onward starts on the first Monday of the
   *  epoch year, so puzzle 1 lands in the gentlest weekday band. POKER GRID
   *  keeps the 1 January epoch it shipped with. */
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

export const HUB_PATH = "/";

const MONO = "ui-monospace, monospace";
const MONO_SF = "ui-monospace, 'SF Mono', Menlo, monospace";

/**
 * Order is the hub's order and the daily card's row order. It runs from the
 * longest session to the shortest, so a player with two minutes finds the two
 * minute games without reading every card.
 */
/**
 * Bucket counts and hasWinLoss for a planned game are provisional. They become
 * facts when that game is built, and the registry test asserts agreement only
 * for games that exist, so a wrong guess here is caught at the phase that
 * builds the game rather than shipped.
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
    accent: { hue: "28", boardFontStack: MONO_SF },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 4,
    hasWinLoss: true,
    stateVersion: 2,
    status: "live",
  },
  {
    id: "cipher",
    displayName: "CIPHER",
    oneLineRule: "Break a four symbol code in six guesses from exact and misplaced counts.",
    path: "/cipher/",
    accent: { hue: "268", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 7,
    hasWinLoss: true,
    stateVersion: 1,
    status: "live",
  },
  /*
   * The five below are the lineup approved 2026-09-13, recorded in
   * ARCHITECTURE2.md. They replace TALLY DROP and RECALL, which are cancelled.
   *
   * Order among these five is provisional. The list is meant to run longest
   * session to shortest and none of them has a design document yet, so nothing
   * states their session lengths. Re sort when each one is written.
   *
   * Hues are spaced forty degrees apart across all eight games, which is the
   * widest even spacing eight accents admit. The three live hues are unchanged.
   *
   * One line rules are drafts against requirement 7.1.6 and are replaced by the
   * sentence each design document settles. bucketCount, hasWinLoss and
   * stateVersion are provisional and become facts when the game is built, which
   * the registry test enforces only for games that exist.
   */
  {
    id: "difference-relay",
    displayName: "DIFFERENCE RELAY",
    oneLineRule: "Order the numbers so every neighbouring pair differs by the amount marked between them.",
    path: "/difference-relay/",
    accent: { hue: "68", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 4,
    hasWinLoss: true,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "turn-table",
    displayName: "TURN TABLE",
    oneLineRule: "Rotate the route tiles until one path runs through every checkpoint.",
    path: "/turn-table/",
    accent: { hue: "108", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 4,
    hasWinLoss: false,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "ring-balance",
    displayName: "RING BALANCE",
    oneLineRule: "Place the numbers around the ring so every marked span sums to its target.",
    path: "/ring-balance/",
    accent: { hue: "188", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 4,
    hasWinLoss: true,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "order-of-operations",
    displayName: "ORDER OF OPERATIONS",
    oneLineRule: "Order the signed operators so the running total hits every checkpoint.",
    path: "/order-of-operations/",
    accent: { hue: "228", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 4,
    hasWinLoss: false,
    stateVersion: 1,
    status: "planned",
  },
  {
    id: "rotate-lock",
    displayName: "ROTATE LOCK",
    oneLineRule: "Order and rotate the route pieces so the path takes every marked turn.",
    path: "/rotate-lock/",
    accent: { hue: "308", boardFontStack: MONO },
    epoch: { year: 2026, month: 1, day: 5 },
    bucketCount: 4,
    hasWinLoss: false,
    stateVersion: 1,
    status: "planned",
  },
  /* NEW_GAME_INSERTION: SUITE_GAMES */
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
export function promotableIds(): readonly string[] {
  return LIVE_GAMES.map((entry) => entry.id);
}
