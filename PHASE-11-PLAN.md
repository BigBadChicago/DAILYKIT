# PHASE 11 PLAN, CIPHER AND THE ABSTRACTION TEST

Section 7.4. Game two is built under a hard rule: **zero changes to engine
source**. Every change wanted is logged as an architecture defect, reported at
the end of the phase, then corrected, and both games rebuilt against the
corrected contract.

Read this plus `ARCHITECTURE.md`, `BACKLOG.md` and `SLATE.md`. Nothing else.

## 0. How to use the predictions in Section 4

Section 4 predicts six defects. They are **hypotheses, not permissions.** The
build still runs under the zero changes rule and each prediction is confirmed
only by actually hitting it. A predicted defect that never bites is struck from
the report, and a defect that was not predicted matters more than one that was,
because it is the one the architecture did not see coming. Writing the
predictions down in advance is what makes that distinction possible; treating
them as a pre approved change list would make the test worthless.

## 1. CIPHER, settled in advance

The one sentence rule, from `SLATE.md`: break a four symbol code in six guesses
from the counts of exact and misplaced matches.

| Property | Value |
|---|---|
| Game id | `cipher` |
| Epoch | 2026-01-01, matching POKER GRID so puzzle numbers align |
| Code | Four symbols drawn from six geometric shapes, repeats allowed, 1,296 codes |
| Attempts | Six |
| Feedback | Count of exact matches, count of misplaced matches. Standard non double counting: exacts are removed first, then misplaced is a multiset intersection of the remainder |
| `hasWinLoss` | **true**, the first time in the project |
| Distribution | Seven buckets: solved in one through six, and failed |
| `archiveEnabled` | true |
| Input | `custom`, not `grid` |
| Accent hue | 268, already reserved in the registry |

### Rules decisions

1. **Feedback is two integers and never a per position mark.** A per position
   mark leaks which slot was right and turns six guesses into two.
2. **The shapes are the ones already in the share vocabulary's shape set**, drawn
   as SVG in the game's own renderer. They are not the share glyphs and must not
   be, because 8.1 forbids meaning by colour alone and the board needs shapes
   that read at 44 pixels.
3. **A guess is committed by an explicit submit**, never by filling the fourth
   slot. POKER GRID commits on the fifth card because a hand is a gesture;
   a code is a considered statement and an accidental submit costs a sixth of
   the game. This is a deliberate divergence and belongs in the design document.
4. **Failure reveals the code.** Pass or fail games that hide the answer produce
   no closure and no reason to open tomorrow.
5. **Tier from guess count**, not from a stored optimum: one or two guesses is
   Excellent, three Great, four Good, five Fair, six or failed Rough. This is
   the first game whose tier owes nothing to the manifest, which is Section 4's
   prediction 4.

### Generation and verification

- **Generation.** Seeded pick of a code from the 1,296, plus a lever. A lever is
  a structural property, for example exactly one repeated symbol, or no symbol
  shared with the previous day. Levers are recorded per entry as POKER GRID
  records its own, so difficulty can be audited later.
- **Verification, three assertions per day.** Run a Knuth style minimax solver
  from a fixed opening guess and assert:
  1. The code is deducible within six guesses. Solvability.
  2. The optimal line needs at least four guesses. This is the fairness floor;
     without it a generator ships days that fall out in two.
  3. The count of codes still consistent after the fixed opening falls inside a
     weekday band. This is the difficulty measure, it is an integer, so
     verification reproduces it exactly rather than within a tolerance.
- **Cost.** 1,296 codes against 1,296 guesses is under two million comparisons
  per day, so a full year verifies in seconds. There is no beam anywhere and no
  score is labelled best known.

### Share block

One row per guess, four cells, using `best` for each exact match, `partial` for
each misplaced match, and `miss` for the rest, **sorted** so position never
leaks. Six rows maximum, inside `SHARE_MAX_ROWS`. Title carries game name,
puzzle number and tier. Eight lines at worst including the URL.

The daily card needs nothing new: it reads `FinishedOutcome.tier`.

## 2. Files to produce

```
src/games/cipher/
  module.ts       GameModule implementation, the only export the shell sees
  rules.ts        Pure: apply a guess, score feedback, terminal detection
  generator.ts    Seeded code construction and the lever schedule
  solver.ts       Knuth style minimax, used by the tools and by verification
  render.ts       Play area only: slots, shape palette, guess history
  style.css       Accent and board typography
  help.ts         Worked micro example
src/shell/entries/cipher.ts     The one file that names the game
src/shell/entries/cipher.html
tools/cipher-generate.ts
tools/cipher-verify.ts
data/cipher/manifest.*.json
tests/games/cipher/*.test.ts
CIPHER.md         Design document, the equivalent of POKER-GRID.md
```

Plus one line added to `src/shell/registry.ts` changing `status` to `live`, and
one line in `vite.config.ts`'s allow list. Those two are configuration, not
engine source, and do not count against the zero changes rule.

## 3. Order of work

1. `CIPHER.md`, the design document. Rules text, feedback algorithm with worked
   examples including the repeated symbol case that catches every Mastermind
   implementation, tier mapping, share layout for a one guess solve, a six guess
   solve and a failure.
2. `rules.ts` and `solver.ts`, headless, fully tested. The game must be playable
   through a Node script before a browser sees it, as POKER GRID was.
3. `generator.ts`, then the tools, then a 365 day manifest verified in CI.
4. `module.ts` against the contract.
5. `render.ts` and the entry files. First playable.
6. The defect report. Section 5.
7. Engine corrections, then rebuild POKER GRID and CIPHER against the corrected
   contract and re-run both test suites.

Steps 1 through 5 touch no engine file. If a step cannot be finished without
one, that is the finding, and the workaround goes in the game with a comment
naming the defect.

## 4. Predicted defects, to be confirmed or struck

CIPHER was chosen as game two because it differs from POKER GRID on every axis
the contract touches. These are where that difference is expected to bite.

1. **`ManifestDescriptor.granularity` is `"month"` and nothing else.** A year of
   CIPHER codes is a few kilobytes and wants one file. Monthly chunking is a
   POKER GRID sized decision that reached the contract. Expected fix: granularity
   becomes `"month" | "year"`, or the descriptor exposes a chunk resolver and
   drops the enum.
2. **Manifest obfuscation is a game's problem, and it is the same problem every
   time.** Requirement 8.4 applies to every game, and today it lives in
   `games/poker-grid/manifest-codec.ts`. CIPHER either copies forty lines, which
   will drift, or the codec moves to Layer 1 keyed by game id and puzzle number.
3. **`InputDescriptor`'s `custom` variant promises keyboard support the kit
   cannot supply.** `ui/gridCursor.ts` serves a lattice. CIPHER needs focus
   across six palette buttons and four slots, which is a list, not a grid. Either
   Layer 2 grows a generic cursor or `custom` means the game does all of its own
   accessibility, which weakens what the contract claims to give a new game.
4. **The shell blanks a tier that did not come from the manifest.**
   `main.ts` computes `tier: session.rated ? outcome.tier : null`, which assumes
   a tier is derived from stored data. CIPHER's tier is derived from guess count
   and is perfectly valid past the manifest horizon. As written, a CIPHER game
   played beyond the horizon would be shown as unrated for no reason. Expected
   fix: the module declares whether its tier depends on the manifest, or the
   shell stops second guessing a value the module already returned.
5. **`hasWinLoss: true` runs for the first time.** The win rate row, the win
   counter in `completeLive`, and the stats panel's suppression logic have never
   executed with a true value outside a unit test. Expect at least one wrong
   label rather than a structural defect.
6. **Archive replay needs puzzle mismatch detection** in `deserialize`, as
   POKER GRID has. If that is awkward to write a second time it is a sign the
   check belongs in the engine, since the engine already knows which puzzle it
   handed the module.

Two more things to watch that are not yet predictions: whether a six row share
block reveals a padding bug that POKER GRID's one glyph rows never hit, and
whether `firstSessionPuzzle` is natural to implement for CIPHER when POKER GRID
still has none.

## 5. The defect report

A section appended to `ARCHITECTURE.md`, matching the shape of the Phase 10
report already there. Per defect: what was wanted, why the game wanted it, what
was done instead to stay inside the rule, and the proposed correction. Then, for
the phase as a whole, the single sentence that matters: **could a new game have
been authored in one file plus assets, and if not, what was the cheapest change
that would have made it possible.**

## 6. Definition of done

- CIPHER playable end to end in a browser at 360 pixels, keyboard included.
- 365 day manifest generated and verified in CI, with all three assertions.
- Full test coverage of `rules.ts` including every rejection path, per Section
  10.1.
- Defect report written, engine corrected, both games rebuilt against the
  corrected contract, and both suites green.
- The hub shows two live games, cross promotion has something to offer for the
  first time, and the daily card renders two rows.
