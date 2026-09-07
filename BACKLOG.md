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
