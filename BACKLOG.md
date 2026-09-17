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

## Logged in the v3 migration, phase 2

- **The section 19 archetype for VECTOR.** The effort record now carries the
  correction and exploration axes an archetype table would read, but thresholds
  drawn from one game are thresholds fitted to one game. Revisit once CIPHER is
  on v3 and there are two run shapes to compare. **Unblocked 2026-09-13** by
  phase 3, which gave CIPHER a discipline grade and a churn count. Two shapes
  now exist, so the table is buildable for the first time; it is still not
  built, because it is a feature rather than a migration step. Phase 4 made it
  three, adding POKER GRID's rework depth and correction count.
- **The graphic card renderer.** ARCHITECTURE2 section 17.1 specifies a 1200 by
  900 card from the same ArtifactModel. Phase 1 built the text renderer only and
  no game has a card, so this is suite work rather than VECTOR work.
- **A shared effort record across games.** VECTOR counts accepted actions and
  corrections in its own state. If CIPHER and POKER GRID end up counting the
  same two things, the record belongs in the engine, and if they do not, this
  stays a game concern. One example is not a pattern, which is the same rule
  that left the list cursor unbuilt in Phase 11. **Answered for CIPHER
  2026-09-13:** it counts nothing in its state. Its run is derived from a guess
  history it already had, so the two games do not share a shape and the record
  stays a game concern. POKER GRID in phase 4 is the last chance for this to
  become a pattern. **Answered 2026-09-16, and the answer is no.** POKER GRID
  counts accepted taps and takebacks per hand, VECTOR counts accepted edits and
  overwrites per submission, and CIPHER counts nothing at all. Two of the three
  count two things each and the two pairs are not the same pair, so the record
  stays a game concern and the engine gains nothing. Closed.

## Logged in the v3 migration, phase 3

- **The manifest's `best.remaining` is now redundant for the browser.** The
  module recomputes the difficulty in under a millisecond, so the stored value
  is read by nobody at runtime. It stays because verification compares against
  it and because dropping a field from a shipped manifest is a regeneration, not
  an edit. Revisit when the manifest is next regenerated for another reason.
- **`solver.ts` still owns a 1.7 megabyte table that only Node needs.** The
  browser side of the difficulty measure is extracted, but the file remains a
  Node only module that the module must remember not to import. A lint rule
  naming Node only game files would enforce what a comment currently asks for.
  Logged rather than built, because one file in three games is not a pattern.

## Logged in the v3 migration, phase 4

- **`exceededStoredBest` is gone and the fact behind it is not.** The field was
  written by nobody and read by nobody, so it was removed inside the state
  version 2 bump. What it was evidently for is real: `best.method` can be `beam`
  and a bounded search can be beaten by a human, which `tierFor` already handles
  by clamping quality at 1 and returning tier 0. Telling the player they beat the
  best known line is a product decision and it is not version 1's. Re-adding it
  is another state version bump.
- **The greedy replay costs tens of milliseconds and is memoized on one entry.**
  `inspect` short circuits on a board that is not terminal, so the replay only
  runs at the end of a game, but the end screen, the share and the stats panel
  each ask again. One entry keyed on the puzzle object is enough while only one
  board is ever open. If archive replay ever runs two boards at once, this
  becomes a small cache rather than a slot.
- **POKER GRID's difficulty is the only one that reads anything.** The greedy
  numerator is measured on device and the `best.score` denominator is read from
  the manifest, because a width 400 beam is not phone work. A measure that needs
  no solver exists in principle and would invalidate every stored band and mean
  regenerating the horizon, which is a rewrite rather than a migration and is
  refused under section 47. Revisit only if the horizon is being regenerated for
  another reason.
- **`data/poker-grid` stores `difficulty` as a six place fraction.** The v3
  integer is basis points, so the verifier compares them with a tolerance of one
  basis point, which is the rounding and not a drift. Storing the integer instead
  would remove the tolerance and it is a manifest regeneration, so it waits for
  one.

## Logged in the v3 migration, phase 5

- **The fixture page cannot boot.** `bootGame` throws when a game has no
  registry entry, and `toy-v3` has none, exactly as `toy-tap` had none since
  Phase 10. The fixture is proven by typecheck, tests and a development build,
  not by a page. Giving it a registry row would put it on the hub; teaching the
  shell to mount an unregistered game is a shell feature for a page nobody
  opens. Logged rather than built.
- **How a partial daily card row reads.** A ninth suite game wraps into a
  second row shorter than the first, which the grammar refuses as ragged.
  `dailycard.test.ts` fails on the day the registry reaches nine, which is when
  this is decided.
- **A share defect is repaired silently to the player.** `composeResultShare`
  returns the fault and the shell delivers the repaired string without saying
  so, as engine decision 21 always did. The fault reaches only the no operation
  analytics seam, so in version 1 nobody learns of it outside a test.

## Logged in the v3 migration, phase 5 part B

- **Decomposition and symmetry checkers for the three live games.** Recorded
  `n/a` with a reason. Writing them means designing a section 12 check for a
  concept that shipped before section 12, which is a design task per game rather
  than a gate task.
- **Offline smoke in CI.** A recorded manual result for now. Automating it needs
  Playwright and a browser in CI, which is a build time dependency change and
  goes through constraint 2.3 first.
- **Run MANUAL-CHECKS.md once.** The exemption for the manual mobile check
  expires 2026-12-15. After that date `certify --check` fails and a release build
  leaves out all three live games, by design.
- **The POKER GRID and CIPHER horizons end with 2026.** Both start at puzzle 1
  on a 2026 epoch and hold 365 days, so from early January 2027 every day is
  generated and unrated. The gate checks at least 365 days exist, not that they
  still cover today. A horizon extension and a gate step for remaining days
  belong together.
- **`certifiedCommit` names the parent commit.** A record cannot name the commit
  that contains it, so it names HEAD when the outcomes were produced. Accepted.
- **A release build that drops a live game still deploys a hub linking to it.**
  The warning and the failing certify step are the defence. Making the hub read
  release status would couple the registry to the build.

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


## Logged in Phase 13

- **A grid game that declares extra pass through keys.** VECTOR predicted defect
  1: a grid cell has one activation verb, so a forward cycle is the only tap and
  there is no backward turn. VECTOR lives with it, wrapping through empty. The
  correction, letting a grid game name extra keys the cursor passes through
  untouched, waits for a second game that wants a second verb, because an
  abstraction drawn from one example is the more expensive mistake.
- **A direction on `FinishedOutcome.score`.** VECTOR predicted defect 2: score
  means lower is better in VECTOR and CIPHER and higher in POKER GRID, with
  nothing in the type saying which. It is safe today because the field is module
  private and no suite level code compares it across games. If a suite feature
  ever needs to, the field carries a direction or the comparison is refused.

## Logged in the v3 migration

- **SLATE.md's five are superseded for new builds.** The v3 adoption switched the
  build slate to the design review's recommended pool: DIFFERENCE RELAY, TURN
  TABLE, RING BALANCE, ORDER OF OPERATIONS, ROTATE LOCK. POKER GRID, CIPHER and
  VECTOR stay live as legacy modules and are migrated to the v3 contract rather
  than dropped. TALLY DROP and RECALL from the old slate are not built; they can
  return to the pool if a later review wants them.
- ~~**VECTOR overlaps VECTOR LOCK.**~~ Closed 2026-09-13. The game was renamed
  ROTATE LOCK and ships alongside VECTOR under composition A. The ids `vector`
  and `rotate-lock` never collided; the name did.
- **Requirement 7.1.1 is not satisfied by the eight game suite.** Accepted as a
  deviation on 2026-09-13 when composition A was approved, and recorded here so
  it is a decision rather than an oversight. DIFFERENCE RELAY, RING BALANCE and
  ORDER OF OPERATIONS are all order a permutation under constraints, verified by
  permutation enumeration. TURN TABLE and ROTATE LOCK are both rotate route
  pieces under checkpoints. So the five new games exercise two cognitive modes,
  and across all eight the suite has no categorization game and no pattern or
  memory game, the latter because RECALL covered it and was cancelled. The pool
  concepts that would close the gap if a later review wants them: THREE-WAY SPLIT
  for categorization by partition, SHADOW LEDGER for visibility deduction, WORD
  WEAVE for a word graph, PRIME PAIRING for matching. Substituting one is an edit
  to `src/shell/registry.ts` and nothing else while the game is unbuilt.
- ~~**The daily card exceeds the v3 share height at seven and eight finished
  games.**~~ Closed 2026-09-13. Resolved by making the card one glyph per game
  rather than a five cell meter per game, which puts a fully finished eight game
  suite at three lines against a nine line cap. Suite decision 3 in
  ARCHITECTURE.md carries the amendment. Capping at seven finishes and
  truncating with the engine decision 21 fault were both rejected, because each
  discards a result the player earned.
- **The `unused` and `ungraded` glyphs are unaudited.** `unused` is a black
  square that is close to invisible on a dark chat background, and `ungraded` is
  new. Both now appear in a shared artifact rather than only in padding. Add
  them to the Section 10.7 per platform pass and swap either one that renders as
  text or disappears.
- **Registry order among the five planned games is arbitrary.** The list is meant
  to run longest session to shortest and no design document states a session
  length for any of them yet. Re sort as each one is written.
- **Fold `src/contract/v3/` back into `src/contract/`.** Logged in v3 migration
  phase 6, when v2 was deleted and the folder name stopped distinguishing
  anything. Cosmetic, and it touches the import line of every game, the shell,
  the tools and the tests, so it is its own change rather than part of a
  deletion.
- **Remove the v2 outcome types and drop the V3 suffix.** Logged in v3 migration
  phase 6. `Outcome` and `FinishedOutcome` in `src/core/types.ts` are read by
  nothing in src once the scaffold writes `OutcomeV3`. Renaming `OutcomeV3`,
  `FinishedOutcomeV3`, `GameModuleV3` and `defineGameV3` to plain names is a
  mechanical rename across every game and test with no behavior in it, so it
  waits for a phase with nothing else in flight.

## Logged in charter Phase 13, ROTATE LOCK

- **No game renders its own accent.** Found by the 360 pixel smoke. `theme.ts`
  `applyAccent` sets `--dk-accent-hue` on the game root, but `--dk-accent` and
  `--dk-focus` are declared on `:root` in `chrome.css`, where `var()` resolves
  against the root's hue, 210, and children inherit that computed colour. So
  POKER GRID, CIPHER, VECTOR and ROTATE LOCK all draw blue. Requirement 7.3.8.
  Engine defect 1 of the ROTATE LOCK report; the correction redeclares the
  accent colours on the element that receives the hue, and is owed before the
  next game, per requirement 7.4.
- **The header truncates a two word name at 360 pixels.** ROTATE LOCK reads
  "ROTATE ..." in the chrome header beside its four icons. DIFFERENCE RELAY and
  ORDER OF OPERATIONS are longer. Engine defect 2 of the report.
- **A list cursor for ORDER games.** ARCHITECTURE2 section 21 names an ORDER
  adapter as reusable, and none exists in `src/ui/`. ROTATE LOCK wrote its own
  roving focus, select and swap keyboard model, the second custom list model
  after CIPHER's. Two examples now; DIFFERENCE RELAY, RING BALANCE and ORDER OF
  OPERATIONS are all ORDER games, so the third would be copying. Engine defect 3.
- **A counterclockwise rotation in ROTATE LOCK.** A piece that needs a quarter
  turn left costs three moves. Par counts it the same way, so the tier is fair,
  but it may read as busywork. A rule change that lowers every par, so it waits
  for the manual mobile check. ROTATE-LOCK.md risk 2.
- **The registry agreement test has no loop for a built but planned game.**
  ROTATE LOCK got its own test beside the live loop. When the second new game is
  built the two should become one loop over built modules with status checked
  separately.
- **ROTATE LOCK's manual mobile check.** The gate's only refusal for it. With the
  registry row set live in a copy of the tree, every automated probe passed and
  the stub's empty `manual-mobile-check` refused, which also fails the certify
  test that every live plan is passable, so the row stays planned. Run
  MANUAL-CHECKS.md for ROTATE LOCK on devices, record it as a `manual` step in
  its `GAME_PLANS` row, flip the row to live and commit the record.
- The **`unused` glyph** item above now has a second reason: ROTATE LOCK is the
  first game whose ordinary result, any run over eight moves, shows it.
