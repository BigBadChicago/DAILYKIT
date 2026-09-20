# DAILYKIT ARCHITECTURE

Living architecture and file manifest for DailyKit, the static daily-puzzle suite at
`dailykit.providentia.games`.

This document is the binding implementation record for the engine, game contract,
puzzle-generation pipeline, verification pipeline, telemetry/artifact system, shell,
and repository structure. Update it whenever a file is added, removed, repurposed, or
a binding architectural decision changes.

The platform is a **static, deterministic daily-puzzle system**. The browser never
needs a server, account, database, leaderboard, live community feed, or network call
to determine today's puzzle or the outcome of a completed game.

The engine is deliberately generic. A game owns the puzzle definition, rules,
verification strategy, difficulty measure, renderer, and help content. The platform
owns the daily lifecycle, state persistence, streaks, statistics, manifest transport,
input plumbing where applicable, share delivery, token vocabulary, telemetry artifact
pipeline, theme/chrome, offline behavior, and certification gate.

---

## Status

| Field | Value |
|---|---|
| Current architecture generation | Rewrite for the 15-concept puzzle pool and the social-telemetry specification |
| Existing production games | POKER GRID, CIPHER, VECTOR |
| New concept pool | DIFFERENCE RELAY, TURN TABLE, RING BALANCE, INTERVAL PACK, CARD CASCADE, THREE-WAY SPLIT, ROTATE LOCK, DIVISIBLE FENCE, WORD WEAVE, PRIME PAIRING, SHADOW LEDGER, COVER CHARGE, PARITY PARADE, CROSS CURRENT, ORDER OF OPERATIONS |
| Recommended concepts from the design review | DIFFERENCE RELAY, TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, ROTATE LOCK |
| Engine contract | v3 target contract: deterministic puzzle, pure action transition, terminal result, telemetry artifact, share export, certification metadata |
| Daily content model | One deterministic puzzle definition per game/day, derived from that game's seed alone |
| Verification policy | Generation and verification are independent processes; exact verification required where the game's state space permits it |
| Difficulty policy | One emergent integer measure per game, measured by verification and mapped to seven weekly bands |
| Share policy | Maximum nine total lines including title and URL; maximum eight tokens per row; closed vetted token vocabulary |
| Network policy | No network dependency for puzzle identity, gameplay, result, telemetry mapping, or share generation |
| Storage policy | Small JSON snapshot for in-progress state; telemetry retained only when required for the local result artifact |
| Deployment | Cloudflare Pages at `dailykit.providentia.games` |
| Migration status | Phases 1 to 4 are done: the contract and engine seams, then VECTOR, CIPHER and POKER GRID, each implementing v2 and v3 at once. Phase 5 is done: part A moved the shell, the hub and the daily card to v3 with one share composer, and part B made the section 45 gate a CI job whose committed records decide which games a release contains. Phase 6 is done, 2026-09-17: the v2 contract is deleted, every game's default export is its v3 module, and the scaffold writes v3 and a certification plan row. Charter Phase 13, 2026-09-17: ROTATE LOCK, the first new game on v3, is built and verified, and stays planned until its manual mobile check (section 56) |
| Chosen lineup | Approved 2026-09-13: the five recommended concepts become the new build slate, DIFFERENCE RELAY, TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, ROTATE LOCK. This supersedes SLATE.md's five for new work; the three legacy games stay live. Composition A approved the same day: the suite is eight games, not five, and TALLY DROP and RECALL are cancelled. ROTATE LOCK was named VECTOR LOCK until the rename that removed the collision with the shipped VECTOR. Carried into `src/shell/registry.ts`, section 56. **Amended 2026-09-19 by the owner:** four word games, LETTER TRAIL, WORD LADDER, PANGRAM and FIVE LETTERS, are the next four built, in that order, ahead of TURN TABLE, RING BALANCE and ORDER OF OPERATIONS, which stay approved and move behind them. The suite is twelve games. Section 56, "Slate amendment: four word games" |
| Working rule | Amended 2026-09-20 by the owner: each remaining game is designed, built, tested and packaged in one conversation, pre approved, with no stops and no questions, ending when the delivery patch is ready. The owner's only action is the `tools/ship.ps1` command, then the manual checks before a separate go live patch. HANDOFF.md section 8, NEW_GAME.md section 2 |
| This document | The active architecture target. ARCHITECTURE.md is the v2 record the legacy games still satisfy and is retained until migration completes |

The original architecture established the project as a layered static application with
pure game logic, a shared deterministic RNG, a manifest-driven daily horizon, and an
explicit module seam. Those foundations remain the basis here. fileciteturn1file0L47-L64

---

## Architectural objectives

DailyKit must make the following properties mechanically enforceable rather than
relying on author discipline:

1. **Same day, same puzzle.** Every player receives the same puzzle definition for a
game/day regardless of device, browser, locale, or reload count.
2. **No daily editorial work.** A year of puzzles is generated from integer seeds and
certified before release.
3. **Exact reproducibility.** Seeded generation and all gameplay rules are pure and
cross-platform deterministic.
4. **Small state.** A saved game stores only information required to resume it.
5. **Provable daily fairness.** The certification pipeline proves solvability and,
where appropriate, uniqueness and deduction fairness.
6. **Real difficulty bands.** Monday through Sunday are different human experiences,
not merely generator labels.
7. **Social artifact first.** Every finished run produces a spoiler-free artifact derived
from the player's actions, not from a second, unrelated scoring path.
8. **No telemetry service.** The artifact is produced entirely on-device from the
player's local run data.
9. **No game leakage into the engine.** The generic engine does not know game rules.
10. **No engine assumptions inside games.** A game can choose its cognitive mode and
substrate without pretending every puzzle is a grid.

The last two objectives strengthen the abstraction test that exposed previous defects:
the earlier CIPHER work demonstrated that a game can share the GameModule seam even
when it has no conventional board, but it also showed that engine assumptions about
manifest shape and other details must be explicit or removed. fileciteturn2file0L55-L61

---

# 1. System boundaries

## 1.1 The game owns

Each game owns exactly the information that makes it a game:

- puzzle definition
- puzzle generator
- puzzle parser
- gameplay state shape
- legal actions
- action refusals
- terminal rule
- score or outcome calculation
- difficulty measure
- fairness solver
- uniqueness test where applicable
- game-specific telemetry mapping
- game renderer
- help example
- game-specific tier/bucket mapping when needed
- game-specific manifest payload

## 1.2 The platform owns

The platform owns behavior common to all games:

- calendar/day resolution
- puzzle numbering
- local-midnight rollover
- streaks
- statistics
- archive
- save/resume transport
- service worker/offline cache
- theme and accessibility chrome
- share delivery
- canonical share vocabulary
- share grammars
- row padding and size validation
- share leak testing
- generic telemetry artifact construction
- manifest loading
- manifest obfuscation
- generic certification orchestration
- suite registry
- hub and shell

The original file already established that the engine must not import game modules and
that game modules must not import each other; that remains binding. fileciteturn1file0L47-L64

## 1.3 The platform does not own

The engine must not contain game-specific notions such as:

- poker hands
- word ladders
- card routes
- prime relationships
- grid visibility
- arithmetic operators
- route checkpoints
- difference clues
- game-specific solving heuristics

Those belong under `src/games/<id>/`.

---

# 2. Layer rule

A layer may import only from layers strictly below it. The engine never imports a
game. A game never imports another game. The shell is the composition layer.

```text
Layer 5  shell, hub
Layer 4  games/*
Layer 3  contract
Layer 2  ui
Layer 1  engine
Layer 0  core
shared/  beside Layer 0; pure constants only
tools/   Node-only build and verification tools
```

The previous architecture used this exact downward rule and enforced it in CI rather
than by convention; that remains the preferred mechanism. fileciteturn1file0L47-L64

### Dependency rule

```text
core        → no application imports
engine      → core + shared
ui          → core + no contract imports
contract    → core
 games      → contract + core + shared + their own files
shell       → contract + engine + ui + core + registry data
hub         → shell-facing APIs + engine + ui + core
```

`tools/` may import Layers 0–4 but is never bundled.

---

# 3. Core contracts

The engine should remain strongly typed while the shell sees only an erased module
interface.

```text
GameModule<TState, TAction, TPuzzle>
```

The implementation uses one deliberate erasure boundary through `defineGame()`.
As built since v3 migration phase 6 that boundary is `defineGameV3()` in
`src/contract/v3/game-module.ts`, the only contract; section 3.1 is the
conceptual shape and `GameModuleV3` is the binding one.
The previous contract deliberately chose three type parameters and a single erasure
point; retain that decision, but expand the contract to cover the new puzzle and
telemetry responsibilities. fileciteturn1file0L405-L413

## 3.1 GameModule v3 conceptual shape

```text
GameModule<TState, TAction, TPuzzle>
{
    identity
    manifest

    parsePuzzle(raw)
    generatePuzzle(seed)

    createInitialState(puzzle)
    serializeState(state)
    deserializeState(puzzle, raw)
    migrateState(fromVersion, raw)

    applyAction(puzzle, state, action)
    terminal(puzzle, state)

    difficulty(puzzle)
    bucketOf(outcome)      removed in phase 5: a field of the finished outcome
    tierOf(outcome)        removed in phase 5: a field of the finished outcome

    telemetry(state)
    shareArtifact(puzzle, state, telemetry)

    render(host, puzzle, state)
    input
    help
}
```

The interface does not force every game to use every telemetry pattern. It does force
every finished game to produce a valid social artifact or explicitly declare why it
cannot, in which case certification fails for production use.

---

# 4. Determinism contract

## 4.1 Seed

The fundamental puzzle input is one unsigned 32-bit integer:

```text
Seed = uint32
```

The full puzzle identity is derived from:

```text
(gameId, puzzleNumber, gameEpoch, generatorVersion)
```

into one deterministic seed.

The original engine already standardized on one 32-bit seed and a deterministic PRNG,
with integer-only operations deliberately selected so browser and Node behavior agree.
Retain that principle. fileciteturn1file0L467-L476

## 4.2 RNG requirements

Allowed operations are integer-only and explicitly defined.

- `uint32`
- `Math.imul`
- integer addition with fixed truncation
- XOR
- shifts
- rejection sampling for bounded integers
- deterministic Fisher-Yates shuffle
- integer weighted selection

Forbidden in puzzle generation:

- `Math.random()`
- current time
- locale
- timezone
- floating-point threshold decisions
- unordered collection traversal
- browser-specific APIs
- machine-specific state
- cryptographic random values

The existing architecture intentionally avoids modulo bias in `intBelow`; retain that
rule for all new generators. fileciteturn1file0L477-L482

## 4.3 Canonical serialization

Every puzzle definition has one canonical JSON serialization.

Canonicalization specifies:

- property order
- integer encoding
- array order
- absence vs null
- string encoding
- no platform-generated IDs

A puzzle hash is calculated from this canonical representation.

```text
puzzleHash = HASH(canonicalPuzzle)
```

The hash identifies a puzzle; it is not used as a random source.

---

# 5. Daily puzzle lifecycle

```text
calendar day
    ↓
resolve puzzle number
    ↓
derive game seed
    ↓
read manifest entry if inside horizon
    ↓
parse puzzle
    ↓
validate puzzle
    ↓
restore saved state or create initial state
    ↓
PLAYING
    ↓
canonical actions
    ↓
terminal result
    ↓
telemetry mapping
    ↓
share artifact
    ↓
COMPLETE
```

The countdown is presentation only. The shell re-resolves the day after visibility
changes or possible clock jumps. The timer is never authoritative.

The previous architecture already established civil-date arithmetic rather than fixed
millisecond durations for local-midnight behavior. fileciteturn1file0L483-L490

---

# 6. State model

## 6.1 State is a snapshot, not the permanent action log

The stored game state remains a compact JSON snapshot. This avoids requiring old
versions of a module to replay years of historical actions just to restore a game.
The earlier architecture deliberately chose snapshot serialization for this reason.
fileciteturn1file0L414-L427

Telemetry for the current session is a separate small structure and may be stored only
while the session is active.

## 6.2 Engine storage envelope

```text
StorageEnvelope
{
    engineVersion
    gameVersion
    puzzleNumber
    gameId
    liveState
    liveTelemetry
}
```

The engine owns the envelope. The module owns the contents of `liveState` and,
through the telemetry contract, the shape of `liveTelemetry`.

## 6.3 Validation

A deserialized state is accepted only when:

```text
stored game id == requested game id
stored puzzle number == requested puzzle number
state version is supported
state fields are valid
state satisfies current structural invariants
```

Malformed state is rejected and replaced with a fresh session. The player never gets a
half-interpreted state.

The prior architecture explicitly centralized puzzle identity at the engine/shell seam
instead of requiring every game to prove puzzle mismatch detection in the same way;
retain that ownership rule. fileciteturn1file0L441-L449

---

# 7. Canonical action model

Every player gesture becomes a canonical semantic action before entering game logic.

```text
Touch / pointer
Keyboard
Assistive technology
       ↓
 canonical Action
       ↓
 applyAction()
```

For example:

```text
MOVE_TILE(tileId, destination)
ROTATE_TILE(tileId)
SELECT_TILE(tileId)
PAIR(a, b)
COMMIT()
```

The game does not care whether `MOVE_TILE` originated from a drag or keyboard sequence.

## 7.1 Action purity

```text
applyAction(puzzle, state, action)
    → ACCEPT(newState)
    → REFUSE(rejection)
```

No action function reads:

- DOM
- clock
- randomness
- network
- storage
- screen size

The previous architecture's decision that rejections are values with a machine code
and announcement remains mandatory. fileciteturn1file0L420-L425

## 7.2 Refusal catalogue

Every game lists every refusal it can emit.

```text
Rejection
{
    code
    announce
}
```

Examples:

```text
OCCUPIED
"That space is already filled."

FIXED_TILE
"That tile is fixed."

INVALID_RELATION
"Those tiles do not satisfy the rule."

INCOMPLETE
"Finish placing every tile first."

ALREADY_COMPLETE
"Today’s puzzle is already complete."
```

CI must verify that every declared refusal code is documented and reachable.

---

# 8. Terminal result model

Do not encode win/loss as lifecycle states.

The lifecycle remains:

```text
LOADING
PLAYING
PAUSED
COMPLETE
WAITING_FOR_NEXT
ARCHIVED_VIEW
```

A terminal result is data:

```text
FinishedOutcome
{
    won: boolean | null
    score: integer
    tier: TierOrdinal | null
    bucket: BucketId
    difficulty: integer
}
```

This preserves the previous resolution that continuum-scored games cannot be forced
into artificial WON/LOST lifecycle states. fileciteturn2file0L815-L822

---

# 9. Difficulty architecture

Difficulty is a game property, not an engine-selected knob.

Every game supplies one integer:

```text
difficulty(puzzle) → integer
```

The integer must be measured from the finished puzzle by the same logical machinery
used to certify it.

## 9.1 Requirements

The metric must be:

- emergent
- integer-valued
- reproducible
- measurable by verification
- distributed across enough distinct values for seven bands
- meaningful to human solving

A generator parameter is a **lever**, not a difficulty metric.

## 9.2 Weekly calibration

The build pipeline samples candidates, records difficulty values, sorts the accepted
values, and establishes seven septile-oriented bands subject to minimum supply.

```text
Monday     Band 1
Tuesday    Band 2
Wednesday  Band 3
Thursday   Band 4
Friday     Band 5
Saturday   Band 6
Sunday     Band 7
```

A game may use discrete admissible-value buckets instead of contiguous numeric
intervals when its measured distribution makes that safer. CIPHER already demonstrates
why class-based bands can be more faithful than arbitrary numeric windows. fileciteturn2file0L951-L971

## 9.3 Band audit

For every game CI reports:

```text
distinct difficulty values
sample count
band boundaries
candidates admitted per band
expected days per band
median and tail values
```

Certification fails when a band cannot supply the required yearly inventory.

---

# 10. Puzzle generation architecture

Every generator exposes:

```text
generate(seed) → CandidatePuzzle
```

The generator declares:

```text
strategy
expectedAcceptanceRate
levers
stateSpaceEstimate
fallbackBudget
```

## 10.1 Three allowed generation strategies

### Direct construction

Build a valid solution first, derive clues/relations, then optionally carve.

Preferred for:

- DIFFERENCE RELAY
- RING BALANCE
- TURN TABLE
- INTERVAL PACK
- ROTATE LOCK
- DIVISIBLE FENCE
- SHADOW LEDGER

### Rejection sampling

Generate candidates, validate, discard failures.

Suitable when measured yield stays well above the danger zone.

### Search/carving

Begin from a valid state and remove or alter constraints while preserving the desired
properties.

Suitable when uniqueness and fairness require controlled construction.

## 10.2 Generator acceptance accounting

Every pipeline run records:

```text
candidates
structural rejects
solvability rejects
uniqueness rejects
fairness rejects
difficulty rejects
share rejects
yearly duplicate rejects
accepted
```

A rule that rejects almost nothing is not treated as meaningful certification evidence.

---

# 11. Verification architecture

Verification has three distinct claims:

```text
SOLVABLE
UNIQUE, where required
FAIR UNDER DECLARED DEDUCTION MODEL
```

A verifier must state exactly which claims it proves.

## 11.1 Verification independence

Generation and certification are separate programs.

```text
Generator process
      ↓
serialized candidate
      ↓
Verifier process
      ↓
certificate
```

Independent checking is required whenever practical.

The existing architecture already established separate generation and verification
processes specifically to prevent one bug from writing and certifying the same bad
board. fileciteturn1file0L655-L672

## 11.2 Verification result

```text
VerificationResult
{
    structuralValid
    solvable
    unique
    deductionFair
    difficulty
    stateSpaceVisited
    rejectionReasons[]
}
```

## 11.3 Structural checks

Every verifier checks boring invariants too:

- board dimensions
- legal ranges
- unique IDs where required
- all required elements present
- no impossible references
- no inaccessible required element
- no duplicate yearly puzzle hash
- canonical serialization stable
- share contract valid
- no prohibited content

## 11.4 Exact vs bounded search

An exact result is labeled:

```text
EXACT
```

A bounded result is labeled:

```text
BEST_KNOWN
```

The player must never see an optimum claim when the underlying search was bounded.

---

# 12. Decomposition and symmetry checks

Every puzzle verifier performs two specific structural analyses.

## 12.1 Decomposition

The verifier identifies connected components of the constraint dependency graph.

A candidate is rejected when the puzzle splits into independent components that make
up the majority of the intended difficulty.

This applies directly to:

- matching games
- ring/order puzzles
- visibility games
- path games
- set-cover games

## 12.2 Symmetry

The verifier records transformations that preserve the rules:

- reversal
- rotation
- reflection
- relabeling
- equivalent tile permutations

If a scoring function preserves one of these transformations, the uniqueness claim
must account for it or the candidate is rejected.

---

# 13. Social telemetry architecture

This is a first-class engine subsystem, not an optional afterthought.

The platform's social distribution is the player's result artifact. Every production
game therefore implements at least two telemetry patterns from the approved set.

Supported patterns:

1. asymmetric spatial telemetry
2. deterministic output generation
3. spoiler-free replay visual
4. emergent fingerprint
5. precomputed consensus heatmap
6. seed-synchronous run visualization
7. micro replay path tracing
8. playstyle archetype classification
9. comparative friction graph

No pattern may require a server or live aggregate.

## 13.1 Telemetry is local

```text
player action
    ↓
small RunLog
    ↓
TelemetryMapper
    ↓
ArtifactModel
    ├── clipboard renderer
    └── graphic-card renderer
```

No telemetry call leaves the browser.

## 13.2 RunLog

Every game declares a compact telemetry type.

Examples:

```text
Attempt[]
{
    index
    quality
    accepted
}
```

```text
ActionVector[]
{
    cell
    direction
    accepted
}
```

```text
PairAction[]
{
    a
    b
    legal
    accepted
}
```

The log contains only facts required to reproduce the artifact.

## 13.3 Mapping engine

The mapper is pure:

```text
mapTelemetry(runLog) → ArtifactModel
```

No hidden puzzle data may be introduced during mapping.

A mapping rule must specify exactly:

- source field
- threshold or 1:1 mapping
- token family
- grammar
- optional archetype classification
- optional fingerprint transformation

---

# 14. Share vocabulary

The suite uses one closed semantic vocabulary.

### Result ladder

```text
⭐ best
🔷 strong
🟩 partial
🟠 weak
🔻 miss
```

### Meter

```text
🟦 barFull
⬜ barEmpty
```

### Direction

```text
🔼 up
🔽 down
⏪ left
⏩ right
```

### Structure

```text
⬛ unused
```

Games emit semantic tokens, never raw codepoints. The shared vocabulary owns the
mapping, which is consistent with the previous contract decision. fileciteturn1file0L414-L417

All approved tokens are single-codepoint emoji presentation glyphs. New tokens require
an explicit certification review proving that shape, not color alone, distinguishes
them.

---

# 15. Share grammar engine

Supported grammars:

```text
A AttemptLadder
B SequenceLadder
C Meter
D Profile
E BoardSnapshot
F Composite
```

The grammar renderer receives only an `ArtifactModel`.

It enforces:

```text
maximum 9 total lines
maximum 8 tokens per row
last line = bare platform URL
approved token vocabulary
no forbidden codepoint sequences
```

The previous architecture had already established semantic tokens, engine-owned row
padding, and share validation; the nine-line rule here replaces the older ten-line
historical compromise. fileciteturn1file0L712-L736

---

# 16. Share leak certification

Every game ships a generated matrix of good, average, and bad artifacts through a
share-leak test.

The test asks five questions.

### Position leak

Does token position correspond to the puzzle's hidden answer position?

### Answer-property leak

Does the artifact reveal a property of the solution rather than the player's
performance?

### Ordering leak

Does fixed ordering reveal the puzzle structure?

### Shape leak

Can the artifact silhouette reconstruct the underlying puzzle?

### Title leak

Does the title encode anything derived from the puzzle rather than the player's run?

A failure blocks certification.

---

# 17. Artifact model

The canonical artifact is:

```text
ArtifactModel
{
    title
    rows[]
    outcome
    fingerprint
    archetype?
}
```

The same model drives both outputs:

```text
ArtifactModel
   ├── TextShareRenderer
   └── GraphicCardRenderer
```

There is no independent scoring path for the graphic card.

## 17.1 Graphic specification

Default card:

```text
1200 × 900
```

The card includes:

- game title
- puzzle number
- short result
- fingerprint visualization
- optional archetype
- platform URL

The graphic must retain shape distinctions in high contrast and grayscale.

---

# 18. Fingerprint architecture

A fingerprint is a visual transformation of run telemetry, never puzzle data.

The base coordinate system is action chronology:

```text
x = action / attempt index
y = mapped quality
shape = accepted / refused / correction class
```

Optional game-specific axes may be used only when they describe player behavior.

Two runs with the same tier should still be capable of producing different fingerprints.

This makes the artifact a behavioral signature instead of a restyled score.

---

# 19. Optional archetype architecture

A game may provide an archetype table.

```text
ProfileMetrics
{
    accuracy
    explorationRate
    correctionRate
    commitmentRate
}
```

The game provides deterministic thresholds.

Example:

```text
high accuracy + low exploration → PRECISE
high accuracy + high exploration → EXPLORER
low accuracy + low exploration → CAUTIOUS
low accuracy + high exploration → GAMBLER
```

Archetypes are always calculated from player-run data.

They may never incorporate:

- hidden answer values
- puzzle difficulty
- another player's identity
- live community state

unless explicitly transformed into a precomputed, non-spoiler statistic in the day's
manifest.

---

# 20. Consensus and synchronous telemetry

The engine may support these patterns only through static data.

## 20.1 Consensus

A manifest can contain a precomputed aggregate distribution:

```text
ConsensusProfile
{
    band1...
    band2...
}
```

It is never fetched live.

## 20.2 Synchronous visualization

Two offline players can compare runs because the seed is identical. The artifact
compares local run shapes without contacting the other player.

No account identity or player identity is required.

---

# 21. Input architecture

The engine has two supported input families:

```text
GRID
CUSTOM
```

A third semantic helper, `ORDER`, is a reusable adapter rather than a separate
contract family.

## GRID

The presentation kit supplies:

- rectangular focus
- arrow-key navigation
- activation
- screen-reader announcements

## CUSTOM

The game supplies its own key map. The contract must document every key-to-action
mapping.

The previous architecture correctly recognized that custom input means the game owns
its keyboard model; this rewrite keeps that explicit rather than pretending a generic
grid cursor can serve every game. fileciteturn1file0L431-L449

## ORDER adapter

Ordering games share common semantic primitives:

```text
FOCUS_ITEM(id)
MOVE_ITEM(id, destination)
SWAP_ITEMS(a,b)
```

The renderer may use drag interactions, while keyboard play decomposes the same decision
into discrete focus + move actions.

---

# 22. Accessibility architecture

Every action has a deterministic announcement.

The UI must be able to produce:

```text
ACTION ANNOUNCEMENT
RESULT ANNOUNCEMENT
REFUSAL ANNOUNCEMENT
TERMINAL ANNOUNCEMENT
```

The game renderer does not invent separate accessibility rules.

It consumes `ActionResult`.

The existing architecture's live-region and `aria-activedescendant` decisions remain
valid for grid games. fileciteturn1file0L581-L587

---

# 23. Manifest architecture

The neutral manifest format is:

```text
ManifestIndex
{
    gameId
    version
    horizon
    chunks[]
}
```

Each chunk contains:

```text
entries: {
    "214": ManifestEntry
}
```

The engine reads an entry by puzzle number and does not inspect game-specific payload
fields.

This preserves the important Phase 11 correction: the engine should not assume every
manifest contains a `boards` array or a game-specific internal shape. The neutral
`entries` format exists specifically to keep that assumption out of the engine.
fileciteturn2file0L120-L134

## 23.1 ManifestEntry

```text
ManifestEntry
{
    puzzleNumber
    seed
    puzzleHash
    generatorVersion
    puzzlePayload

    difficulty
    band

    certification

    shareCapabilities
}
```

`puzzlePayload` is opaque to the engine.

## 23.2 Manifest confidentiality

Manifest obfuscation is **not encryption**.

It exists to keep casual browsing from immediately exposing answers, not to provide
security. A determined user can extract any client-side puzzle.

The previous architecture already made this distinction explicitly and moved the
shared keystream into the engine rather than copying it into every game. fileciteturn2file0L72-L78

---

# 24. Past-horizon generation

A game may generate puzzles in-browser past the manifest horizon only when:

- generation completes under the browser budget
- the result is deterministic
- the game does not pretend to have a stored optimal result it cannot reproduce
- the end result is marked `unrated` when required

The shell must never silently generate a private replacement for a day that exists in
the manifest but whose manifest entry failed to load.

That distinction was already established: inside the manifest horizon, failure to read
the manifest means unavailable rather than a different generated board; beyond the
horizon, deterministic fallback generation may be used. fileciteturn1file0L861-L870

---

# 25. Certification report

Every production puzzle receives a machine-readable certification record.

```text
Certification
{
    seed
    puzzleHash

    structuralValid
    solvable
    unique
    deductionFair

    difficulty
    band

    acceptanceRate
    stateSpaceSize
    verificationMethod

    decompositionPass
    symmetryPass

    shareLeakPass
    shareLinePass
    glyphPass

    fallbackBudgetPass

    generatorVersion
    verifierVersion
}
```

The yearly manifest contains the certification metadata necessary to reproduce the
claims but not necessarily every intermediate search detail.

---

# 26. Candidate generation pipeline

```text
seed
 ↓
generator
 ↓
candidate
 ↓
cheap structural screen
 ↓
independent verification
 ↓
uniqueness check
 ↓
fairness solver
 ↓
difficulty measurement
 ↓
band eligibility
 ↓
decomposition check
 ↓
symmetry check
 ↓
share artifact samples
 ↓
share leak check
 ↓
state-space / duplicate check
 ↓
CERTIFIED
 ↓
manifest chunk
```

Cheap rejection comes first. Expensive exact solving happens only for candidates that
survive cheap screens.

This follows the proven lesson from the earlier generation pipeline: candidate
screening should be cheap and expensive solving should be reserved for survivors.
fileciteturn1file0L654-L660

---

# 27. New concept profiles

The following concepts are the current architecture targets. They are **game-module
profiles**, not engine special cases.

| Game | Core decision | Verification shape | Difficulty candidate | Primary telemetry |
|---|---|---|---|---|
| DIFFERENCE RELAY | Order numbers under adjacent difference constraints | 6! enumeration + deduction | forced depth | action chronology + fingerprint |
| TURN TABLE | Rotate route tiles under checkpoint constraints | orientation enumeration + graph search | propagation work | spatial trace + replay |
| RING BALANCE | Order numbers around constrained ring | anchored permutation enumeration | chain depth | attempt trace + fingerprint |
| INTERVAL PACK | Order numbers under overlapping interval sums | permutation enumeration | resolution depth | friction + deterministic meter |
| CARD CASCADE | Sequence signed cards through cumulative checkpoints | permutation enumeration + subset DP | reachable-state mass | replay + archetype |
| THREE-WAY SPLIT | Partition numbers into constrained triples | partition enumeration | candidate elimination | replay + fingerprint |
| ROTATE LOCK | Order/rotate route pieces under turn checkpoints | state enumeration + pruning | checkpoint decision depth | vector trace + deterministic output |
| DIVISIBLE FENCE | Order numbers under local relations and neighbor counts | permutation enumeration | neighbor reduction | action telemetry + archetype |
| WORD WEAVE | Select dictionary words satisfying exact overlaps | layered graph search | candidate-domain work | replay + fingerprint |
| PRIME PAIRING | Form unique prime-sum matching | perfect matching enumeration | forced-pair depth | action trace + archetype |
| SHADOW LEDGER | Place markers under blocker visibility counts | binary-state enumeration | visibility depth | deterministic meter + replay |
| COVER CHARGE | Select a constrained arithmetic cover | subset enumeration | cover-choice depth | deterministic meter + friction |
| PARITY PARADE | Order tiles under prefix parity constraints | permutation enumeration | propagation depth | sequence ladder + fingerprint |
| CROSS CURRENT | Build one directed cycle under node constraints | cycle enumeration | subtour depth | graph trace + replay |
| ORDER OF OPERATIONS | Order signed operators through checkpoints | permutation enumeration + subset DP | reachable-state mass | meter + friction |

The table intentionally describes capabilities and data flow, not engine-specific code.

---

# 28. Game module folder standard

Every new game uses:

```text
src/games/<id>/
    module.ts
    rules.ts
    generator.ts
    solver.ts
    difficulty.ts
    telemetry.ts
    render.ts
    style.css
    help.ts
    manifest-codec.ts       # only if game payload needs a wrapper
    tutorial.ts             # optional
```

Not every module requires every file, but each omission must be justified in the game
contract document.

The module itself is the only game file imported by the shell entry.

---

# 29. Shared engine files

The engine grows around stable responsibilities rather than game names.

```text
src/engine/
    tiers.ts
    manifest-codec.ts
    storage.ts
    stats.ts
    state-machine.ts
    scheduler.ts
    telemetry.ts
    share.ts
    artifact.ts
    share-grammar.ts
    share-leak.ts
    certification.ts
```

### `telemetry.ts`
Defines the generic run-log and artifact interfaces.

### `artifact.ts`
Transforms validated telemetry into the canonical artifact model.

### `share-grammar.ts`
Renders and validates grammars A–F.

### `share-leak.ts`
Runs the five share safety checks.

### `certification.ts`
Provides shared types for generator/verifier results; it does not solve games itself.

---

# 30. Core shared files

```text
src/core/
    rng.ts
    seed.ts
    date.ts
    result.ts
    hash.ts
    canonical-json.ts
    types.ts
```

`hash.ts` and `canonical-json.ts` are particularly important because puzzle identity
and manifest certification must not depend on ordinary object serialization.

---

# 31. Shared constants

```text
src/shared/
    share-vocabulary.ts
    share-grammars.ts
    input-actions.ts
```

`share-vocabulary.ts` is closed to games.

A game cannot silently add a glyph to the suite language.

---

# 32. Build tools

```text
tools/
    generate.ts
    verify.ts
    calibrate.ts
    certify.ts
    depcheck.ts
    rngvectors.ts
    manifest.ts
    share-harness/
```

## `generate.ts`
Builds candidate pools and yearly puzzle entries.

## `verify.ts`
Re-derives the claims in the manifest independently from the generator's output.

## `calibrate.ts`
Produces measured difficulty distributions and seven-band boundaries.

## `certify.ts`
Runs the complete certification pipeline and writes certification metadata.

## `manifest.ts`
Writes neutral entry/chunk files and index data.

## `share-harness/`
Renders representative artifacts across the outcome space and runs visual constraints.

---

# 33. Testing architecture

The test suite is organized around properties rather than only examples.

## Core

```text
rng.test.ts
seed.test.ts
date.test.ts
canonical-json.test.ts
hash.test.ts
```

## Engine

```text
storage.test.ts
stats.test.ts
state-machine.test.ts
scheduler.test.ts
telemetry.test.ts
artifact.test.ts
share.test.ts
share-grammar.test.ts
share-leak.test.ts
certification.test.ts
```

## UI

```text
dom.test.ts
a11y.test.ts
theme.test.ts
modal.test.ts
toast.test.ts
countdown.test.ts
header.test.ts
statsPanel.test.ts
helpPanel.test.ts
gridCursor.test.ts
```

## Per-game

```text
generator.test.ts
solver.test.ts
rules.test.ts
difficulty.test.ts
telemetry.test.ts
module.test.ts
render.test.ts
help.test.ts
```

---

# 34. Required deterministic properties

For every certified game:

```text
P = generate(seed)
P2 = generate(seed)
assert canonical(P) == canonical(P2)
```

For every legal action:

```text
applyAction(P, S, A)
→ ACCEPT(S2)
```

and:

```text
S2 remains valid
```

For every refusal:

```text
applyAction(P, S, illegalA)
→ REFUSE(R)
```

and:

```text
S remains byte-identical
```

For every finished state:

```text
terminal(P, S) is stable
shareArtifact(P, S) is deterministic
```

For every share:

```text
shareText == shareText
shareGraphicModel == shareGraphicModel
```

---

# 35. Generator/verification properties by concept family

## Ordering games

Use permutation enumeration, anchored permutations, or equivalent exact state-space
search.

Targets:

- DIFFERENCE RELAY
- RING BALANCE
- INTERVAL PACK
- PARITY PARADE
- ORDER OF OPERATIONS
- CARD CASCADE

Key risk: symmetric score surfaces and brute-force-feeling difficulty.

## Spatial route games

Use orientation-state or graph-state enumeration.

Targets:

- TURN TABLE
- ROTATE LOCK
- CROSS CURRENT

Key risk: visual density and accidental decomposition.

## Matching/partition games

Use exact matching/partition enumeration.

Targets:

- PRIME PAIRING
- THREE-WAY SPLIT
- COVER CHARGE

Key risk: small state spaces and insufficient difficulty spread.

## Visibility/grid games

Use bitset enumeration and deduction propagation.

Target:

- SHADOW LEDGER

Key risk: resemblance to established grid-logic formats.

## Word graph games

Use dictionary membership only and exact graph search.

Targets:

- LETTER TRAIL
- WORD LADDER
- PANGRAM
- FIVE LETTERS
- WORD WEAVE

Key risk: translation debt and vocabulary-dependent fairness. Added 2026-09-19 for
the four word games: an answer that is a real word the player has never met reads
as unfair no matter what the verifier proves, so every game in this family draws
answers from a curated answer list and accepts guesses from a larger validation
list, and the curation is a one time asset, not daily authoring.

---

# 36. Performance budgets

The game runtime budget is distinct from build-time certification.

## Browser

Puzzle generation fallback should normally complete in:

```text
< 1 second on a mid-range phone
```

Gameplay actions should be synchronous and cheap.

Telemetry mapping should be effectively instantaneous.

Share generation should not require a network request.

## Build

The build may spend minutes generating and verifying a yearly horizon.

Expensive exact verification is acceptable offline.

The critical constraint is that the exact verifier must have a known finite search bound
for every production game.

---

# 37. Storage budgets

The saved state should normally stay below:

```text
10 KB per active game
```

and should usually be far smaller.

Telemetry is stored only while useful to the unfinished session or for the player's
local artifact/result record.

Do not retain arbitrary analytics.

The principle is:

> If deleting the field cannot change resume, scoring, certification, or the share artifact, do not store it.

---

# 38. Share delivery boundary

The game creates:

```text
ShareArtifact
```

The platform creates:

```text
ShareDeliveryResult
```

The platform is responsible for:

- native share sheet
- clipboard fallback
- cancellation behavior
- user-facing success/failure messaging

The game never calls browser sharing APIs directly.

The previous architecture already established that share delivery belongs to the engine
rather than individual games; keep that boundary. fileciteturn1file0L537-L541

---

# 39. Shell and hub

The shell remains responsible for:

- game selection
- daily resolution
- manifest loading
- state-machine lifecycle
- end screen
- statistics
- archive
- share actions
- cross-promotion
- tutorial/session mode

The hub registry is data only.

The hub must not import a game module merely to display its card.

That preserves the previous suite decision that the hub should not pay the download cost
of every game on the landing page. fileciteturn1file0L829-L835

---

# 40. Tutorial architecture

A tutorial is a separate session mode.

It is:

- deterministic
- fixed or locally embedded
- easier than a live daily puzzle
- never counted in streaks
- never counted in live statistics
- never treated as today's puzzle
- never shareable as a daily result

The previous implementation found that this separation is best made structural rather
than relying on every game to remember not to count the tutorial. fileciteturn1file0L930-L939

---

# 41. Offline architecture

Production release emits:

```text
dist/sw.js
dist/sw-manifest.json
```

The service worker:

- cache-first loads the application shell
- caches immutable game assets
- serves manifest chunks from cache when available
- never becomes its own cached dependency
- does not auto-reload a page while a game is in progress

The previous architecture demonstrated offline play with the shell and current game
manifest available after the service worker was installed; retain that as a regression
requirement. fileciteturn1file0L940-L944

---

# 42. Build model

A production release is one deterministic build containing every game on the production
allow list.

The purpose remains the same as the existing architecture: a single full release build
is required so Rollup can actually share the same engine chunk between entries instead
of emitting incompatible "same named URL" engine files. fileciteturn1file0L324-L344

Development may still build one game into `dist-dev/`.

```text
GAME=<id> vite build
```

never overwrites `dist/`.

---

# 43. Repository layout

```text
dailykit/
  ARCHITECTURE.md
  BACKLOG.md
  ASSETS.md
  README.md
  NEW_GAME.md
  SLATE.md
  package.json
  tsconfig.json
  tsconfig.tools.json
  vite.config.ts
  vitest.config.ts

  src/
    core/
      rng.ts
      seed.ts
      date.ts
      result.ts
      hash.ts
      canonical-json.ts
      types.ts

    engine/
      tiers.ts
      manifest-codec.ts
      storage.ts
      stats.ts
      state-machine.ts
      scheduler.ts
      telemetry.ts
      artifact.ts
      share.ts
      share-grammar.ts
      share-leak.ts
      certification.ts

    ui/
      dom.ts
      a11y.ts
      theme.ts
      modal.ts
      toast.ts
      countdown.ts
      header.ts
      statsPanel.ts
      helpPanel.ts
      gridCursor.ts
      chrome.css

    contract/
      types.ts
      game-module.ts

    shared/
      share-vocabulary.ts
      share-grammars.ts
      input-actions.ts

    games/
      toy-tap/
      poker-grid/
      cipher/
      difference-relay/
      turn-table/
      ring-balance/
      interval-pack/
      card-cascade/
      three-way-split/
      vector-lock/
      divisible-fence/
      word-weave/
      prime-pairing/
      shadow-ledger/
      cover-charge/
      parity-parade/
      cross-current/
      order-of-operations/

    shell/
      main.ts
      boot.ts
      registry.ts
      share-context.ts
      suite.ts
      shell.css
      changelog.ts
      entries/

    hub/
      hub.ts
      hub.css
      boot.ts
      index.html

    about/
      index.html
      about.css

    sw/
      sw.ts

  data/
    <game-id>/
      manifest.index.json
      manifest.<chunk>.json
      calibration.json

  tools/
    generate.ts
    verify.ts
    certify.ts
    calibrate.ts
    manifest.ts
    depcheck.ts
    rngvectors.ts
    budget.ts
    sw-manifest.ts
    share-harness/

  tests/
    core/
    engine/
    ui/
    games/
    shell/
    hub/
    tools/
```

---

# 44. New-game authoring contract

`NEW_GAME.md` must be rewritten to require the following before a game may enter the
production allow list:

1. one-sentence rule
2. cognitive mode
3. substrate and its hardest substrate gate
4. session length
5. input model
6. puzzle generator strategy
7. measured generation acceptance rate
8. state-space census
9. exact or bounded verification method
10. uniqueness claim, if applicable
11. fairness claim
12. decomposition result
13. symmetry result
14. one emergent integer difficulty measure
15. seven-band calibration evidence
16. Monday-vs-Sunday player-feel statement
17. every refusal and announcement
18. histogram buckets
19. at least two telemetry patterns
20. exact telemetry record shape
21. exact mapping function
22. clipboard artifact
23. graphic-card artifact specification
24. share leak-test result
25. fingerprint definition
26. browser fallback budget
27. all ten contract pieces
28. explicit risks

A game whose generation or artifact design is still aspirational is not considered
"scaffolded." It is a concept, not a production candidate.

---

# 45. Certification gate

A game enters `productionSafe: true` only when all of these pass:

```text
TYPECHECK
TESTS
DEPENDENCY CHECK
DETERMINISM VECTORS
GENERATION PIPELINE
INDEPENDENT VERIFICATION
DIFFICULTY CALIBRATION
YEARLY HORIZON
DUPLICATE CHECK
DECOMPOSITION CHECK
SYMMETRY CHECK
SHARE LEAK CHECK
GLYPH CHECK
ACCESSIBILITY CONTRACT
STATE ROUND-TRIP
MANIFEST ROUND-TRIP
OFFLINE SMOKE
BYTE BUDGET
MANUAL MOBILE CHECK
```

The production allow list must be a consequence of certification, never a consequence
of directory existence.

**As built, v3 migration phase 5 part B.** `tools/certify.ts` evaluates every step
for every live registry game and commits `data/<game>/certification.json`.
`vite.config.ts` admits a game target only when that record is production safe on
the build's local date, and refuses a game target that sets `productionSafe` by hand.
A step's outcome is `pass`, `fail`, `skip`, `n/a` or `pending`. A skip always
refuses. `n/a` passes only with a written reason stored in the record. `pending`
passes only under an exemption in `GATE_EXEMPTIONS` that names the step and the game
and has not expired. The record carries no timestamp; it carries the commit it was
produced at and a hash of its outcomes, and is rewritten only when an outcome changes.

That preserves the previous template decision that new entries begin planned and
production-disabled until their rules, manifest, accessibility, and verification are
actually ready. fileciteturn1file0L683-L700

---

# 46. Concept-specific architecture notes

## DIFFERENCE RELAY

Preferred contract shape:

```text
ORDER input adapter
permutation verifier
forced-depth difficulty
attempt-ladder or composite share
```

Primary engine stress test: whether deduction fairness can be kept stricter than mere
uniqueness.

## TURN TABLE

Preferred contract shape:

```text
custom rotation actions
orientation-state verifier
graph connectivity check
propagation-work difficulty
spatial replay artifact
```

Primary engine stress test: compact rendering and touch/keyboard parity.

## RING BALANCE

Preferred contract shape:

```text
ORDER adapter
anchored permutation verifier
chain-depth difficulty
attempt fingerprint
```

Primary engine stress test: explicit symmetry breaking.

## INTERVAL PACK

Preferred contract shape:

```text
ORDER adapter
permutation enumeration
resolution-depth difficulty
meter + friction artifact
```

Primary engine stress test: keeping arithmetic from becoming bookkeeping.

## CARD CASCADE

Preferred contract shape:

```text
ORDER adapter
permutation + subset DP
reachable-state difficulty
replay + archetype
```

Primary engine stress test: preventing the scoring system from rewarding blind trial.

## THREE-WAY SPLIT

Preferred contract shape:

```text
custom bin/partition actions
partition enumeration
candidate-elimination difficulty
attempt fingerprint
```

Primary engine stress test: enough state-space depth for seven useful bands.

## ROTATE LOCK

Preferred contract shape:

```text
ORDER + rotation adapter
graph/path enumeration
checkpoint-depth difficulty
vector replay artifact
```

Primary engine stress test: mobile visual density.

## DIVISIBLE FENCE

Preferred contract shape:

```text
ORDER adapter
permutation verifier
neighbor-reduction difficulty
archetype + action trace
```

Primary engine stress test: rule-symbol learnability.

## WORD WEAVE

Preferred contract shape:

```text
CUSTOM word entry
exact dictionary graph search
candidate-domain difficulty
spoiler-free wordless artifact
```

Primary engine stress test: vocabulary distribution and localization debt.

## PRIME PAIRING

Preferred contract shape:

```text
pairing actions
perfect matching enumeration
forced-pair depth
fingerprint
```

Primary engine stress test: ensuring the matching graph does not split.

## SHADOW LEDGER

Preferred contract shape:

```text
GRID input
bitset state enumeration
visibility-depth difficulty
meter + replay
```

Primary engine stress test: distinctiveness versus established grid-logic conventions.

## COVER CHARGE

Preferred contract shape:

```text
selection actions
subset enumeration
cover-choice difficulty
meter + friction
```

Primary engine stress test: whether 210 subset states are enough for durable difficulty.

## PARITY PARADE

Preferred contract shape:

```text
ORDER adapter
permutation verifier
propagation-depth difficulty
sequence ladder
```

Primary engine stress test: difficulty-value spread.

## CROSS CURRENT

Preferred contract shape:

```text
edge actions
cycle enumeration
subtour-depth difficulty
graph replay
```

Primary engine stress test: graph terminology and similarity to existing loop/network
puzzles.

## ORDER OF OPERATIONS

Preferred contract shape:

```text
ORDER adapter
permutation + subset DP
reachable-state difficulty
meter + friction
```

Primary engine stress test: division edge cases and human arithmetic load.

## LETTER TRAIL

Added 2026-09-19. Game six in build order. The preferred contract shape below was
amended in the design phase, charter Phase 13, when the full cover uniqueness claim
was measured and found unachievable; see the section 56 entry and LETTER-TRAIL.md
section 0. The settled shape is:

```text
GRID adapter, path selection under eight way adjacency
themed known word set, given as a count; the board hides seven words including a span
exact enumeration of every answer word present, span is the unique longest present
decoy word count as a difficulty hypothesis, calibrated during the build
found order token rows, no letters, no positions
```

The abandoned line was "exact word placement search over the answer list, uniqueness
of the full cover" with "extraneous word count and placement ambiguity as difficulty."
A dense letter grid admits many dictionary tilings, so full cover uniqueness sits at
about one percent at four by four and zero at five by five and larger; it is not a
buildable fairness model. The claim proved instead is span uniqueness: the intended
spanning word is the unique longest answer word anywhere on the board, which anchors
the day's set. A curated theme replaces the missing uniqueness with directed recall,
so early play is not guessing, and supplies a non repeating horizon from a one time
asset: one forty five word theme yields over two thousand distinct boards.

Primary engine stress test: a lattice of letters where the grid cursor must build
a path, not select a cell, and a share that must say how the player found the
words without saying which words or where.

## WORD LADDER

Added 2026-09-19. Game seven in build order.

Preferred contract shape:

```text
CUSTOM word entry, one rung at a time
breadth first search over the one letter change graph, exact shortest path
shortest path length and branching near the goal as difficulty
rung count against par, dead end rungs marked, no words
```

Primary engine stress test: the validation list as a runtime asset inside the per
game byte budget, and a par computed exactly offline.

Preparation evidence, 2026-09-19: `WORD-LADDER-PREP.md` measured word length,
the accepted list against par exactness, difficulty integer candidates, keyboard
geometry, bytes and word list licensing. It was input for the design document,
which absorbed it and deleted it on 2026-09-20.

Designed and built 2026-09-20: `WORD-LADDER.md` is the design document, answering
every item of section 44. The game is built on the v3 contract and ships planned.
The family familiarity source, left open here, is settled: WORD LADDER uses
SCOWL/ESDB, and the four word games do not converge on one source, for the measured
reason in the migration log (proper noun contamination in the wordfreq source that
a displayed rung cannot tolerate). Par is the exact shortest path over the single
accepted list, with a familiar shortest path screen as the fairness claim; the
difficulty integer is the search ball below par.

## PANGRAM

Added 2026-09-19. Game eight in build order.

Preferred contract shape:

```text
CUSTOM word entry from seven letter keys
exhaustive enumeration of the answer list against the seven letters
total available score and the rarity of the pangram as difficulty
continuous score ladder toward the pangram, no words
```

Primary engine stress test: a continuous score whose maximum is a word count the
player cannot see, and keeping the layout clear of other games' trade dress.

Designed and built 2026-09-20: `PANGRAM.md` answers every item of section 44 and
the game ships planned. The preferred shape above held in its essentials, with
three settlements. The day carries its own answer list in the manifest and the
browser ships no dictionary, because a day's answers are determined by its seven
letters and a shipped dictionary would cost 67 KB or more gzipped. Difficulty is
the total available score alone, with the answer count as the named fallback;
pangram rarity has too few values (one to seven) to band. S never appears in a
day's letters, which halves the day. As built:

```text
CUSTOM word entry from seven keys, four over three, never a honeycomb
exact enumeration of the accepted list, the manifest answers proved identical
total available score as difficulty, answer count as fallback
meter row and opening finds row, grammar C, no words
no generation past the horizon: the browser holds no dictionary
```

## FIVE LETTERS

Added 2026-09-19. Game nine in build order.

Preferred contract shape:

```text
CUSTOM word entry on a letter keyboard, CIPHER's slot pattern
exact per position feedback, answer list with a larger validation list
remaining candidate count after an ideal opening as difficulty
per position feedback rows, the genre's own grammar
```

Primary engine stress test: a 26 key keyboard at 360 pixels against the 44 pixel
touch floor, and a cognitive mode that overlaps CIPHER's deduction from feedback.

---

# 47. Existing games under the revised contract

POKER GRID and CIPHER remain valid production modules, but they are treated as legacy
implementations that must satisfy the v3 contract over time rather than forcing the new
concepts to reproduce their historical internal shape.

The prior architecture's abstraction test found that CIPHER could share the contract
without a board, while several engine assumptions had to be corrected. That result is
important: the contract should absorb different game shapes without adding game-name
special cases to the engine. fileciteturn2file0L143-L156

Migration priority:

```text
1. shared telemetry/artifact contract
2. nine-line share compliance
3. independent certification record
4. difficulty certification normalization
5. neutral manifest payload
6. legacy per-game telemetry adapters removed
```

No rewrite of existing game rules is implied merely by this architecture document.

---

# 48. Historical decisions retained

The following decisions from the earlier architecture remain deliberately intact:

- downward-only layer dependencies
- one contract erasure point
- three generic GameModule type parameters
- semantic share tokens
- snapshot state serialization
- engine-owned puzzle identity
- custom input means game-owned keyboard model
- neutral `entries` manifest format
- deterministic seeded PRNG
- civil date arithmetic
- storage migrations separated by engine/module ownership
- `COMPLETE` lifecycle state instead of WON/LOST states
- suite registry as data
- one full release build for a shared engine chunk
- service worker not cached by itself
- production-disabled new games until certification

These are retained because they solve genuine problems already encountered in the
project rather than because they are convenient historical habits. The Phase 11
defect report explicitly records several of these corrections. fileciteturn2file0L63-L96

---

# 49. Decisions deliberately changed

## Share height

**Old:** historical ten-line implementation compromise.

**New:** hard contract is nine total lines including title and URL.

Reason: the social artifact specification makes this a distribution constraint rather
than a soft UI preference.

## Difficulty

**Old:** individual games could use module-specific tier inputs without a single
architecture-wide certification artifact.

**New:** every game must expose one emergent integer difficulty measure and a machine-
checked seven-band calibration report.

## Telemetry

**Old:** telemetry interface existed, but the architecture did not treat the artifact
as a universal production gate.

**New:** telemetry, mapping, fingerprint, share grammar, and leak testing are all
required certification surfaces.

## Verification

**Old:** game-specific solver verification was strong but uneven in what it claimed.

**New:** every certification explicitly distinguishes solvability, uniqueness, and
fairness, with independent verification where practical.

## Manifest

**Old:** the project evolved from game-specific board assumptions.

**New:** neutral opaque `puzzlePayload` entries are authoritative.

---

# 50. CI architecture

`.github/workflows/ci.yml` must run:

```text
install
↓
typecheck
↓
depcheck
↓
unit tests
↓
property tests
↓
share tests
↓
certification fixtures
↓
byte budget
```

As built after v3 migration phase 5 part B, `ci.yml` runs typecheck, typecheck:tools,
typecheck:sw, depcheck, the full test suite (which contains the property, share and
certification fixture tests), the three verifiers, build, budget, and last
`certify --check --from-ci`.

`.github/workflows/generate.yml` must run:

```text
calibration studies
↓
generate horizon
↓
independent verify horizon
↓
duplicate scan
↓
band inventory
↓
share leak scan
↓
manifest round-trip
↓
commit/export artifacts
```

A generation job that writes a manifest without independently replaying its claims is
not a valid release pipeline.

---

# 51. Manual validation

Automated certification does not replace the small set of things machine checks cannot
measure well enough.

The manual checklist is limited to:

- first-play comprehension
- mobile touch ergonomics
- keyboard parity
- screen-reader clarity
- whether Monday feels meaningfully easier than Sunday
- share artifact visual quality
- visual distinction without relying on color
- perceived session duration

Manual review never substitutes for solver certification.

---

# 52. Risks to the architecture

## Risk 1: telemetry becomes an accidental second scoring system

Countermeasure: one `ArtifactModel` generated from the same terminal/telemetry facts;
the text and graphic renderers consume that model and calculate nothing independently.

## Risk 2: difficulty becomes a disguised generator knob

Countermeasure: CI recomputes the integer after puzzle creation and refuses to accept a
band claim that cannot be reproduced from the verifier.

## Risk 3: the engine grows game-specific exceptions

Countermeasure: every exception requires a contract generalization test. If the new
behavior names a particular game in Layer 1–3, reject the change unless it is moved to
that game or generalized honestly.

## Risk 4: the share block accidentally leaks the solution

Countermeasure: leak tests are part of certification, not visual polish.

## Risk 5: the concept pool contains games whose state space is technically enumerable
but too small for durable daily variety

Countermeasure: G6 state-space census is a required manifest field, not an author claim.

---

# 53. The architectural invariant

The system has one authoritative answer for each category of fact:

```text
WHAT IS TODAY'S PUZZLE?
    → generate/parse from seed

WHAT ACTION DID THE PLAYER TAKE?
    → canonical Action

WAS THAT ACTION LEGAL?
    → applyAction

DID THE SESSION FINISH?
    → terminal

HOW GOOD WAS THE PUZZLE ITSELF?
    → verifier + difficulty

WHAT DOES THE PLAYER SHARE?
    → telemetry → ArtifactModel

HOW IS THE SHARE DELIVERED?
    → engine/share
```

No subsystem is allowed to recompute one of these facts from a different source.

This is the central defense against drift.

---

# 54. Definition of done for a new game

A new concept is not "done" when it renders and accepts input.

It is done when:

```text
one sentence rule
+ deterministic generator
+ measured acceptance rate
+ computed state-space census
+ independent verifier
+ explicit fairness claim
+ unique solution where required
+ decomposition check
+ symmetry check
+ emergent difficulty measure
+ seven populated bands
+ mobile/keyboard parity
+ complete refusal catalogue
+ compact state
+ ≥2 telemetry patterns
+ deterministic fingerprint
+ real clipboard artifact
+ real graphic artifact
+ leak-free certification
+ offline support
+ manifest round-trip
+ production CI
```

Only then does `productionSafe` become `true`.

---

# 55. Final architecture statement

DailyKit is a **deterministic puzzle runtime surrounded by a deterministic certification
pipeline**.

The center is intentionally small:

```text
seed
 ↓
puzzle
 ↓
action
 ↓
state
 ↓
result
 ↓
telemetry
 ↓
artifact
```

Everything else exists to guarantee that chain is reproducible, fair, accessible,
shareable, and cheap enough to run every day for years.

The strongest consequence of the new concept pool is that the engine should stop
thinking of a "game" as a board plus a score. A game is a pure rule module with four
proof surfaces—**generation, verification, difficulty, and artifact mapping**—and a
renderer that merely makes those facts visible.

That is the abstraction the 15 concepts need, and it is also the abstraction that keeps
the existing POKER GRID/CIPHER architecture from turning into a pile of exceptions.


---

# 56. Migration log

A running record of the v3 adoption so a fresh conversation can resume from this
document alone. One entry per phase.

## Phase 1, the v3 contract. Done 2026-09-13.

The contract and the new engine seams landed additively, with no change to the
v2 games or shell, and the full suite is green: 53 files, 597 tests, plus
typecheck, dependency check, production build and byte budget.

Added:
- `src/contract/v3/game-module.ts` and `types.ts`. `GameModuleV3` is the v2
  module plus `shareCapabilities`, `difficulty`, `telemetry`, `shareArtifact`
  and `tierOf`, with `inspect` returning the v3 outcome. Three type parameters
  kept; one erasure point `defineGameV3`. Proven v2 method names retained so a
  legacy game migrates by adding methods, section 47.
- `src/core/types.ts` gained `FinishedOutcomeV3` (adds `bucket` and
  `difficulty`, section 8), `OutcomeV3`, `BucketId` and `TelemetryPattern`. The
  v2 `FinishedOutcome` is untouched.
- `src/core/canonical-json.ts` and `src/core/hash.ts`, section 30. Stable JSON
  and a cyrb53 hash for puzzle identity and yearly duplicate detection.
- `src/engine/telemetry.ts` now carries the social telemetry interfaces
  (`RunLog`, `Fingerprint`, `ArtifactModel`, `validateRunLog`) beside the
  original analytics seam, kept apart by section header.
- `src/engine/share-grammar.ts` (grammars A to F, `renderArtifactText`,
  `validateArtifactText`: nine line and eight token caps), `artifact.ts`
  (`validateArtifact`, `renderArtifact`), `share-leak.ts` (the five checks as a
  harness with game supplied probes), `certification.ts` (`VerificationResult`,
  `CertificationRecord`, the nineteen step gate, `isProductionSafe`).
- `src/shared/share-vocabulary.ts` extended with the direction glyphs and the
  unused token, section 14. Existing glyphs are byte identical.
- `src/games/toy-v3/module.ts`, a full v3 module proving the round trip
  telemetry to artifact to grammar to leak clean. Not shipped: no entry, no
  html, no registry row.

Deferred to later phases: the analytics seam and the social telemetry both live
in `telemetry.ts` for now; split into `analytics.ts` if it gets confusing. The
v3 GraphicCardRenderer (section 17.1) is not built; only the text renderer is.
The certification gate types exist but are not wired into CI yet, section 50.

## Phase 2, VECTOR on v3. Done 2026-09-13.

VECTOR implements v2 and v3 at once, with no engine change and no shell change,
and the suite is green: 54 files, 637 tests, three typechecks, the dependency
check, the production build, the byte budget, and a full re-verification of the
365 day horizon.

**One object, two seams.** `FinishedOutcomeV3` is `FinishedOutcome` plus
`bucket` and `difficulty`, so `OutcomeV3` is assignable to `Outcome` and one
implementation satisfies both contracts. `src/games/vector/module.ts` exports
the v2 module as the default, which is what the entry, the registry and the
build still use, and `vectorV3` beside it. `main.ts` reads named outcome fields
and never spreads the outcome, so the two extra fields reach no storage record.
This is the migration shape section 47 asks for and it is what lets the other
two legacy games follow one at a time rather than in a flag day.

**Difficulty is recomputed, never read.** `rules.difficultyFor` runs the
propagation and returns the intensity. A test parses all 365 manifest entries
and asserts the recomputed number equals every stored `best.difficulty`, which
is section 52 risk 2 made mechanical: a generator that drifted from the measure
would fail that test rather than ship a band claim nobody checks.

**A correction to the record while doing it.** VECTOR.md 9.2 names the
difficulty as the propagation depth. The shipped game bands on the **intensity**,
the mean assignment round scaled by a hundred, and depth is stored beside it for
audit. The formula existed twice inside `generator.ts` and is now
`propagate.intensityOf`, used by the generator, the module and the verifier, so
the three cannot disagree. The horizon re-verifies unchanged, which is the proof
the extraction was lossless.

**The run had to be given somewhere to live.** VectorState held arrows, a
submission count and a solved flag, and nothing else. Everything a run log could
say from that is the submission count, which the tier already says, so two
players who both solved on the second submission would have produced identical
fingerprints and section 18 would be false. Measuring how close a wrong board
came is closed by VECTOR.md 6.1, because that is board information travelling to
someone who has not played, and the fingerprint ships in the same artifact.

So the run is measured on the player's side: `VectorState` gains `effort`, one
`{ cycles, changes }` record per spent submission, and `pending` for the
submission not yet made. `cycles` counts accepted edits and `changes` counts the
ones that landed on a cell already holding an arrow. Neither reads a clue or the
solution, so neither can encode the answer, and they distinguish a player who
walked the board once from one who reworked it three times at the same tier.

`stateVersion` is therefore 2 and `migrateState` from 1 still refuses. Filling
zeros for submissions whose effort was never recorded would put a false
statement about the player's run into a shareable artifact, and engine decision
10 already prices the refusal at one unfinished board and never a streak.

**The share output did not change.** `shareArtifact` and the v2 `shareBlock` are
built from the same two functions in `src/games/vector/telemetry.ts`, so the
block is byte identical to what shipped and VECTOR.md 12 is not reopened. The
artifact carries the rows, the v3 outcome and the fingerprint: one point per
submission, chronology across, effort band up, and a shape separating the
submission that landed from one that was reworked and one that was not.

**Leak checks run as tests, with positive controls.** Four probes in
`telemetry.ts` cover position, answer property, ordering and shape, and the
harness covers the title and the fingerprint. The answer property probe states
the real claim: the rows are a function of the outcome alone. Each probe has a
test that feeds it a deliberately leaking artifact and requires it to fire,
because a probe that has never fired is not evidence.

Declared: grammar A, patterns `emergent-fingerprint` and `comparative-friction`,
`maxRows` 3.

Deferred, in BACKLOG.md: the section 19 archetype, because the thresholds want a
second game's data; and the graphic card, which is still unbuilt for every game.

## Slate reconciliation. Done 2026-09-13.

The lineup approved in the status table was carried into `src/shell/registry.ts`,
which until now still advertised the cancelled TALLY DROP and RECALL on the hub.
Three decisions were needed to do it, and three defects surfaced on the way.

**Composition A: the suite is eight games.** Three live plus five planned. This
is a stated deviation from the charter's Section 0, which ships the suite as five
games on one site, and from requirement 7.3.1, which has the hub listing five.
Approved 2026-09-13.

**The daily card covers only the games a player finished that day**, which is
what `dailyCardBlock` already did, so no code changed here.

**The cap is a live conflict and it is recorded rather than resolved.** The v2
engine allows eight rows, `SHARE_MAX_ROWS`, which with a title and a URL is the
ten line block charter decision 1 as amended permits. Section 49 of this document
replaces that with a hard nine lines including title and URL, which is seven rows,
and `validateArtifactText` enforces it. So under v3 a player who finishes seven
games produces a card sitting exactly at the cap and a player who finishes eight
produces one over it. Nothing fails today, because the daily card is still v2 code
and is not run through the v3 grammar, and it fails on the day the suite's share
path migrates. Composition A is what created this: at five games the two caps
never disagreed. Three ways out exist and none is chosen here: cap the card at the
seven most recent finishes, encode two games per row, or let it truncate with the
telemetry fault of engine decision 21. Logged in BACKLOG.md.

**VECTOR LOCK is renamed ROTATE LOCK.** This closes the BACKLOG item about the
name colliding with the shipped VECTOR. The ids `vector` and `rotate-lock` were
never in conflict mechanically; the collision was a human one and it is gone.

Hues are now spaced forty degrees apart across all eight games, which is the
widest even spacing eight accents admit, and the three live hues are unchanged.
The five new one line rules, bucket counts, failure models and registry order are
provisional. Order in particular, because the list runs longest session to
shortest and none of the five has a stated session length yet. Each is replaced
by that game's design document, and the registry test holds a game to its module
only once the module exists.

**Requirement 7.1.1 is not satisfied by this lineup, and it is recorded rather
than resolved.** Three of the five are order a permutation under constraints and
the other two are rotate route pieces under checkpoints, so five games exercise
two cognitive modes. Across all eight, the suite has no categorization game and
no pattern or memory game, the latter because RECALL was the one that covered it.
Logged in BACKLOG.md with the pool concepts that would close the gap.

### Three defects in the VECTOR integration, found and fixed here

VECTOR shipped without being added to the registry test's module agreement loop,
which is the check suite decision 1 relies on to keep the registry copy true.
Two fields had drifted behind it.

1. **`stateVersion` said 1 and the module says 2**, since the Phase 2 effort
   record. `suite.ts` builds the hub's `GameStore` from the registry value, so
   the hub opened a v2 payload expecting v1 and the refusing migration dropped
   it. A player part way through a VECTOR board could see the hub card read not
   started. Corrected to 2.
2. **`boardFontStack` said the shared `MONO`** and the module states an SF Mono
   stack. Requirement 7.3.8 gives every game its own board typography, so the
   registry copies the module rather than flattening it, and `MONO_SF` was added.
3. **The agreement loop covered POKER GRID and CIPHER only**, which is why 1 and
   2 were invisible. VECTOR is in it now and the comment says plainly that adding
   a game to the list is not optional bookkeeping.

Two hub test literals, `1/5` and `1 of 5 finished`, also hardcoded a count the
registry already states. That is Phase 11 defect 8 a second time, in a file that
had already been corrected for it once. Both derive from `SUITE_GAMES.length`
now.

Green after the change: 54 files, 637 tests, three typechecks, the dependency
check, the production build, and the byte budget with the hub at 17.0 KB gzipped
against a 150 KB ceiling.

## Phase 3, CIPHER on v3. Done 2026-09-13.

CIPHER implements v2 and v3 at once, in the shape phase 2 established, with no
engine change and no shell change, and the suite is green: 56 files, 678 tests,
three typechecks, the dependency check, all three game verifiers, the production
build and the byte budget.

**The prediction held: no state change.** `CipherState.guesses` already carried
every code the player submitted, and `deserialize` rebuilds all of it from the
stored digits, so the run log survives a reload without a stored field.
`stateVersion` is still 1, no save is refused, and the migration cost a player
nothing. This is the difference phase 2 flagged and it is worth naming: VECTOR
had to add `effort` because its state held a board and a counter, and CIPHER did
not because its state holds a history.

**The run log is integers derived from the guesses, and the guesses stay
behind.** A guessed code beside its feedback is the day's answer in all but
name, so `cipherEntries` reads the codes and writes none of them. Each entry
carries the index, the feedback pair the share row already shows, `churn`, the
count of slots changed since the previous guess, and `discipline`, a three step
grade of whether the guess was licensed by the feedback the player already held:
consistent with everything, consistent with the most recent only, or consistent
with nothing. The first guess is disciplined by definition, because an empty set
of constraints contradicts nothing.

**The fingerprint is two independent axes, neither of them the code.** Section
18, taken literally: x is the guess index, y is churn, and the shape is
discipline mapped onto accepted, correction and refused. A player can move one
slot and contradict themselves or jump all four and stay consistent, so two
players who both solve in three are separated by how they got there. A y built
from the feedback would have been the rows restyled, which is the failure mode
section 18 exists to prevent. Two three guess solves are asserted to produce
different fingerprints.

**Difficulty is recomputed, never read.** CIPHER's measure was already emergent
and already an integer, the count of codes still consistent after the fixed
opening, but it lived only in `solver.ts`, which the module cannot import
because the solver's feedback table is 1.7 megabytes. `src/games/cipher/
difficulty.ts` now holds the opening, the code space enumeration and a table
free form of the measure, at under a millisecond per call, and the solver
imports the opening and the enumeration from it rather than declaring a second
copy. The solver keeps its table backed measure, because verification runs it
beside a full minimax line, and a test proves the two agree on all 1,296 codes.
A second test recomputes the difficulty of all 365 stored entries and asserts it
equals every `best.remaining`, with a nonsense value in the puzzle handed in so
a module that read instead of measured would fail. That is section 52 risk 2
made mechanical, and it also confirms the fourteen classes CIPHER.md 8.1 names.

**The share output did not change.** `shareArtifact` and the v2 `shareBlock` are
built from the same `artifactTitle` and `artifactRows`, so the block is byte
identical to what shipped and CIPHER.md 10 is not reopened. The existing module
tests, which assert exact rows and exact titles, passed unedited across the
restructure, which is the evidence rather than the claim. Six rows plus a title
and a URL is eight lines, so section 49's nine line cap costs CIPHER nothing.

**Leak checks run as tests, with positive controls.** Four probes in
`telemetry.ts` cover position, answer property, ordering and shape, and the
harness covers the title and the fingerprint. The position probe states the real
claim: a row is sorted by rank, so no cell position corresponds to a slot, which
is what CIPHER.md 10 sorts to prevent. The answer property probe holds every row
to being a legal feedback pair and the title to a fixed pattern, which closes
the channel a difficulty class could otherwise travel down. Each probe has a
test that feeds it a deliberately leaking artifact and requires it to fire.

Declared: grammar A, patterns `emergent-fingerprint` and `comparative-friction`,
`maxRows` 6.

One correction to the record, not to the design: CIPHER.md 10.1's worked
examples printed `CIPHER 251 Great` and the shipped title has always been
`CIPHER #251 Great`. The tree is the authority and the examples now match it.

Deferred, in BACKLOG.md: the section 19 archetype, which now has two run shapes
to draw thresholds from and is therefore buildable for the first time, and the
graphic card, still unbuilt for every game.

## Phase 4, POKER GRID on v3. Done 2026-09-16.

POKER GRID implements v2 and v3 at once, in the shape phases 2 and 3
established, with no engine change and one suite level data correction, and the
suite is green: 58 files, 723 tests, three typechecks, the dependency check, all
three game verifiers including a full 365 day POKER GRID horizon, the production
build and the byte budget.

**A correction to this document before anything else.** The phase 4 note above
said POKER GRID's share block has a summary bar to carry. It does not. Recorded
conflict resolution 9 and POKER-GRID.md 14.1 dropped the bar in charter Phase 2,
and the shipped `shareBlock` has always emitted one single glyph row per hand.
Rows are one per attempt after all, so the mapping is the same shape as the other
two. The consequence is not nothing: seven hands plus a title plus a URL is nine
lines exactly, so POKER GRID is the first game in the suite to sit **on** section
49's cap rather than under it. `maxRows` is 7 and the test that renders a perfect
clear through the grammar, and then adds an eighth row and requires it to fail,
is load bearing rather than a formality.

**The prediction did not hold: a state change was needed.** `PokerState` held a
board and a result and nothing about how the player reached either. The one run
shaped field was `hands`, and `hands` is exactly what the share block renders, so
a fingerprint built from it would have been the rows restyled and section 18
would have been false. This game follows VECTOR and not CIPHER, and the rule that
separates them is now visible: a state that holds a **history** gets its run log
free, a state that holds a **position** does not.

`rules.ts` gained `PokerEffort`, one `{ taps, backs }` record per committed hand
plus a `pending` record for the hand being built. `taps` counts accepted `add`
actions and `backs` accepted `truncate` actions since the previous commit. Only
accepted actions, because a refusal returns `err` and never reaches a new state,
which keeps `applyPokerAction` pure and keeps the section 34 property that a
refused action leaves the state byte identical literally true. `stateVersion` is
therefore 2 and `migrateState` from 1 still refuses, for phase 2's reason
unchanged.

The two axes are rework depth, `taps` above the five a hand costs, and correction
count, `backs`. They are correlated and neither determines the other: one
truncation back three cells and three truncations of one cell each produce the
same rework and a different shape. Neither reads a card or a cell, so neither can
be inverted into anything about the board. Two runs that share every row and
every hand are asserted to produce different fingerprints.

**The leak question for this game is different, and it is worth stating.** Locked
decision 3 gives POKER GRID perfect information: the board is fully visible from
the first tap and there is no hidden answer to spoil. What is hidden is best
play, and that reaches a reader as exactly one ordinal out of five in the title,
which requirement 6.5.4 puts there deliberately. So the four probes hold the
artifact to the player's run plus that one grade: one glyph per row so no cell
index can ride along, a title pattern that no score or lever name can pass, a row
count agreeing with the outcome's own card count, and a silhouette whose only
free dimension is its height. Each probe has a test that feeds it a deliberately
leaking artifact and requires it to fire.

**Difficulty is half measured and half read, and that is the phase's one real
deviation.** Generation decision 7's measure is the mean greedy shortfall over
nine seeded runs as a fraction of best known score. The greedy half is cheap and
the module replays it. The denominator is a width 400 beam over seven plies,
which takes the generation job over an hour for a year, and no extraction makes
it browser work. That is the difference from CIPHER, where the expensive thing
was a 1.7 megabyte table sitting on a measure that was cheap underneath.

`src/games/poker-grid/difficulty.ts` holds the measure as basis points from
integer inputs, so Node and the browser agree exactly rather than within a
tolerance chosen to hide a drift. Section 52 risk 2 is closed in two places
rather than one: `PokerPuzzle` carries no difficulty field at all, so
`parsePuzzle` cannot read the stored number even by accident, and
`tools/verify.ts` now recomputes the v3 integer for every entry beside its
existing solver replay, which a full horizon run confirms. A sampled check in
`tests/tools/poker-grid-pipeline.test.ts` covers every weekday and every chunk
in the unit suite, because replaying the whole horizon there would roughly
double it.

One field had to be carried to make that work. `parsePuzzle` now reads the
`attempt` generation decision 10 has recorded since charter Phase 7, because the
greedy salt is keyed by it. This is a parse change and not a manifest
regeneration; the field was already on disk. Past the horizon there is no
denominator, so `UNRATED_DIFFICULTY` is -1, the numeric sibling of a null tier,
asserted never to appear on a manifest entry.

**The share output did not change.** `shareArtifact` and the v2 `shareBlock` are
built from the same `artifactTitle` and `artifactRows`, so the block is byte
identical to what shipped, including the space before the streak that differs
from CIPHER's comma and was left alone.

**Two defects found, both in the module's own house.**

1. `PokerState.exceededStoredBest` was written by nobody and read by nobody:
   initialised false, serialised, deserialised, set nowhere. Contract decision
   17's finding happening inside a game's state. Removed inside the same version
   bump, so it cost no extra migration. The case it was for is real, since a beam
   result can be beaten by a human, and it is logged rather than lost.
2. **`src/shell/registry.ts` said POKER GRID was state version 1.** Caught by the
   agreement loop, which is the third time that loop has earned its place and the
   second time on this exact field. `suite.ts` builds the hub's `GameStore` from
   the registry value, so a part finished board would have read as not started on
   the hub card. Corrected to 2.

Declared: grammar A, patterns `emergent-fingerprint` and `comparative-friction`,
`maxRows` 7.

POKER GRID grew from 24.9 KB to 27.4 KB gzipped, which is `greedy.ts` plus the
two new files, against a 150 KB ceiling.

Deferred, in BACKLOG.md: the section 19 archetype, which now has three run shapes
to draw thresholds from; the graphic card, still unbuilt for every game; and the
shared effort record, which phase 2 said phase 4 was the last chance to make a
pattern.

## Phase 5, the shell on v3 and the gate. Done 2026-09-16.

Part A moved the shell, the hub and the daily card onto v3 and left one share
composer in the codebase. Green after the change: 59 files, 762 tests, three
typechecks, the dependency check, all three verifiers including the full 365
day POKER GRID horizon, the production build, a development build of the
fixture, and the byte budget with POKER GRID at 27.8 KB gzipped. A headless
Chromium pass at 360 pixels booted the hub and all three games with no console
error, finished a CIPHER day, shared it, and read the clipboard and the hub's
daily card back, both inside the grammar.

### Decisions, approved 2026-09-16

1. **One switch, no flag.** Each entry mounts the game's `*V3` export and
   `main.ts` takes `AnyGameModuleV3`. Phases 2 to 4 had already proved the v3
   title and rows equal to the v2 block for every game, and every row in every
   live block is the same width, so v2's padding was doing nothing. The claim is
   now a test: `tests/shell/share-context.test.ts` asserts, per game and across
   rated and unrated outcomes, that the string the shell delivers is byte
   identical to the string v2 shipped.
2. **`bucketOf` and `tierOf` are gone from `GameModuleV3`.** Both restated
   fields `inspect` already returns, which is section 53's drift inside the
   contract. The shell reads `outcome.bucket` and `outcome.tier`. The games keep
   `bucketOf` only because the v2 contract still names it, and a test in each
   game holds it equal to the outcome until phase 6 deletes it.
3. **`toy-v3` is the permanent fixture**, with the entry and page `toy-tap` had.
   `toy-tap` is deleted and contract decision 12 is amended.
4. **The v2 share path is removed now; the v2 contract waits for phase 6.**
   `composeShare`, the padding, `SHARE_PAD_TOKEN` and the v2 `SHARE_MAX_ROWS`
   of 8 are deleted. `ShareBlock` and the games' `shareBlock` remain as types and
   methods nothing renders, because the v2 `GameModule` and `tools/new-game.ts`
   still require them.

### What changed

**One composer.** `engine/share-grammar.ts` gained `ShareText`, the title and
rows the grammar actually reads, and `composeShareText`, which validates,
renders and repairs. `SHARE_MAX_ROWS` is now `SHARE_MAX_LINES - 2`, so the old
disagreement between v2's eight rows and the nine line cap cannot recur.

**Requirement 3.5.4 moved from padding to validation.** v2 made rows uniform by
padding them; v3 has no padding, so the grammar refuses ragged rows with a new
`ragged-rows` fault. All three live games already comply, which their shape
probes assert.

**Engine decision 21 carried into v3.** A defect found at share time is a
telemetry fault and a repaired string, never an exception. The repair only
removes: the title is cut to its first line, rows and tokens are capped, empty
rows are dropped. A ragged block ships as it is, because padding would add a
claim the player did not make. A bad URL still throws, since it is a suite
constant rather than module output. `engine/artifact.ts` gained
`composeArtifact`, which adds the two faults only an artifact can have, a missing
fingerprint and an unfinished outcome, neither of which changes the string.

**`engine/share.ts` is delivery only.** Section 53 answers "how is the share
delivered" with this file and "what does the player share" with telemetry to
ArtifactModel; the file now holds the first and nothing of the second.

**The daily card is a `ShareText`, not an `ArtifactModel`.** It has no outcome
and no fingerprint, and inventing either would be the second scoring path
section 52 risk 1 names. `dailyCardShare` replaces `dailyCardBlock` and the hub
composes it with the same `composeShareText` a game's artifact goes through. A
fully finished eight game suite is three lines. A ninth game would wrap into a
short second row, which the grammar refuses as ragged; `dailycard.test.ts`
fails on that day by design, so how a partial row reads is decided then.

**The shell's share path is a pure function.** `composeResultShare` in
`shell/share-context.ts` runs the module's run log, the module's artifact and
the engine's composer, and `main.ts` calls nothing else to share.

**`ENGINE_VERSION` is 2.** The engine chunk's exports changed, and the version
bearing URL is what stops a cached `engine-v1.js` meeting a game chunk that
imports the v3 composer. The chunk grew from 10.67 to 11.10 KB gzipped.

### Files

| Path | Change |
|---|---|
| src/engine/share-grammar.ts | `ShareText`, `ragged-rows`, `SHARE_MAX_ROWS`, `composeShareText` |
| src/engine/artifact.ts | `composeArtifact` |
| src/engine/share.ts | Assembly removed; delivery only |
| src/engine/dailycard.ts | Returns `ShareText` as `dailyCardShare` |
| src/core/types.ts | v2 `SHARE_MAX_ROWS` removed; `ShareBlock` marked for phase 6 |
| src/shared/share-vocabulary.ts | `SHARE_PAD_TOKEN` removed |
| src/contract/v3/game-module.ts | `bucketOf` and `tierOf` removed |
| src/games/cipher/module.ts, poker-grid/module.ts, vector/module.ts | `tierOf` removed |
| src/games/toy-v3/module.ts | Promoted to the permanent fixture |
| src/games/toy-tap/module.ts | Deleted |
| src/shell/main.ts | Reads `AnyGameModuleV3` and `OutcomeV3`; shares through `composeResultShare` |
| src/shell/boot.ts | `PuzzleSource` takes the v3 module |
| src/shell/share-context.ts | `composeResultShare` |
| src/shell/suite.ts, src/hub/hub.ts | Daily card through the grammar |
| src/shell/entries/*.ts, toy-v3.html | Mount the v3 exports; toy-tap entry replaced |
| tools/share-harness/bind.ts, cases.ts, main.ts | Compose through the grammar and report repairs |
| tools/new-game.ts | Reserves `toy-v3` instead of `toy-tap` |
| vite.config.ts | `toy-v3` target; `ENGINE_VERSION` 2 |
| tests/engine/share-grammar.test.ts | New: rendering, every refusal, every repair |
| tests/engine/artifact.test.ts, dailycard.test.ts, share.test.ts | Moved to the one composer |
| tests/shell/share-context.test.ts | Byte identity per game, replay streak, defective artifact |
| tests/shell/boot.test.ts, tests/tools/share-harness.test.ts | v3 module type; harness cases held to their expected fault |
| tests/games/cipher, poker-grid, vector module tests | `bucketOf` held equal to the outcome; `SHARE_MAX_ROWS` from the grammar |
| NEW_GAME.md, .github/copilot-instructions.md, .github/instructions/contract and tools-and-build | Fixture and share path references |

### Part B, the certification gate as a CI job. Done 2026-09-16.

Green after the change: 62 files, 818 tests, three typechecks, the dependency
check, all three verifiers, the production build and the byte budget (VECTOR
28.1 KB gzipped, the rest unchanged), `npm run certify` writing a production safe
record for all three games, `certify --check --from-ci` passing against a release
build, and the offline smoke below.

#### Decisions, approved 2026-09-16

1. `tools/certify.ts` runs every gate step that exists for each live game and
   writes `data/<game>/certification.json`.
2. `n/a` is admitted only with a written reason stored in the record.
   `decomposition-check` and `symmetry-check` are `n/a` for all three live games,
   because they were built before section 12 and no checker exists.
   `difficulty-calibration` is a pass on the committed legacy studies.
3. Any automated step that fails fails CI.
4. `manual-mobile-check` is `pending` under exemption `manual-mobile-2026-09-16`,
   covering POKER GRID, CIPHER and VECTOR only, issued 2026-09-16 and holding to
   2026-12-15 inclusive.
5. `vite.config.ts` reads each game's release status from its record.
6. `ci.yml` gains `vector:verify` and the certify step.
7. `offline-smoke` is a recorded manual result, not a CI browser step.
8. The certify step in CI trusts the npm steps before it through `--from-ci`,
   rather than rerunning them, and refuses that flag outside CI.
9. The record has no `generatedAt`. It has `certifiedCommit` and `outcomesHash`.

#### What changed

**The gate is data.** `engine/certification.ts` holds `GateCheck`, a
discriminated union that makes a reason mandatory for `n/a` and an exemption id
mandatory for `pending`, the `GATE_EXEMPTIONS` table, and `refusalsFor`, which
lists every reason a record is not safe on a given local date. `isProductionSafe`
is that list being empty. Adding an exemption is an edit to engine source.

**Two records, not one.** The type part A left in place mixed a per game gate
result with a per puzzle `VerificationResult`. The gate record is now
`CertificationRecord`; the section 25 per puzzle record a manifest entry may carry
is `PuzzleCertification`, and `ManifestEntryV3.certification` names it.

**Probes, shared by key.** Each step is a list of probes: an npm script, a spec
file that must exist under a passing `npm test`, a committed file, a manifest
index declaring at least 365 days, or a game page present in the budgeted build.
Steps that name the same probe share one run, so a local certification runs each
command once, about three minutes. A certification build sets
`DAILYKIT_CERTIFY_BUILD` and writes to `dist-certify/`, which admits every live
game whatever its record says, so a game can be measured before its first record
exists and nothing that directory holds is ever deployed.

**The record changes only when the gate does.** `outcomesHash` is sha256 over the
canonical JSON of the game id and its checks. `certify` keeps the committed record
when the hash is unchanged, and `--check` fails when it would not. `parseRecord`
recomputes the hash, so a hand edited outcome reads as no record at all.

**No deadlock on a failed record.** The first design had a test asserting every
committed record passed. Because the tests are evidence inside the records, one
failure would have held the records failed forever: the next run would see that
test fail and write the failure again. It happened once in this phase and is why
the test now asserts only that a present record parses in canonical form. Whether
a record is safe and current is `certify --check`'s question.

**The build reads the gate.** A game target's `productionSafe` may only be false;
its release status comes from `productionSafeFromDisk`. A production build that
leaves out a live game warns rather than fails, because the certify step is what
fails CI, and a `GAME=<id>` production build of an uncertified game throws.

#### Defects the gate found in live games

1. **VECTOR could not load a real day.** `tools/vector-generate.ts` wrote the
   index as `horizon: { first, last }` with chunks carrying `first`, `last` and a
   relative url. `PuzzleSource` reads an integer horizon and chunks with `from`,
   `to` and a site absolute url, refused the index, and showed "The puzzle list
   could not be loaded." to every player past the practice board. Every earlier
   check stopped at the practice board, and every `PuzzleSource` test used a
   stub. Found by the offline smoke. The generator now writes the shell's shape
   and requires `--first 1`, the verifier reads it, the committed index was
   rewritten with the chunk bytes untouched, and `tests/shell/boot.test.ts` loads
   days 1 and 365 of every live game from the committed files through the real
   module. That test is now evidence for `manifest-round-trip`, and the horizon
   probe refuses the old shape.
2. **VECTOR had no renderer test.** `accessibility-contract` had no evidence for
   game three. `tests/games/vector/render.test.ts` covers the grid roles, one
   focus stop, labels for clues, blanks and placed arrows, arrow key movement,
   keyboard play, the live status, submit, read only replay and teardown.
3. **POKER GRID had no duplicate check across its horizon.** Its verifier checked
   35 distinct cards within a board, not distinct boards across days.
   `assertNoRepeatedBoard` compares decoded cells, since the codec is keyed by day.

#### Offline smoke, recorded 2026-09-16

Headless Chromium at 360 pixels against `vite preview` of the release build with
`engine-v2.js`: each page visited online, the worker activated and controlling,
the server stopped, the context set offline, then every page revisited. The hub
rendered its eight cards, POKER GRID 35 cards, CIPHER its six keys and VECTOR its
36 cells, with no console error. Before the VECTOR index fix the same run failed on
VECTOR, which is the defect above. The evidence string is in each record and the
run is owed again after any change to the worker or to asset naming, per offline
decision 12.

#### Files

| Path | Change |
|---|---|
| src/engine/certification.ts | `GateCheck`, `GATE_EXEMPTIONS`, `CERTIFICATION_SCHEMA`, `refusalsFor`, `isProductionSafe` by date; `PuzzleCertification` split out |
| src/contract/v3/types.ts | `ManifestEntryV3.certification` is `PuzzleCertification` |
| tools/certify.ts | New: plans, probes, records, and the runner |
| tools/budget.ts | Takes the directory to budget as an argument |
| tools/verify.ts | `assertNoRepeatedBoard` |
| tools/vector-generate.ts, tools/vector-verify.ts | The shell's index shape |
| data/vector/manifest.index.json | Rewritten in the shell's shape; chunk unchanged |
| data/poker-grid, cipher, vector/certification.json | New: the committed records |
| vite.config.ts | Game release status from the record; certification build |
| package.json | `certify`; `clean` removes `dist-certify` |
| .gitignore | `dist-certify` |
| .github/workflows/ci.yml | `vector:verify` and the certify step, applied by the owner from a patch |
| .github/instructions/tools-and-build.instructions.md | The gate in the build rules, same patch |
| NEW_GAME.md | Step 6 names certification as how a game ships |
| tests/engine/certification.test.ts | New: every refusal |
| tests/tools/certify.test.ts | New: plans against the repository and ci.yml, probes, checks, records |
| tests/games/vector/render.test.ts | New: VECTOR's accessibility contract |
| tests/shell/boot.test.ts | Committed manifests through the real source and modules |
| tests/tools/poker-grid-pipeline.test.ts | The duplicate check, both directions |
| tests/games/vector/module.test.ts | Reads the site absolute chunk url |

## Phase 6, retire the v2 contract. Done 2026-09-17.

One contract. The v2 `GameModule`, `defineGame` and `ShareBlock` are deleted,
each game's `bucketOf`, `shareBlock` and v2 default export are gone, each game's
default export is its v3 module, and `npm run new-game` scaffolds v3 together
with the game's `GAME_PLANS` row.

Green after the change, against the part B baseline: three typechecks, the
dependency check, 62 files and 833 tests (818 before, net of tests deleted with
the v2 surface), all three verifiers, the production build, the byte budget
(VECTOR 28.0 KB gzipped, the rest unchanged), `npm run certify` reporting all
three games production safe with every committed record unchanged, and an
offline smoke below.

### Decisions, approved 2026-09-17

1. **`MountContext` and `GameView` stay in `src/contract/types.ts`.** Only the
   v2 module type, `defineGame` and `ShareBlock` were deleted around them.
   Moving them would change imports in every game, the shell and the tests for
   a tidier folder name; folding `contract/v3/` into `contract/` is in
   BACKLOG.md.
2. **The scaffold writes the plan row directly**, above a new
   `/* NEW_GAME_INSERTION: GAME_PLANS */` marker in `tools/certify.ts`, as it
   already did for `TARGETS`. A printed row was rejected because the failure
   would only show when the game is marked live and certify refuses it.
3. **A stub's unpassable steps are empty probe lists.**
   `difficulty-calibration`, `decomposition-check`, `symmetry-check`,
   `offline-smoke` and `manual-mobile-check` get no probes, which `checksFrom`
   records as `skip` and the gate refuses. Not `n/a`, because a reason written
   by a tool is not a reason anyone checked, and not `pending`, because no
   exemption covers a new game. Automated steps get real probes on the files the
   scaffold writes or the game must add.
4. **`ENGINE_VERSION` moves to 3 only if the engine chunk's exports change.**
   They did not: `engine-v2.js` after the deletion is byte identical to part B's,
   30,262 bytes with the same 61 exports, because the erasure casts compile to
   the same function. It stays 2.
5. **`certify` launches npm without a shell**, as `process.execPath` running
   `npm_execpath` with `run <script>`. Windows needed a shell to spawn `npm`,
   and a shell spawn with an argument list is deprecated there. Started other
   than through npm, certify stops and says so rather than guessing.

### What changed

**Each game module is v3 only.** The one implementation object is now annotated
`GameModuleV3` directly, and `export default defineGameV3(...)` replaces the v2
default and the named `cipherV3`, `pokerGridV3` and `vectorV3`. The entries,
`tests/shell/boot.test.ts` and `tests/shell/share-context.test.ts` import the
default. `bucketOf` and `shareBlock` are gone from each module and its
`internals`.

**Byte identity became fixed strings.** Before deleting the v2 block, each test
that compared the v3 artifact against it was run against the v2 path and its
output recorded. `tests/shell/share-context.test.ts` now holds a `SHIPPED` table
per case, live rated, live unrated and archive, and a test that the table and the
cases name each other exactly. The module and telemetry tests that compared
title and rows with `shareBlock` compare with the recorded strings, and the
tests that held `bucketOf` equal to the outcome assert the recorded buckets.
A change to any of these is a change to what players paste, not a test update.

**`newGamePlan(gameId)` in `tools/certify.ts`** is the stub plan: the suite steps,
`tests/games/<id>/generator.test.ts`, `module.test.ts` and `render.test.ts` as
evidence, `npm run <id>:verify` and the manifest horizon for verification,
horizon and duplicates, the byte budget over the game's page, and the five empty
steps, each with a comment saying the author replaces it. The scaffold's row is
`"<id>": { ...newGamePlan("<id>") }`, so a step is replaced by overriding its
key. `tests/tools/certify.test.ts` asserts that a record built from the stub
with every probe passing is not production safe and refuses exactly those five
steps, and that the manual mobile exemption does not cover it. A stub is also
`planned`, so certify does not evaluate it until its author marks it live.

**The scaffold writes v3.** Its game is unchanged in kind, find one target cell
on a three by three board in three misses, and is rewritten against
`GameModuleV3` with a run log, an artifact with a fingerprint, a measured
difficulty, and share capabilities. It now writes four tests, adding
`generator.test.ts` and `render.test.ts`, which are the evidence its plan names.
Every file and marker is checked before anything is written, and a marker found
twice is refused. Generated in a copy of the tree, its output typechecks, passes
its own 21 tests and the dependency check, and its plan, evaluated with no
verifier or manifest yet, refuses on exactly the five skips plus the three
verifier steps and the byte budget.

**Two scaffold defects from charter Phase 12, corrected.** Its renderer drew a
question mark on the untapped target cell, which showed the day's answer, and it
never imported its stylesheet. The render test now asserts the target cell is
indistinguishable from any other until a tap finds it.

**NEW_GAME.md rewritten.** The contract checklist is `GameModuleV3`'s, the design
document list is section 44's, and a new certification section says a game ships
only through its own record, how the stub plan works, and how to replace each of
its five steps.

### Offline smoke, recorded 2026-09-17

Headless Chromium at 360 pixels against `vite preview` of the release build with
`engine-v2.js`: the hub and each game visited twice online, the second visit past
the practice board on a real day, the worker active, then the context set
offline and every page revisited. The hub rendered its cards, POKER GRID its
board, CIPHER its keys and VECTOR its 36 cells, with no console error. The worker
and asset naming did not change, so the committed `offline-smoke` evidence of
2026-09-16 stands and no record changed.

### Found and not fixed

**The scaffold refuses every planned slate id.** `validateGameId` refuses an id
already in `SUITE_GAMES`, and the five approved unbuilt games are already there
as `planned` rows, so `npm run new-game -- --id rotate-lock` is refused. The
scaffold has only ever been run against a new id. Left for the owner, because the
choice is whether the scaffold adopts an existing planned row and its provisional
`bucketCount` and `hasWinLoss`, or the author deletes the row first.

### Files

| Path | Change |
|---|---|
| src/contract/game-module.ts | Deleted |
| src/contract/types.ts, src/contract/v3/game-module.ts, src/contract/v3/types.ts | Comments only; v3 is the only contract |
| src/core/types.ts | `ShareBlock` deleted |
| src/engine/storage.ts | A comment naming `bucketOf` |
| src/games/cipher/module.ts, poker-grid/module.ts, vector/module.ts | v2 surface deleted; default export is the v3 module |
| src/shell/entries/cipher.ts, poker-grid.ts, vector.ts | Import the default export |
| tools/certify.ts | `newGamePlan`, the `GAME_PLANS` marker, npm without a shell |
| tools/new-game.ts | Rewritten: v3 scaffold, four tests, three insertions, checks before writes |
| tests/shell/share-context.test.ts | Fixed strings recorded from v2 |
| tests/shell/boot.test.ts | Default imports |
| tests/games/cipher/module.test.ts, telemetry.test.ts | Artifact in place of the block; recorded buckets and strings |
| tests/games/poker-grid/module.test.ts, tests/games/vector/module.test.ts | The same |
| tests/tools/certify.test.ts | The stub plan and npm launch tests |
| tests/tools/new-game.test.ts | v3 output, plan evidence, the third marker, name validation |
| NEW_GAME.md | Rewritten for v3 and certification |
| CIPHER.md, POKER-GRID.md | Bucket named as an outcome field |
| .github/copilot-instructions.md, .github/instructions/contract, games and tools-and-build, .github/prompts/onboard.prompt.md | v3 contract names, applied by the owner from `phase6-github.patch` |
| ARCHITECTURE.md | Status, manifest rows, contract decisions 2, 3 and 5 amended, template decisions 1 and 5 amended, 7 to 9 added |
| BACKLOG.md | The folder fold and the V3 suffix rename |

## Charter Phase 13, ROTATE LOCK. Built 2026-09-17, planned until its manual mobile check.

Not a migration phase: the first game authored on v3 from its first line, logged
here because this section is the handoff record. ROTATE-LOCK.md is the design
document and answers every item of section 44.

### Decisions, approved 2026-09-17

1. **ROTATE LOCK first** among the five, the most complex, overriding
   PHASE-13-PLAN.md section 1.1's order.
2. **Scaffold option A.** `npm run new-game` adopts a planned registry row.
   Template decision 10 in ARCHITECTURE.md. Built and tested before the scaffold
   ran for `rotate-lock`, and proven in two throwaway copies: the real row, and a
   row changed to seven buckets, win and loss, state version 3, each typechecking
   and passing its own tests with the registry byte for byte unchanged.
3. **The design document and the build in one conversation**, the owner's answer
   to HANDOFF's open question.

### What was built

Nine source files under `src/games/rotate-lock/`: `route.ts` (the trace, the
whole rule), `solver.ts` (route level search, dead turns, exact par), `rules.ts`,
`generator.ts`, `layout-codec.ts`, `telemetry.ts`, `module.ts`, `render.ts`,
`help.ts`, plus `style.css`. Three tools: generate, verify, calibrate. A 365 day
manifest, the calibration study, and seven test files.

The game as settled, briefly: seven straight pieces of length 1 to 3 on a six by
six board; swap two or rotate one clockwise, each a move; the route opens the
lock when it stays on the board, never re-enters a cell, turns at every mark and
ends on the lock, and it may turn elsewhere. Scored by moves against an exact
par, five tiers, a jam at 56 moves. Difficulty is dead turns. Share grammar B:
one meter token per move, a hollow one for a move back into an arrangement the
run had already been in.

### Found while building, inside the game

1. **The rule that turns happen only at marks made every board trivially
   unique.** The prototype found one route for every candidate and a difficulty
   of at most a few dozen dead turns, which cannot fill seven bands and reads as
   connect the dots. Allowing unmarked turns and hiding up to two corners as a
   lever made uniqueness a real screen (half the candidates at one hidden turn,
   six sevenths at two) and the difficulty an 871 value distribution.
2. **The first verifier took 117 seconds.** A sound distance and parity prune,
   written in the verifier and not borrowed from the solver, brought it to 53.
3. **The scaffold's share title read the win flag.** An adopted row with
   `hasWinLoss: false` titled a found target "not found". Fixed in the template
   to read the find itself, with a test.

### Green after the change

| Gate | Result |
|---|---|
| Typecheck | the three programs |
| Dependency check | layers verified |
| Tests | 69 files, 909 tests, 62 and 833 before |
| Verifiers | POKER GRID 365, CIPHER 365, VECTOR 365, ROTATE LOCK 365 in about 53 seconds |
| Production build | engine chunk `engine-v2.js` 30,262 bytes, byte identical; ROTATE LOCK absent, as a planned game must be |
| Byte budget | Hub 17.6, POKER GRID 27.8, CIPHER 25.7, VECTOR 28.0, About 3.4 KB gzipped; ROTATE LOCK 28.3 in a certification build |
| `certify -- --check` | three games production safe, every committed record unchanged |
| ROTATE LOCK gate, registry set live in a copy | every automated probe passed; refused on `manual-mobile-check` alone |

### Offline smoke, recorded 2026-09-17

Headless Chromium at 360 by 740 against `vite preview` of a release shaped build
whose target list admitted rotate-lock by a patch in a throwaway copy: the hub,
ROTATE LOCK twice (the practice board, then day 256 from the manifest), two
moves played, VECTOR and the hub, all with the worker controlling; then offline,
the hub and ROTATE LOCK from cache with 36 cells, 7 pieces and both moves
restored. No console error and no horizontal scroll. Recorded as the manual
`offline-smoke` step of ROTATE LOCK's plan. The screenshot showed the whole game
on one screen at 360 by 740, and showed defects 1 and 2 below.

### Defect report, requirement 7.4

ROTATE LOCK was built with zero engine changes. `src/core`, `src/engine`,
`src/ui`, `src/contract`, `src/shared` and `src/shell` code were not touched;
the suite level edits were data and configuration: the registry row corrected
and moved, a build target and a plan row written by the scaffold, two scripts in
`package.json`, a CI step, and one registry test.

1. **No game renders its own accent.** Wanted: ROTATE LOCK in hue 308. Why:
   requirement 7.3.8. `applyAccent` sets `--dk-accent-hue` on the game root, but
   `--dk-accent` is declared on `:root`, where its `var()` resolves against the
   root hue, 210, and children inherit the computed colour, so every game in the
   suite draws the same blue. Instead: nothing, the game uses the suite variable
   like the others. Correction: redeclare `--dk-accent`, `--dk-focus` and their
   dark and contrast variants on the element `applyAccent` writes to, then
   rebuild all four games and re-run the smoke. This is a live defect in the
   three shipped games, not only the new one.
2. **The header truncates the display name at 360 pixels.** Wanted: ROTATE LOCK
   in full. Instead: nothing; the name shows as "ROTATE ...". Correction: let the
   header title wrap to two lines or step down a size past a length, before
   DIFFERENCE RELAY and ORDER OF OPERATIONS, which are longer.
3. **No ORDER adapter in the presentation kit.** Wanted: section 21's reusable
   adapter. Instead: a roving focus, select and swap keyboard model written in
   `render.ts`, under `custom` input, the second list model after CIPHER's.
   Correction: `ui/listCursor.ts` with focus, select, swap and a pass through
   verb, built with the next ORDER game as its second consumer.

Not defects, recorded so they are not rediscovered: the scaffold stub could not
express a five bucket win and loss game with a jam until option A read those
from the row, and it now does; the gate cannot make a new game production safe
without a person's device check, which is the gate working.

**Could this game have been authored from NEW_GAME.md and the scaffold alone?**
Yes for everything the gate measures, once option A existed: the procedure, the
stub plan and the contract were enough, and nothing reached the engine. The
cheapest change that would have made it smoother is the ORDER list cursor of
defect 3; defects 1 and 2 were invisible to every automated check and only a
rendered screen at 360 pixels found them.

### Files

| Path | Change |
|---|---|
| ROTATE-LOCK.md | New: the design document |
| tools/new-game.ts, tests/tools/new-game.test.ts | Option A, the row driven stub, the title fix |
| tests/tools/certify.test.ts | The no plan case names an id that has none |
| src/games/rotate-lock/* | New: the game |
| src/shell/entries/rotate-lock.ts, rotate-lock.html | New, from the scaffold |
| src/shell/registry.ts | ROTATE LOCK's rule, five buckets and win and loss; first among the planned games |
| vite.config.ts | The rotate-lock target, `productionSafe: false` |
| tools/certify.ts | The rotate-lock plan: calibration, decomposition, symmetry, leak and offline smoke steps |
| tools/rotate-lock-generate.ts, rotate-lock-verify.ts, rotate-lock-calibrate.ts | New |
| data/rotate-lock/manifest.index.json, manifest.1-365.json, study.json | New, generated |
| tests/games/rotate-lock/* | New: seven test files and fixtures |
| tests/shell/registry.test.ts | ROTATE LOCK held to its module while planned |
| package.json | `rotate-lock:generate`, `:verify`, `:calibrate` |
| .github/workflows/ci.yml | `rotate-lock:verify` before build |
| .github/instructions/tools-and-build.instructions.md | The scaffold adopts a planned row |
| NEW_GAME.md | Step 2 and section 12 for adoption; ROTATE LOCK as a reference |
| ARCHITECTURE.md | Status, phase log, manifest rows, template decision 10 |
| BACKLOG.md | The three defects, the rotation verb, the registry loop, the manual check |

### Next

**DIFFERENCE RELAY is game five**, decided 2026-09-17, which restores
PHASE-13-PLAN.md section 1.1's order for the four that remain. Its conversation
begins with the three corrections above, because requirement 7.4 puts them after
the report and before the next game, and because the list cursor of defect 3 must
exist before an ORDER game consumes it. HANDOFF.md carries the detail.

---

## Charter Phase 13, the three ROTATE LOCK corrections. Done 2026-09-18.

The defect report of the ROTATE LOCK entry, applied. All three are engine
changes, which is why they were held back until the game was finished and are
made before DIFFERENCE RELAY begins. Green against that entry's baseline: three
typechecks, the dependency check, 72 files and 940 tests (69 and 909 before),
all four verifiers, the production build, the byte budget, `npm run certify
-- --check` reporting the three live games production safe with every committed
record unchanged, and an offline smoke below.

### Decisions, approved 2026-09-18

1. **Both the corrections and the next game were approved for one conversation**
   by the owner, over the one phase per conversation rule. The corrections are
   recorded here on their own so the record still reads as one phase per entry.
2. **Defect 2 is a hybrid, not the size ladder alone.** The recommendation was
   to step the font size down and never wrap. Measurement refused it. At 360
   pixels the title has **104 pixels** between five 44 pixel touch targets, and
   the rendered widths of every display name in the slate are:

   | Name | 1.05rem | 0.95rem | 0.85rem | 0.78rem | 0.70rem | 0.64rem |
   |---|---|---|---|---|---|---|
   | CIPHER | 74 | 65 | 57 | 52 | 47 | 43 |
   | VECTOR | 80 | 71 | 62 | 57 | 51 | 46 |
   | POKER GRID | 124 | 109 | 96 | 87 | 78 | 72 |
   | TURN TABLE | 123 | 108 | 96 | 87 | 78 | 71 |
   | ROTATE LOCK | 135 | 119 | 105 | 95 | 85 | 78 |
   | RING BALANCE | 149 | 131 | 116 | 105 | 94 | 86 |
   | DIFFERENCE RELAY | 192 | 169 | 149 | 135 | 121 | 111 |
   | ORDER OF OPERATIONS | 237 | 209 | 184 | 167 | 150 | 137 |

   ORDER OF OPERATIONS needs 0.6rem, under ten pixels, to fit on one line, which
   fails requirement 8.1 before it fails taste. So the ladder carries every name
   up to twelve characters and the two longest wrap to two lines at 0.85rem,
   where the longest single word is 100 pixels. The header is `min-height`
   rather than `height` so it grows only when a title wraps.
3. **CIPHER keeps its own key model.** Defect 3 builds `src/ui/listCursor.ts`
   and retrofits ROTATE LOCK only. CIPHER's committed share strings are fixed
   strings since v3 migration phase 6, and a correction pass is the wrong place
   to put them at risk. CIPHER adopts the cursor when it is next opened for a
   reason of its own; BACKLOG.md records it.
4. **`ENGINE_VERSION` stays 2.** The release build's engine chunk still exports
   the same 61 names, because the only importer of the list cursor is a planned
   game and planned games are not in a release. It grew from 30,262 to 30,412
   bytes, which is content and not surface. The version moves to 3 on the build
   that first ships a **live** game importing the cursor, which is the build
   that makes DIFFERENCE RELAY or ROTATE LOCK live.

### What changed

**Defect 1, no game rendered its own accent.** `applyAccent` set
`--dk-accent-hue` on the game root, but `--dk-accent`, `--dk-accent-text` and
`--dk-focus` were declared on `:root`, where `var(--dk-accent-hue)` resolves
against the root's own 210. Every game and every hub card drew the same blue.
`applyAccent` now also marks its host with `data-dk-accent`, and `chrome.css`
redeclares the three derived colours on `:root[data-theme] [data-dk-accent]` in
light, in dark and in the increased contrast layer, and resets them to the
system colours under forced colours. Measured after the change at 360 pixels,
in both themes: hub 148, POKER GRID 148, CIPHER 268, VECTOR 28, ROTATE LOCK 308,
with `--dk-focus` tracking each. The hub now shows four distinct card accents at
once, which is what requirement 7.3.8 asked for and had never rendered.

**Defect 2, the header truncated a display name.** ROTATE LOCK read
"ROTATE ..." beside the four chrome icons. `titleFit` in `header.ts` buckets a
title by length into `base`, `tight`, `tighter` and `wrap`, and writes it as
`data-fit` on the heading, restating it on `setTitle`. Measured after the change,
every name in the slate renders whole at 360 pixels with no clipping in either
direction: POKER GRID and TURN TABLE at `tight`, ROTATE LOCK and RING BALANCE at
`tighter`, DIFFERENCE RELAY and ORDER OF OPERATIONS on two lines at `wrap`.

**Defect 3, no ORDER list cursor.** `src/ui/listCursor.ts`, Layer 2, is the
ORDER adapter of section 21: a roving tabindex over an ordered list with focus,
selection, swap, a cancel and a declared pass through verb. Two decisions are
recorded in the file. It holds the **selection by item identity, not by slot**,
because a swap reorders the slots under the cursor and a selection stored as a
slot silently comes to mean a different item. It uses a **roving tabindex**
where `gridCursor` uses `aria-activedescendant`, because a list here is a
handful of real buttons whose pressed state a screen reader should say, and the
35 cell reason for activedescendant does not apply. ROTATE LOCK's tray is
retrofitted onto it and its renderer lost 70 lines of its own key model; its
declared keys, its announcements and its 69 tests are unchanged. `cursor.keys`
exposes the consumed keys so a module's `InputDescriptor` has one source.

### Offline smoke, recorded 2026-09-18

Headless Chromium at 360 pixels against `vite preview` of the release build:
hub, POKER GRID, CIPHER and VECTOR each visited twice online past the practice
board, then the context set offline and every page revisited. All four rendered
from cache, with the hub's cards, POKER GRID's board, CIPHER's keys and VECTOR's
cells present and no console error. The worker and the asset naming did not
change, so the committed `offline-smoke` evidence stands and no certification
record changed.

### Files

| Path | Change |
|---|---|
| src/ui/listCursor.ts | New: the ORDER adapter, Layer 2 |
| src/ui/theme.ts | `applyAccent` marks its host with `data-dk-accent` |
| src/ui/chrome.css | Accent colours redeclared on the carrier in every layer; the title ladder; `min-height` on the header |
| src/ui/header.ts | `titleFit` and the `data-fit` attribute |
| src/games/rotate-lock/render.ts | The tray adopts the list cursor |
| tests/ui/listCursor.test.ts | New: 15 tests |
| tests/ui/theme.test.ts | The carrier marker and the CSS layers |
| tests/ui/header.test.ts | Every display name's step, and the header's min-height |

## Charter Phase 13, DIFFERENCE RELAY. Built 2026-09-19, planned until its manual mobile check.

Game five of eight, the second game authored on v3 through NEW_GAME.md, under the
requirement 7.4 zero engine changes rule. Its design document is DIFFERENCE-RELAY.md,
which answers every item of section 44 and settles the section 46 stress test.

### Decisions, approved 2026-09-19

1. **Imperfect information**, HANDOFF section 4.1 settled. Some gaps are hidden and
   learned only from how far the relay runs, so the attempt ladder and the
   registry's `hasWinLoss: true` are real and the fairness claim has content.
2. **Six stations, five gaps, six numbers from one to nine**, so uniqueness is a
   full 6! enumeration, EXACT, matching the section 27 profile.
3. **Feedback is a position, not a count.** The distinction from CIPHER, defended
   in DIFFERENCE-RELAY.md 2: the baton reaches one station, located exactly.
4. **Fairness is a no guess minimax deduction reaching the unique order within six
   runs.** Strictly stronger than uniqueness, the section 46 stress test met. A
   board the model cannot open without a probe outside the candidate set is
   rejected by screen S-fair.
5. **Difficulty is forced deduction work**, the candidate mass the forced line
   resolves, for seven band resolution. Run count alone has too few values.
6. **Reversal is the one live symmetry** and is broken by a screen that rejects a
   board whose reverse target satisfies the visible marks, so the census stays 6!
   rather than anchoring a station.
7. **The hidden lever is one, two or three gaps.** Two clumped the difficulty at
   low values and collapsed a band; three spread it across seven distinct septiles.
8. Bucket count corrected from the scaffold's provisional 4 to **7**, six run
   counts and a loss. Distribution distinguished bucket 0.

### The abstraction test, requirement 7.4

**Zero engine changes wanted, zero made.** The only files outside
`src/games/difference-relay/`, its tests and its tools are the four sanctioned
per game touch points: the registry row's provisional values corrected, the
`vite.config.ts` target the scaffold wrote, the `tools/certify.ts` plan row, and
`package.json` scripts. `src/core`, `src/engine`, `src/ui` and `src/contract`
were not touched. The list cursor of the ROTATE LOCK corrections carried the
ORDER input with no addition, the manifest codec obfuscated the payload with no
addition, and the share grammar, leak harness and tiers all fit the game as they
stand. The defect list is empty, which is the expected result by game four and
holds at game five.

### Measured values, DIFFERENCE-RELAY.md 20

- **Calibration**, `data/difference-relay/study.json`: 400 seeds of 300 attempts,
  120,000 attempts, 30,667 screened, 25.56 percent. Rejections: uniqueness 69,111,
  symmetry 14,631, decomposition 4,808, fairness 783. `BAND_EDGES` are
  `[2, 3, 7, 11, 20, 37]`, the septiles of forced deduction work, putting about
  4,300 to 4,900 screened boards in each band, far above the yearly need of 52.
- **Par distribution** over the screened sample: par 1 through 6 hold 7,099,
  10,126, 5,680, 4,163, 2,371 and 1,228, every one inside the six run budget.
- **Horizon**: 365 days from 10,833 attempts in about 0.8 seconds, 3.37 percent
  with the band screen, 53 or 52 days per weekday band. The manifest chunk is
  about 33 KB.
- **Verification**: 365 days in about 1.4 seconds, one order each EXACT, par and
  difficulty independently recomputed and equal to the module's, band, symmetry
  and no repeats.
- **Page**: the renderer's page is 27.4 KB gzipped against the 150 KB budget,
  measured on the harness build because a planned game is not in a release build.
- **Engine chunk** unchanged at 30.41 KB.

### Green after the change, 2026-09-19

Three typechecks, the dependency check, 977 tests in 75 files (940 in 70 before),
all four live verifiers plus `difference-relay:verify`, the production build, the
byte budget over every live page, and `npm run certify -- --check` reporting the
three live games production safe with no committed record changed.

### Found while building, inside the game

- The difficulty measure clumped at low values under a one or two gap hidden
  lever, which collapsed band 2. Widening the lever to one, two or three gaps
  spread it. Logged as a design fact in DIFFERENCE-RELAY.md 21, not a defect.
- The tutorial board is drawn from a separate seed namespace so it cannot collide
  with a horizon day's answer, and the generator test asserts it is not day one's.

### Files

| Path | What it is |
|---|---|
| DIFFERENCE-RELAY.md | The design document, all 28 section 44 items |
| src/games/difference-relay/relay.ts | Primitives: stations, the relay walk, permutations |
| src/games/difference-relay/solver.ts | Uniqueness, the no guess deduction, par and difficulty |
| src/games/difference-relay/rules.ts | Puzzle, actions, runs, terminal, tier and bucket |
| src/games/difference-relay/generator.ts | Direct construction, screens, bands, fallback |
| src/games/difference-relay/relay-codec.ts | The obfuscated manifest layout |
| src/games/difference-relay/telemetry.ts | Run log, artifact mapping, fingerprint, leak probes |
| src/games/difference-relay/module.ts | The v3 module |
| src/games/difference-relay/render.ts | The list cursor renderer |
| src/games/difference-relay/help.ts | One screen and a worked example |
| src/games/difference-relay/style.css | The play area, mobile first |
| src/shell/entries/difference-relay.{ts,html} | The entry, scaffolded |
| tools/difference-relay-generate.ts | The horizon generator |
| tools/difference-relay-verify.ts | The independent verifier, never imports the solver |
| tools/difference-relay-calibrate.ts | The band calibration |
| data/difference-relay/ | The 365 day manifest, index and study |
| tests/games/difference-relay/ | rules, solver, generator, module and render, 37 tests |

### Next

TURN TABLE is game six, decided 2026-09-19. It is a spatial route game, not an
ordering game, so it exercises the list cursor differently or not at all and is
the next chance for a real defect. RING BALANCE and ORDER OF OPERATIONS follow,
each in its own conversation. DIFFERENCE RELAY stays planned until the owner runs
MANUAL-CHECKS.md for it and records the manual mobile and offline smoke results.

## Slate amendment: four word games. Done 2026-09-19.

Directed by the owner: LETTER TRAIL, WORD LADDER, PANGRAM and FIVE LETTERS are the
next four games built, in that order, regardless of the earlier build order. They
are the owner's four chosen shapes: a connected letter grid with a spanning word,
a one letter change ladder, seven letters with a pangram, and a five letter guess
with per position feedback.

### Decisions, made 2026-09-19

1. **Added, not substituted.** TURN TABLE, RING BALANCE and ORDER OF OPERATIONS
   stay approved and planned and move behind the four. The suite is twelve games:
   three live, two built and planned, seven planned and unbuilt. This extends
   composition A's deviation from the charter's Section 0 and requirement 7.3.1.
2. **Names are the suite's own.** None uses another daily game's name or a
   product name, so requirement 7.1.5's licensing rule holds. They are provisional
   in the same way the rules are, and a rename before a game is built is a
   registry edit.
3. **Hues 48, 128, 208 and 288.** Twenty degrees off the existing forty degree
   ring, so no live or built hue moves and each new hue sits between two existing
   ones. The accent contrast defect found in the 2026-09-19 review applies to 48
   and 128 as it does to 68, 108 and 148; see BACKLOG.md.
4. **Registry order is build order for now.** The four sit directly after
   DIFFERENCE RELAY and before TURN TABLE. Each design document states a session
   length and the longest to shortest re sort happens then, as for every game.
5. **The daily card row width is six.** Eight at twelve games leaves a ragged row
   of four, which the grammar refuses. Six divides twelve, so a full house is two
   rows and four lines against the nine line cap. The rule is recorded where the
   constant is: the widest width at or under eight that divides the slate.
6. **Word lists are an asset, not content.** Every one of the four needs an
   answer list and a validation list. Only public domain or permissively licensed
   lists are admissible, each gets an ASSETS.md row when it ships, and curating
   the answer list once does not breach the zero daily content cost rule.

### What changed

`src/shell/registry.ts` gains four planned rows. `src/engine/dailycard.ts` moves
`DAILY_CARD_ROW_WIDTH` from eight to six; this is an engine edit made outside any
game build, so no game's zero engine changes rule is involved. Tests changed with
it: the registry count is twelve and the build order is asserted, the header test
holds the four names to their fit steps (PANGRAM base, the other three tighter),
the daily card tests use a twelve game fixture, and the hub test derives its line
count from the row width. `npm run new-game -- --id letter-trail` adopts the
planned row, checked in a scratch copy.

### Green after the change, 2026-09-19

| Gate | Result |
|---|---|
| Typecheck | `tsconfig.json`, `tsconfig.tools.json` |
| Dependency check | layers verified |
| Tests | 75 files, 983 tests |
| Build | pass |
| Byte budget | Hub 18.1, POKER GRID 28.3, CIPHER 26.2, VECTOR 28.5, About 3.5 KB gzipped |
| Certification | three live games production safe |

The registry is bundled into every page, so four rows cost each page about 0.3 KB.

### Next

LETTER TRAIL is game six. Then WORD LADDER, PANGRAM and FIVE LETTERS, then TURN
TABLE, RING BALANCE and ORDER OF OPERATIONS, each in its own conversation.

## Delivery pipeline. Done 2026-09-19.

Directed by the owner. Every conversation starts from a fresh clone of GitHub
`main`, all development and testing happen in the container, and a finished,
green piece of work reaches the repository as one patch that the owner ships
with one command.

### Decisions, made 2026-09-19

1. **The handoff names a base commit, a branch and a subject, not the delivered
   commit's id.** A file cannot name the commit that contains it, and the owner's
   `git am` and GitHub's merge both make commits whose ids cannot be known in
   advance. The next conversation checks that the base is an ancestor of `main`
   and that the subject follows it.
2. **The patch carries its base.** `git format-patch --base` writes a
   `base-commit:` line, and `tools/ship.ps1` branches from it, so a patch always
   applies to the tree it was tested on however far `main` has moved. Newer
   commits meet it in the pull request.
3. **The script lives in the repository,** so each conversation delivers only a
   patch. It is PowerShell because the owner works on Windows, written for
   Windows PowerShell 5.1 as well as pwsh, and it refuses rather than guesses:
   a dirty tree, an unfinished `git am`, a patch without a base, a malformed
   name, a branch already in use. A patch that does not apply leaves the owner
   back on the branch they started from with nothing pushed.
4. **The container never pushes.** It holds no credentials for the owner's
   account and must not.

### Tested 2026-09-19

With pwsh 7.4.6 in the container against a local bare remote whose `main` had
moved past the patch's base: the success path created, committed and pushed
`claude/<name>` and printed the compare link; a repeat refused the existing
branch; a dirty tree and a patch without a base line were refused; a patch that
conflicted aborted `git am`, deleted the branch, returned to `main` and pushed
nothing. Not tested on Windows PowerShell 5.1 itself; the script avoids
constructs newer than 5.1.

### Files

| Path | What it is |
|---|---|
| tools/ship.ps1 | The delivery command |
| HANDOFF.md | Section 7 rewritten for the clone, the merge check and delivery; a Built on row in the header |

## Charter Phase 13, LETTER TRAIL design. Done 2026-09-19.

Game six of twelve, the design document only. No game code was written; the build is
a later conversation. The design document is LETTER-TRAIL.md, which answers every item
of section 44, settles the six open decisions in the handoff section 4.1, and records
the finding below. This entry exists because the finding overturns a preferred contract
in section 46 and the reason must survive in the log, not only in the game's own document.

### The finding: full cover uniqueness is not buildable

The section 46 preferred contract named "uniqueness of the full cover" as the fairness
claim. It was measured before any design was built on it, because an unachievable claim
makes the game unbuildable. Measured unique cover rates over the curated answer list, as
eight adjacency simple path tilings that cover every cell exactly once:

- four by four: about 1.0 percent of built boards have a unique cover
- five by four: about 1.0 percent
- five by five and larger: 0.0 percent
- with a span anchor forcing one long word into the cover: 0.2 percent at six by five, 0.0 at six by six

Where a unique cover did exist the difficulty integer had about six distinct values, too
few for seven bands. A dense rectangle of common letters simply admits many dictionary
tilings. The claim is false for this substrate at any playable size.

### The resolution

The fairness claim changed rather than the assertion being kept. LETTER TRAIL hides a
known set of seven words, tells the player the count, and proves span uniqueness: the
intended spanning word is the unique longest answer list word that appears anywhere on
the board as an eight adjacency simple path. That anchors the day's set, is verified
exactly and cheaply (node counts in the low tens of thousands, a horizon in seconds),
and is the strongest claim the substrate supports. This is a design finding, not a
defect; no engine change fixes a word list fact. Section 11 of the design document is
the fairness claim, section 9 the verifier's two proved claims, SOLVABLE and FAIR under
the declared model, never UNIQUE full cover.

### Decisions, approved 2026-09-19

1. **Curated themes**, handoff 4.1 decision 1. Without a theme, no hint and no runtime
   dictionary, tracing a familiar word that is refused is guessing. A theme makes it
   directed recall against a stated category and shrinks the decoy universe from the
   whole language to the theme. Evidence: one forty five word theme yields 2,716
   distinct boards from 3,000 seeds, so a one time set of about twenty four to fifty two
   themes covers a non repeating 365 day horizon, and themed build acceptance is 82 to
   86 percent, unchanged from unthemed. The rejected alternative, carrying each day's
   decoy set in the manifest to earn hints, costs about 54 KB gzipped per horizon and
   leaves the core loop as rewarded guessing.
2. **Answer list is commercial safe.** The first candidate, google-10000-english,
   derives from the LDC Google corpus and its own license disallows commercial use
   without an LDC license, which fails requirement 8.6 for a commercial product. Replaced
   with ENABLE, public domain, intersected with wordfreq's top 30,000, Apache 2.0:
   12,522 words, 40 KB gzipped, build time input only, never served. wordfreq is a build
   time only dependency.
3. **A reviewed profanity and slur stop list is mandatory.** The wordfreq intersection
   contains profanity and slurs, confirmed, so the stop list is subtracted once at
   curation. One time, not daily, so it does not breach the zero daily content cost rule.
   Recorded in ASSETS.md.
4. **No runtime validation list.** The player finds a known set, so there is no "is this
   a real word" check at play time. The dictionary is offline only. This makes LETTER
   TRAIL the cheapest of the four word games and sidesteps the section 46 byte budget
   stress that WORD LADDER and FIVE LETTERS still face.
5. **Board is six rows by five columns, thirty cells, seven words including the span.**
   Fits 360 pixels, gives 11.1 percent fairness acceptance, and is the densest board in
   the suite, so the manual mobile check must measure it in the page.
6. **Difficulty is decoy word count, held as a hypothesis to calibrate, not settled.**
   With a theme the decoy universe is the theme rather than the language, so the measured
   spread of 101 distinct values from the unthemed probe will shrink and must be
   recalibrated during the build. The named fallback metric, if decoy count collapses a
   band, is span length combined with theme breadth.
7. **No win or loss.** Continuum result, words found of seven, a reveal escape, streak
   defined as played. Registry `hasWinLoss: false` stays.
8. **Provisional registry values to correct when the game is built:** bucket count from
   4 to 8 (words found zero through seven, Solved distinguished), and the one line rule
   tightened to name the spanning word. State version 1 stays.

### The abstraction test, requirement 7.4

Not yet run. The design anticipates no engine change for keyboard path building on the
grid cursor, because `onActivate`, `onCancel` and a readable `index` let the renderer
own the path, but the defect report comes after the build, not from the design. No claim
that the test resolves to zero changes is made here.

### Files

| Path | What it is |
|---|---|
| LETTER-TRAIL.md | The design document, all 28 section 44 items and the six 4.1 decisions |
| ASSETS.md | Six rows for the answer list, themes, ENABLE, wordfreq, and the stop list, all build time only |
| ARCHITECTURE2.md | The section 46 note amended and this section 56 entry |

### Next

The build, in its own conversation: scaffold through NEW_GAME.md, real rules and
generator, the themed manifest, module, renderer, certification plan, and the defect
report. The build corrects the two provisional registry values and calibrates the
difficulty hypothesis of decision 6.

## Charter Phase 13, WORD LADDER design and build. Done 2026-09-20.

Game seven of twelve. This conversation found that the game's design document had
never been written: `main` carried only `WORD-LADDER-PREP.md`, the transient
evidence file, and the HANDOFF described the next conversation as the design only.
The prep states plainly that it is input, not decisions, and that every proposal in
it is for the design document to confirm or overturn with its own evidence. So the
design was written first, `WORD-LADDER.md`, answering every item of section 44 and
settling the six open decisions, then the game was built against it in the same
conversation, and the prep was deleted. This compresses two charter steps into one
run, a deliberate deviation from the HANDOFF's design only expectation, recorded here
because the reason must survive in the log. Every prep measurement was reproduced in
the container before any number was adopted; the reproductions are in WORD-LADDER.md
section 30.

### The finding: par is exact only over one list

The prep's load bearing finding, reproduced: if the game accepted every dictionary
word but scored par over a familiar subset, a player using obscure words would beat
par on more than half of all pairs (reproduced at 53.9 percent), and par would no
longer be the optimum the verifier claims. So WORD LADDER computes par as the exact
shortest path over the single accepted list, and screens every board so at least one
shortest path is all familiar words (section 11 of the design). Par is then both exact
and reachable with an ordinary vocabulary, which removes the "under par" bucket. The
verifier proves SOLVABLE with exact par and FAIR under the familiar path model, never
a unique path, because a word ladder has many shortest paths by nature.

### The cross game decision: two family word sources, not one

The one cross game decision the HANDOFF said the design must not defer was the family
familiarity source. Decision, approved 2026-09-20: **WORD LADDER adopts SCOWL/ESDB,
and the four word games do not converge on one source.** LETTER TRAIL keeps ENABLE
intersected with wordfreq; WORD LADDER, PANGRAM and FIVE LETTERS adopt ENABLE
intersected with SCOWL size levels. The reason is measured, not aesthetic: wordfreq is
a frequency list from a corpus, so a four letter lowercase token list drawn from it
admits proper nouns and brands (abba, alan, alba, alec, alfa, anna, axel, bach, beth,
carl, jane and more); a probe of 48 common four letter names and brands found 24 in the
wordfreq list against 8 in the ESDB list, and the ESDB survivors are all also common
words. LETTER TRAIL tolerates this because its words are hand curated into themes and
only ever traced inside a grid, never shown as isolated tokens; WORD LADDER displays
every rung as a standalone word and cannot hand curate a daily set, so a source that
admits proper nouns as valid rungs would confuse players. ESDB, a spell checker list,
excludes proper nouns by construction. The two sources are recorded in ASSETS.md and
BACKLOG.md so a later maintainer does not unify them and reintroduce proper noun rungs.
This overturns nothing in section 46, whose WORD LADDER note left the source open; it
settles it.

### Difficulty and the build result

The difficulty integer is the search ball below par, the count of accepted words
within par minus one of the start, because par alone has only four distinct values (4
to 7) and cannot fill seven bands. The reproduced septiles filled seven bands cleanly;
the build's calibration study on the shipped list set the band edges to
[278, 436, 641, 878, 1122, 1505] and the manifest was generated and independently
verified against them: 365 days, solvable, exact par, familiar fair, correct
difficulty and band, no repeated unordered pair (the symmetry result, since the one
letter change relation is symmetric so a reverse pair is the same puzzle). The page is
32.9 KB gzipped, well inside the 150 KB budget, with the 2,332 word accepted list as
its one runtime asset, the byte cost section 46 anticipated for this game and that
LETTER TRAIL avoided. The game ships planned: its offline smoke and manual mobile
checks are the gate refusing stubs until the owner runs them, and going live is a
separate patch, per the delivery pipeline decision.

## Charter Phase 13, PANGRAM design and build. Done 2026-09-20.

Game eight of twelve, designed and built in one conversation, the first under
the standing rule below. `PANGRAM.md` is the design, answering all 28 items of
section 44, with every number reproduced in the container before it was adopted
(its section 30). The game is a full v3 module and ships planned.

### The finding: no dictionary in the browser

A PANGRAM day's valid words are determined by its seven letters and centre, so
each day's answer list, median 46 words, travels in its manifest entry through
the engine codec, and the browser ships no word list at all. Measured: the
dictionary a browser would need costs 67 KB gzipped at ESDB 35 and 99 KB at ESDB
50; the per day lists cost about 8 KB gzipped per 31 day chunk, fetched after the
page is interactive. The page is 27.1 KB gzipped. Two consequences are recorded
as risks, not hidden: the answers sit behind light obfuscation only, and there is
no generation past the horizon, so the manifest must be regenerated before
2027-01-04. A benefit: the end screen can list the words a player missed. This
settles WORD LADDER's runtime list question differently for PANGRAM on purpose:
a ladder rung can be any word in the language, a PANGRAM answer cannot.

### Decisions, made 2026-09-20 under the standing rule

1. **One list, as WORD LADDER.** The accepted list (ESDB 50) is the scoring list,
   so the total is exact and no player can exceed it. Familiar (ESDB 35) drives
   only the fairness screen and the root draw.
2. **Fairness is the top tier reachable with familiar words:** a familiar pangram
   and familiar words carrying at least 65 percent of the total, against a 60
   percent top threshold. Proved per day by the verifier.
3. **No S in any day**, a lever fixed off: median candidate day 49 words rather
   than 79.
4. **Difficulty is the total available score**, septiles 75, 96, 120, 145, 171,
   207 from 4,000 seeds and 265 distinct values; the answer count is the named
   fallback, also seven bands, both in the committed study.
5. **Scoring and tiers:** one point per letter past three, seven more for a
   pangram; tiers at 60 (with a pangram), 40, 25 and 10 percent. Five buckets,
   `hasWinLoss` false, as the provisional row had them.
6. **Registry row corrected:** the rule now names the four letter minimum. Hue
   208, bucket count 5, win and loss false and state version 1 were checked
   against the module and stand.
7. **The verifier imports only the codec.** Replay determinism is proved by the
   generator test replaying the first ten committed days byte for byte and
   rerunning the whole calibration study, so the verifier never imports the
   generator, stricter than WORD LADDER's verifier, which does.
8. **Word lists are rebuildable.** `tools/pangram-words.ts` derives both lists
   from recorded inputs, offline only; WORD LADDER left no such tool.
9. **The family deny list grew from 22 to 89**, authored in this run from a 285
   word probe, and awaits owner review as the first row of MANUAL-CHECKS.md
   section 7.

### The abstraction test, requirement 7.4

Zero engine changes. No file under `src/core`, `src/engine`, `src/ui`,
`src/contract` or `src/shared` changed. Two WORD LADDER defects surfaced and are
logged in BACKLOG.md rather than fixed here: five newly denied words are still
valid rungs, and a reveal with no rungs yields an artifact the engine refuses for
lacking a fingerprint. `word-ladder:verify` was also missing from CI and is added.

### Green after the change, 2026-09-20

| Gate | Result |
|---|---|
| Typecheck | three tsconfigs, zero errors |
| Dependency check | layers verified |
| Tests | 89 files, 1,112 tests (63 new for PANGRAM) |
| Verifiers | all seven games, each 365 days; PANGRAM in about 0.4 seconds |
| Production build | `engine-v2.js` 30.4 KB; pangram excluded, being planned |
| Byte budget | Hub 18.1, POKER GRID 28.3, CIPHER 26.2, VECTOR 28.5, About 4.0 KB; PANGRAM 27.1 KB in a throwaway certify build |
| Certification | three live games production safe; pangram not evaluated, being planned |

### Files

| Path | What it is |
|---|---|
| PANGRAM.md | The design document |
| src/games/pangram/letters.ts | Set arithmetic, scoring and thresholds |
| src/games/pangram/rules.ts | Puzzle construction, actions, refusals, tiers, state rebuild |
| src/games/pangram/pangram-codec.ts | Layout and answer list encoding over the engine codec |
| src/games/pangram/solver.ts | Exact day enumeration, fairness and roots; Node only |
| src/games/pangram/bands.ts | Band edges and the weekday curve; Node only |
| src/games/pangram/generator.ts | Rejection sampling over roots and centres; Node only |
| src/games/pangram/telemetry.ts | Run log, artifact, fingerprint, archetype, leak probes |
| src/games/pangram/render.ts, style.css | Keypad, draft, meter, found and missed words |
| src/games/pangram/help.ts, tutorial.ts | Help and the embedded first session day |
| src/games/pangram/module.ts | The v3 module |
| src/shell/entries/pangram.html, pangram.ts | The entry |
| tools/pangram-words.ts | Offline list derivation |
| tools/pangram-generate.ts, pangram-calibrate.ts | Horizon and calibration |
| tools/pangram-verify.ts | The independent verifier |
| data/pangram/ | accepted.txt, familiar.txt, study.json, index and twelve chunks |
| data/word-lists/deny.txt | The family deny list, extended |
| tests/games/pangram/ | letters, rules, solver, generator, telemetry, module and render tests, and fixtures |
| tools/certify.ts, vite.config.ts, package.json, src/shell/registry.ts | The plan row, the target, four scripts, the corrected rule |
| .github/workflows/ci.yml | pangram:verify and the missing word-ladder:verify |
| MANUAL-CHECKS.md | Section 7, PANGRAM |

## Standing rule: a game's conversation runs design through delivery. Set 2026-09-20.

Directed by the owner. Every remaining game, FIVE LETTERS, TURN TABLE, RING
BALANCE and ORDER OF OPERATIONS, and the LETTER TRAIL build, runs in one
conversation from design document to delivery patch, pre approved, with no
stops, no checkpoints and no questions. Where a document says to pause, split at
a phase boundary, or wait for sign off, that is superseded: decide with judgment,
record the decision and its reason, and keep moving. Only a genuine unresolvable
contradiction in the source documents or a hard technical impossibility halts a
run. The owner's sole action is the ship command; going live stays a separate
patch after the owner's manual checks. The earlier entries in this log that
describe a design only conversation are history and stand as written. Carried in
HANDOFF.md section 8, NEW_GAME.md section 2, the Status table above, and
ARCHITECTURE.md's slate note.

