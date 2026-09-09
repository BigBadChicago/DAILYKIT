# CIPHER, DESIGN DOCUMENT

Phase 11 deliverable one. The equivalent of `POKER-GRID.md` for game two.
Everything here follows from `SLATE.md` section 4 and `PHASE-11-PLAN.md`
section 1, both approved. Nothing in this document reopens either.

Read with `ARCHITECTURE.md`. Named constants that this document leaves
uncalibrated are marked **calibrated in the generation step**, which is the same
device `POKER-GRID.md` used for the scoring table before Phase 7 measured it.

## 1. Identity

| Property | Value |
|---|---|
| Game id | `cipher` |
| Display name | CIPHER |
| One sentence rule | Break a four symbol code in six guesses from exact and misplaced counts. |
| Epoch | 2026-01-05, the first Monday of the epoch year, so puzzle 1 lands in the gentlest band. Four days later than POKER GRID's |
| Accent hue | 268 |
| Session target | 90 seconds to two minutes |
| Core skill | Information economy, buying facts one attempt at a time |
| `hasWinLoss` | true, the first time in the project |
| `archiveEnabled` | true |
| `stateVersion` | 1 |
| Input | `custom` |

## 2. Rules text

The rules as a player reads them, and as the help panel states them.

1. A hidden code is four symbols long. Each symbol is one of six shapes.
2. A shape may appear more than once in the code, and every shape may be absent.
   There are 6^4, that is 1,296, possible codes.
3. You have six guesses. A guess is four shapes.
4. After each guess you are told two numbers: how many shapes are in the right
   place, and how many are the right shape in the wrong place.
5. You are never told which slot either number refers to.
6. Solve the code to win. Use all six guesses without solving it and the code is
   revealed.

## 3. The six shapes

Circle, square, triangle, diamond, hexagon, cross. Drawn as SVG by
`games/cipher/render.ts`, sized to a 44 by 44 pixel touch target per requirement
8.2, each with a distinct outline and a distinct fill so requirement 8.1 holds
with color removed entirely.

They are **not** the share vocabulary glyphs and must not be. The share glyphs
are five tier tokens with fixed meanings across the suite, and CIPHER needs six
symbols with no ranking between them. Reusing them would say that a circle beats
a triangle, which is true in a share block and false on this board.

Each shape carries a permanent index, 0 through 5, in the order above. That index
is what the code, every guess, the serialized state, and the manifest store. The
drawing is presentation and the index is data.

## 4. Feedback, exactly

The single algorithm most Mastermind implementations get wrong. Stated once
here, implemented once in `rules.ts`, and covered by the repeated symbol cases in
section 4.2.

### 4.1 The algorithm

```
score(code, guess):
  exact = count of positions i where guess[i] == code[i]
  remove every exact matched position from both sequences
  misplaced = sum over each shape s of
                min(count of s in the remaining code,
                    count of s in the remaining guess)
```

Exacts are removed first, then misplaced is a multiset intersection of what is
left. This is what stops a symbol being counted twice, and it is why
`exact + misplaced` is always at most four.

### 4.2 Worked examples

Shapes are written by index for precision. Code is fixed at `0 0 2 3` in the
first three examples.

| Guess | Exact | Misplaced | Why |
|---|---|---|---|
| `0 2 0 0` | 1 | 2 | Slot 1 is exact. Remaining code `0 2 3`, remaining guess `2 0 0`, so one 0 and one 2 intersect. The third 0 in the guess has nothing left to match. |
| `0 0 2 3` | 4 | 0 | Solved. |
| `3 3 3 3` | 1 | 0 | Slot 4 is exact. Remaining code holds no 3, so the other three guessed 3s score nothing. |
| Code `0 0 0 0`, guess `0 0 1 1` | 2 | 0 | Two exacts, and the remaining code is `0 0` against a remaining guess of `1 1`, which shares nothing. |
| Code `0 1 2 3`, guess `3 2 1 0` | 0 | 4 | Every shape present, none in place. |

The fourth row is the case a naive implementation reports as two exact and two
misplaced, by counting the leftover code 0s against guess symbols it already
consumed. The fifth row is the case an implementation that forgets to remove
exacts first reports correctly by luck.

### 4.3 What feedback is never allowed to be

Feedback is two integers and nothing else. No per slot mark, no ordering of the
two numbers against slots, no coloring of the guess row by slot. A per slot mark
leaks which position was right and collapses six guesses into two. This is
rules decision 1 of `PHASE-11-PLAN.md` and it is the reason the share block sorts
its cells, in section 10.

## 5. Actions, state, and rejections

### 5.1 State

```
CipherState = {
  draft:    (0..5 | null)[4]        the guess being composed
  guesses:  { code: [0..5 x4], exact: number, misplaced: number }[]
  solved:   boolean
}
```

The draft is part of state, not of the renderer, because requirement 3.3.3
requires in progress board state to survive a tab kill and a half typed guess is
the only in progress state CIPHER has.

### 5.2 Actions

| Action | Effect |
|---|---|
| `{ kind: "set", slot, symbol }` | Writes a shape into a slot. Overwrites whatever was there. |
| `{ kind: "clear", slot }` | Empties one slot. |
| `{ kind: "submit" }` | Scores the draft, appends it to `guesses`, empties the draft. |

`set` on a filled slot overwrites rather than being refused, because the
alternative makes a correction two taps and the board has no undo affordance.

### 5.3 Rejections, every path

| Code | Announce | When |
|---|---|---|
| `slot-range` | That slot does not exist. | slot outside 0 through 3 |
| `symbol-range` | That is not one of the six shapes. | symbol outside 0 through 5 |
| `incomplete` | Fill all four slots before you submit. | submit with any slot empty |
| `repeat-guess` | You have already tried that code. | submit of a code already in `guesses` |
| `game-over` | This puzzle is finished. | any action once solved or out of guesses |

`repeat-guess` is a deliberate divergence from Wordle, which permits a repeat.
A repeated code buys no information and spends a sixth of the game, so it is
always a mistake and never a strategy. Refusing it costs the player nothing that
they meant to do.

Submit is explicit and is never triggered by filling the fourth slot. Rules
decision 3.

## 6. Terminal conditions, score, and tier

A game is finished when the last guess scored four exact, which is a win, or
when six guesses have been made without one, which is a loss.

- `won` is true or false. CIPHER is the first module to set `hasWinLoss: true`,
  so the win rate row of requirement 3.4 renders for the first time.
- `score` is the count of guesses used, 1 through 6, on a win, and 0 on a loss.
  Lower is better on a win, which is why the end screen shows the guess count and
  the tier rather than the number called score.
- `detail` is `Solved in 3` or `Not solved. The code was ...`.

### 6.1 Tier

From guess count alone, never from a stored optimum:

| Guesses | Tier |
|---|---|
| 1 or 2 | Excellent |
| 3 | Great |
| 4 | Good |
| 5 | Fair |
| 6, or not solved | Rough |

One and two share a tier because the fairness floor in section 8 guarantees the
optimal line needs at least four guesses, so a solve in one or two is luck, and
luck should not be a band of its own.

**This is the first tier in the suite that owes nothing to the manifest.** It is
correct past the manifest horizon, which is where predicted defect 4 bites.
Section 12.

### 6.2 Distribution

Seven buckets, matching the registry's `bucketCount: 7`:

```
["1 guess", "2 guesses", "3 guesses", "4 guesses", "5 guesses", "6 guesses", "Not solved"]
distinguishedIndex: 0
```

`bucketOf` returns `guesses - 1` on a win and 6 on a loss.

## 7. Generation

A day's puzzle is a code and a lever record. Both derive from
`seed(gameId, puzzleNumber, salt)` so an offline client past the horizon
reproduces attempt 0 exactly, which is the property generation decision 10 gives
POKER GRID.

**The shape lever, recorded rather than scheduled.** Every code has exactly one
repetition shape, and a day records the one it drew:

| Lever | Shape |
|---|---|
| `all-distinct` | Four different symbols |
| `one-pair` | Exactly one symbol twice |
| `two-pairs` | Two symbols twice each |
| `triple` | One symbol three or four times |

The plan proposed scheduling a shape per weekday on top of the difficulty band.
Measurement refused it. See section 8.2: four of the seven pairings hold fewer
than the 52 codes a year needs and one holds none at all, so a scheduled shape
would either break the band or break the calendar. The band carries the
difficulty curve, and the lever is what an audit reads afterwards, which is what
requirement 6.3.6 asks of POKER GRID's levers as well.

**Uniqueness.** No code repeats inside a horizon. Two days with the same answer
is visible to anyone who opens the archive, and the thinnest band still holds 73
codes against 52 days.

## 8. Verification, three assertions per day

Run by `tools/cipher-verify.ts` in CI, against a Knuth style minimax solver in
`games/cipher/solver.ts` that always opens with the same fixed guess.

1. **Solvable.** The solver's line from the fixed opening reaches the code within
   six guesses. This can only fail on a bug, and it is asserted anyway, because a
   verification that only checks the interesting property has nothing to say when
   the boring one breaks.
2. **Fairness floor.** That line needs at least four guesses. Without this the
   generator ships days that fall out in two, which reads as a broken game rather
   than an easy one.
3. **Difficulty band.** The count of codes still consistent with the feedback
   from the fixed opening guess falls inside a weekday band. It is an integer, so
   verification reproduces it exactly rather than within a tolerance that could
   hide a drift. Same property as generation decision 12.

**The fixed opening** is a named constant, `OPENING_GUESS`, set to a code with
one repeated shape, which is the shape of opening that partitions the space best
in the four by six game. Its value is fixed before the horizon is generated and
changing it later invalidates every stored difficulty, which is stated in the
code beside it.

**Bands run Monday gentle to Saturday hard, Sunday between Thursday and Friday**,
matching the curve players already read on POKER GRID. The band edges are
**calibrated in the generation step** from the measured distribution of remaining
set sizes across all 1,296 codes, and recorded in `ARCHITECTURE.md` under
generation decisions when they are.

### 8.1 What the measurement found

`tools/cipher-study.ts` ran the solver over all 1,296 codes against the fixed
opening. Checked in at `data/cipher/study.json`.

**Line length.** 1 code solves on the opening, 8 in two, 66 in three, 521 in
four, 696 in five, 4 in six. The fairness floor of at least four therefore
admits **1,221 codes, 94 percent of the space**, so regeneration under a salt
almost never runs. Knuth's bound of five holds except for four codes, which the
tie break rules in `solver.ts` cost one extra guess.

**Consistent set size, and a problem with assertion 3 as written.** The opening
partitions the space into **fourteen classes**, so the difficulty integer takes
only fourteen distinct values, and they are heavily bunched: 5, 20, 40, 44, 81,
84, 105, 182, 222, 230, 276, plus three classes of five codes or fewer that the
fairness floor removes entirely. Bands admitting "roughly a fifth of candidates"
each, as POKER GRID's do, cannot be built on that, because the top two values
alone hold 40 percent of the space.

The measure is still the right one. What changes is that a **band is a set of
classes**, not a numeric window sized to a share of the distribution. The
proposed schedule, with the eligible count in each:

| Weekday | Remaining after opening | Eligible codes |
|---|---|---|
| Monday | 44 or fewer | 93 |
| Tuesday | 81 | 73 |
| Wednesday | 84 | 78 |
| Thursday | 105 | 98 |
| Sunday | 182 | 178 |
| Friday | 222 or 230 | 436 |
| Saturday | 276 | 265 |

Gentle Monday to hard Saturday with Sunday between Thursday and Friday, matching
the curve POKER GRID already sets. Every band holds more than the 52 days a year
asks of it, and larger classes carry longer solver lines, so the ordering is a
difficulty ordering and not just a size ordering.

### 8.2 Why the shape lever is not scheduled

Eligible codes, meaning line length at least four, counted per shape per class:

| Class | all-distinct | one-pair | two-pairs | triple |
|---|---|---|---|---|
| 44 or fewer, Monday | 39 | 44 | 7 | 3 |
| 81, Tuesday | 0 | 35 | 15 | 21 |
| 84, Wednesday | 30 | 40 | 4 | 4 |
| 105, Thursday | 28 | 53 | 5 | 11 |
| 182, Sunday | 23 | 105 | 18 | 30 |
| 222 and 230, Friday | 180 | 221 | 19 | 16 |
| 276, Saturday | 46 | 172 | 18 | 29 |

A weekday spends 52 codes a year. Only the `one-pair` column clears that on
every row, and Tuesday has no all distinct codes at all, because a code in that
class shares enough with the repeated opening that it must repeat a symbol
itself. Scheduling a shape per weekday therefore either empties a day or forces
the band open. The band wins, because it is the measure verification can
reproduce exactly.

**Cost.** 1,296 codes against 1,296 candidate guesses is under two million
feedback evaluations per solver ply, so a full year verifies in seconds. There is
no beam anywhere, no search ceiling, and no score is ever labelled best known.
CIPHER's manifest makes stronger claims than POKER GRID's.

## 9. Manifest and serialization

### 9.1 Manifest

`data/cipher/manifest.index.json` names the horizon, the codec, the fixed
opening, and one chunk. `data/cipher/manifest.horizon.json` holds all 365 days in
36 kilobytes. The chunk is named for the span it covers rather than a calendar
year, because a horizon starting on 5 January runs four days into the following
one. An entry carries the obfuscated code, the recorded lever, the
difficulty and line length under `best`, and the attempt it was drawn on, so
verification regenerates it from the seed it claims.

Two contract frictions show up here, both recorded rather than fixed:

- The descriptor admits only monthly granularity, so `urlForChunk` returns the
  same year file for every day and `granularity` states a chunking the data
  does not have. Predicted defect 1.
- `src/shell/boot.ts` looks for a `boards` array whose entries carry a `number`
  field, so CIPHER's chunk uses the key `boards` for a game with no board. That
  is the engine knowing a chunk's internal shape, and it was not predicted.
  Section 12.

Entries are obfuscated per requirement 8.4, at the same strength and with the
same honesty as POKER GRID's: a per puzzle keystream, stated plainly in the code
as obfuscation and never described as security. That the codec is a second copy
of forty lines is predicted defect 2.

### 9.2 Serialization

```
{ v: 1, data: { d: "..0.", g: ["0012", "3345", ...] } }
```

The draft is four characters, a digit or a dot. Each guess is four digits.
**Feedback is not stored.** It is recomputed from the puzzle's code on
`deserialize`, which makes the payload smaller and, more importantly, makes a
stored feedback pair that disagrees with the code impossible rather than
undetectable.

`deserialize` validates shape, range, and count, and rejects anything else as
`malformed`. It **cannot** detect a puzzle mismatch, because every four symbol
guess is legal against every code, so a save from yesterday deserializes cleanly
against today's puzzle and shows a player feedback that never happened. POKER
GRID detects this itself by checking the board's cards against the puzzle.
CIPHER structurally cannot. That is predicted defect 6, and it is the strongest
of the six, because it is the engine already knowing which puzzle it handed the
module and declining to say so.

## 10. Share block

One row per guess, four cells, from the tier vocabulary:

- `best` for each exact match
- `partial` for each misplaced match
- `miss` for the rest

**Cells are sorted**, all `best` first, then `partial`, then `miss`. Sorting is
what keeps rules decision 1 true in the share block: an unsorted row would leak
which slots were right to anyone holding the same day's puzzle.

Six rows maximum against `SHARE_MAX_ROWS` of eight, plus a title and a URL, so
eight lines at worst. The engine pads to the widest row in the block, and every
row here is four cells, so no padding occurs.

### 10.1 Worked examples

A three guess solve, tier Great:

```
CIPHER 251 Great
🔻🔻🔻🔻
⭐🟩🔻🔻
⭐⭐⭐⭐
dailykit.providentia.games
```

A six guess solve with a streak, tier Rough:

```
CIPHER 251 Rough, streak 12
🔻🔻🔻🔻
🟩🟩🔻🔻
⭐🟩🔻🔻
⭐🟩🟩🔻
⭐⭐🟩🔻
⭐⭐⭐⭐
dailykit.providentia.games
```

A failure, tier Rough:

```
CIPHER 251 Rough
🟩🔻🔻🔻
⭐🔻🔻🔻
⭐🟩🔻🔻
⭐🟩🟩🔻
⭐⭐🔻🔻
⭐⭐🟩🔻
dailykit.providentia.games
```

A win and a loss can both read Rough and both look like six rows. They are
distinguished by the last row, which is four stars on a win and never four stars
on a loss. That is enough, and adding a seventh summary row to say it in words
would spend a line to restate what the block already shows.

The daily card needs nothing new. It reads `FinishedOutcome.tier`, which CIPHER
supplies.

## 11. Input and accessibility

`InputDescriptor` is `custom`, with `pointer: "tap"` and declared keys
`1` through `6`, `Backspace`, `Enter`, `ArrowLeft`, `ArrowRight`.

- Tap a shape in the palette to fill the leftmost empty slot. Tap a filled slot
  to clear it.
- `1` through `6` place a shape at the cursor slot and advance. `Backspace`
  clears and steps back. `Enter` submits. Arrows move the cursor.
- The guess history is a list with one row per guess, each row carrying a text
  equivalent of its feedback, so a screen reader reads "two exact, one misplaced"
  rather than four shape names.
- Every state change announces through `MountContext.announce`.

`ui/gridCursor.ts` serves a lattice and CIPHER's focus model is a palette of six
plus a row of four, which is two lists rather than a grid. What that costs is
predicted defect 3. Section 12.

## 12. Where this design meets the contract, and where it does not

Written before implementation, as a prediction to be confirmed or struck. The
zero changes rule of section 7.4 stands: each of these is confirmed only by
actually hitting it during the build, and the workaround named here is what the
game does instead.

| # | Defect | Workaround inside the rule |
|---|---|---|
| 1 | `ManifestDescriptor.granularity` admits only `"month"` | `urlForChunk` returns the same single year file for every puzzle number, and `granularity` states a chunking the data does not have |
| 2 | Obfuscation lives in a game, and is the same problem for every game | Copy the codec into `games/cipher/manifest-codec.ts` with a comment naming the defect |
| 3 | **Confirmed.** `custom` input promises keyboard support Layer 2 cannot supply | `render.ts` carries its own cursor, digit keys, backspace, arrows, and Enter, about forty lines that every later non grid game will write again |
| 4 | The shell blanks a tier that did not come from the manifest | The module writes the tier name into its own share title, which the shell does not touch. The daily card row is still neutral past the horizon |
| 5 | `hasWinLoss: true` has never run | Nothing to work around. Expect a wrong label rather than a structural defect |
| 6 | `deserialize` cannot detect a puzzle mismatch | None available. CIPHER accepts the stale save risk and the defect report proposes the engine check |
| 7 | **Not predicted.** `src/shell/boot.ts` requires a chunk to hold `boards: [{ number, ... }]`, which is POKER GRID's vocabulary and shape reaching into the shell | CIPHER names its entry array `boards`. Proposed correction: the engine looks up an entry by puzzle number under a neutral key, or the module supplies the lookup |

## 13. Files

```
CIPHER.md                        this document
src/games/cipher/rules.ts        feedback, apply, terminal, rejections
src/games/cipher/solver.ts       Knuth style minimax from a fixed opening
src/games/cipher/generator.ts    seeded code construction and the lever schedule
src/games/cipher/manifest-codec.ts
src/games/cipher/module.ts       the GameModule implementation
src/games/cipher/render.ts       palette, slots, guess history
src/games/cipher/style.css
src/games/cipher/help.ts
src/shell/entries/cipher.ts
src/shell/entries/cipher.html
tools/cipher-generate.ts
tools/cipher-verify.ts
data/cipher/manifest.index.json
data/cipher/manifest.horizon.json
tests/games/cipher/*.test.ts
```

Plus `status: "live"` in `src/shell/registry.ts` and one line in the
`vite.config.ts` allow list, which are configuration and do not count against the
zero changes rule.
