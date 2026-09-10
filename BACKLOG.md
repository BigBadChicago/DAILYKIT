# BACKLOG

Everything deliberately not built, with a one line rationale. Nothing here is
work in progress. Adding an item here is how a request is declined.

## Refused for version 1, per Section 11

| Item | Rationale |
|---|---|
| Accounts, cloud sync, cross device streaks | Requires a backend, and constraint 2.4 forbids one |
| Multiplayer, leaderboards, social features | Distribution is the share string, not a social graph |
| Monetization of any kind including ads | Privacy stance in 8.5 is a stated differentiator |
| Native app wrapper | The web suite is the product |
| Server side anything | Static output only |
| Content management system or level editor | Zero daily content cost means no human authoring path |
| Localization | Strings will be extracted to structured objects so this stays cheap later |

## Deferred by design decision

| Item | Rationale |
|---|---|
| POKER GRID hand limited hard mode | Explicitly out of version 1 per locked decision 4 |
| Runtime full board solving on device | Solver cost is an offline concern, see Q6 |
| Analytics vendor of any kind | telemetry.ts ships as a no operation seam only |
| Sound and haptics | Not specified, and adds asset licensing surface |
| Animated card art or illustrated faces | Self drawn geometric faces only, keeps ASSETS.md trivial |
| Shared package or monorepo link to PokerFall | Only the hand definitions are shared, by file copy, per 6.6 |
| Archive for games that want it disabled | Per game module setting, no engine work beyond the flag |
| Action log serialization and free archive replay | Freezes apply semantics across every stored save, per contract decision 9 |
| Game supplied share glyphs | Vocabulary is closed to games so the family look of 7.3.6 cannot drift |
| Async getPuzzle owning its own fetch | Shell owns network so offline and caching live in one place |
| Summary bar row in the POKER GRID share block | Redundant with hand row count under locked decisions 1 and 3, and it broke the nine line cap |
| Perfect clear score bonus | Cards cleared already dominates and the sweep has its own histogram bucket |
| Kicker comparison inside a hand category | POKER GRID classifies hands, it never compares two, so the shared file exports no comparator |
| Incremental or cached legal move list | Full enumeration with early exit is on the order of 10^3 subsets and fits in a frame |
| miss token in POKER GRID hand rows | Every row is a completed hand, so the token is reserved for genuine failure in other suite games |
| A second JavaScript engine in the automated test suite | jsdom shares V8 with Node so it proves nothing about divergence, and a browser runner is a fourth build dependency against constraint 2.3. Cross engine checking is a Section 10.7 manual item |
| Per field repair of a corrupted saved record | A repair path is a second copy of the schema that will drift from the parser. Invalid means fresh record plus a recovered flag |
| Retrying a write after quota exceeded | The store downgrades to memory for the rest of the session so every later write takes one path and the player's banner stays true |
| Migrating history or archive payloads across game state versions | Those entries hold engine owned results, not game payloads, so a failed module migration costs one unfinished board and never a streak |
| Reading an envelope or payload version from the future optimistically | A cached older build would reinterpret a newer shape wrongly. It loses the day instead |
| A FINISHED transition out of ARCHIVED_VIEW | Would leave a replay one dismissal from the live countdown for a day the player has not reached |
| Clamping a pre epoch puzzle number to 1 | Silently serves day one to a player with a broken clock. `resolve` reports before-epoch instead |
| A high contrast theme as a fourth user choice | prefers-contrast and forced-colors are layered over light and dark, so the platform preference is honoured with three states instead of four |
| A roving tabindex over board cells | 35 focus changes per board narrate worse than one aria-activedescendant, and focus order would fight the settle |
| Animated settle and clear transitions in Layer 2 | Board animation is the game renderer's, Phase 6. The kit ships motion only for chrome, gated on prefers-reduced-motion |
| A virtual DOM or diffing library | patchKeyed over direct children is the whole requirement, and constraint 2.2 forbids the alternative |

## Raised and rejected during Phase 0

| Item | Rationale |
|---|---|
| React or any framework | Constraint 2.2 |
| Runtime dependency of any kind | Constraint 2.3 |
| Shipping all 365 boards on first load | Conflicts with the 150 KB budget and with 8.4, see Q6 |

## Logged in Phase 7

- **`tools/depcheck.ts`.** Section 5 requires the engine never imports a game
  and a game never imports another game, enforced in CI. It is convention only
  today. Not built here because it belongs to the Phase 0 toolchain and Phase 7
  is the generation pipeline.
- **Exact optima for the full horizon.** A 35 card board exceeds any workable
  exhaustive search, so every stored score is a width 400 beam result labelled
  `beam`, and the end screen must read best known rather than optimal. A
  dominance pruned or bitboard search could plausibly close this later, and
  would change only the manifest, not the game.
- **Rounding drift in the scoring table.** Two categories sit one or two points
  off the measured curve because round numbers feel better. Recorded so a later
  retune does not treat the drift as a bug.
- **`rank-clump` and `corner-isolate` levers.** Named in the fixed vocabulary,
  not scheduled on any weekday. Available if the difficulty curve needs more
  separation between Wednesday and Friday.

## Phase 8 remainder, found in Phase 10

Phase 8 was recorded as done and these three items were not built. They are not
new scope; they are the parts of Section 8 and constraint 2.6 that remain.

The service worker and the favicon are now built, and so is everything else
this section named. What is left is running MANUAL-CHECKS.md once and recording
the result, which is a human pass across real devices.

- **The Section 10.7 manual checklist.** Emoji rendering per platform, share
  sheet behaviour per platform, and layout on the smallest supported viewport
  are written down nowhere. The daily card adds a second block shape to check.

## Logged in Phase 10

- **A tutorial board for POKER GRID.** Charter decision 2 says the first
  session is a fixed easy board played before the first real puzzle, and the
  contract carries the `firstSessionPuzzle` seam for it. POKER GRID does not
  implement it, so the `TUTORIAL` lifecycle state is unreachable today and a
  first time player gets the help panel opened automatically instead, which
  satisfies requirement 3.7.1 but not the difficulty override of 3.7.3.
- **Per game builds as a deploy path.** Superseded by the one pass release
  build. `GAME=<id> vite build` remains, emits to `dist-dev/`, and is a
  development convenience only. See the Build model.
- **`ui/countdown.ts` and `engine/scheduler.ts` both count down.** The hub uses
  the presentation view and the shell's end screen uses the engine class,
  because only the latter detects a rollover by comparing day numbers. Two
  mechanisms for one job. Not merged here because the merge belongs with the
  service worker work, where the offline and rollover paths are decided
  together.
- **Archive paging.** `archiveList` takes a limit and an offset and the shell
  asks for the most recent sixty and never pages. Fine at day 251 and wrong at
  day 900.
- **A shared cross promotion component.** The hub and the end screen both
  render a game's name and path, in two places, from the same registry entry.
  Worth extracting at game three, not at game one.

## Logged in the Phase 8 remainder

- **A visible update prompt.** The worker does not call `skipWaiting`, so a new
  deploy takes effect on the next navigation and the player is never told. A
  prompt is a product decision and it is not version 1's.
- **Precaching the current manifest chunk on install.** The chunk is warmed by
  the lookahead prefetch instead, which runs when the browser is idle. Adding it
  to the install list would put several hundred kilobytes in front of the first
  interaction on a first visit, which is the exact trade constraint 2.7 forbids.
- **A cross platform build id.** The id is a hash of the emitted asset names, so
  it is stable across machines only as far as the bundle itself is. That holds
  today and would stop holding if a build ever emitted a machine dependent name.
- **Warming more than the current chunk on a first visit.** The tutorial warms
  the chunk holding today plus the lookahead and nothing beyond it, so a player
  who goes offline and stays offline past a month boundary loses the day. The
  fix is a second chunk in the prefetch, and it costs bytes on a first visit,
  which is the trade this phase spent its budget avoiding.
- **A skeleton board while the manifest chunk loads.** Constraint 2.7's "first
  input must never wait on network" is literally violated on a first ever
  visit, because a board cannot be drawn before its cards arrive. Every later
  visit reads the chunk from the service worker cache instead. A disabled
  skeleton would be a picture of a game rather than a game, so it is logged
  rather than built.
- **A tutorial board for the other four games.** POKER GRID has one and the
  seam is proven. Each new game supplies its own or leaves `firstSessionPuzzle`
  undefined, which falls back to the help panel over today's board.

## Logged in Phase 11

## Logged in Phase 12

- **A shared non grid keyboard cursor.** The scaffold keeps custom keyboard
  behavior inside each renderer because the contract deliberately leaves that
  model to the game until a second real non grid game proves the abstraction.
- **Generated game manifest data.** The scaffold emits no horizon because
  puzzle generation and separate verification belong to the author after the
  rules are replaced. The generated module remains unrated past a valid
  horizon.

- **CIPHER band supply past about five years.** Saturday's band holds 265
  eligible codes and spends 52 a year, so a horizon beyond roughly five years
  either repeats a code or needs a second opening. Not solved now because the
  manifest horizon is 365 days and a repeat five years apart is invisible to a
  player.
- **A shared list cursor in Layer 2.** Phase 11 defect 3's correction was to
  document that `custom` input owns its own keyboard. CIPHER's forty lines are
  one example, and an abstraction drawn from one example is the more expensive
  mistake. Revisit at game three if VECTOR or TALLY DROP wants the same thing.
- **A CIPHER tutorial code.** `firstSessionPuzzle` is unimplemented, so a first
  time player gets the help panel over today's real code. The seam is proven by
  POKER GRID and each new game either supplies one or does not.
- **A scheduled shape lever for CIPHER.** Measured out in Phase 11: four of the
  seven weekday pairings hold fewer codes than a year spends and one holds none.
  The shape is recorded instead. A schedule becomes available again if the
  opening ever changes, since the classes would move with it.
- **The `fresh-shapes` lever.** Named in the plan, cut from the vocabulary
  because it constrains a day against its neighbour rather than against itself,
  which the per day generation loop has no place to check.
- **A second CIPHER opening as a difficulty lever.** The whole difficulty scale
  is a property of the one fixed opening. Rotating it yearly would widen the
  bands, and it would also invalidate every stored difficulty, so it is a
  migration rather than a knob.
