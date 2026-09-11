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
| Existing production games | POKER GRID, CIPHER |
| New concept pool | DIFFERENCE RELAY, TURN TABLE, RING BALANCE, INTERVAL PACK, CARD CASCADE, THREE-WAY SPLIT, VECTOR LOCK, DIVISIBLE FENCE, WORD WEAVE, PRIME PAIRING, SHADOW LEDGER, COVER CHARGE, PARITY PARADE, CROSS CURRENT, ORDER OF OPERATIONS |
| Recommended concepts from the design review | DIFFERENCE RELAY, TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, VECTOR LOCK |
| Engine contract | v3 target contract: deterministic puzzle, pure action transition, terminal result, telemetry artifact, share export, certification metadata |
| Daily content model | One deterministic puzzle definition per game/day, derived from that game's seed alone |
| Verification policy | Generation and verification are independent processes; exact verification required where the game's state space permits it |
| Difficulty policy | One emergent integer measure per game, measured by verification and mapped to seven weekly bands |
| Share policy | Maximum nine total lines including title and URL; maximum eight tokens per row; closed vetted token vocabulary |
| Network policy | No network dependency for puzzle identity, gameplay, result, telemetry mapping, or share generation |
| Storage policy | Small JSON snapshot for in-progress state; telemetry retained only when required for the local result artifact |
| Deployment | Cloudflare Pages at `dailykit.providentia.games` |

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
    bucketOf(outcome)
    tierOf(outcome)

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
- VECTOR LOCK
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
| VECTOR LOCK | Order/rotate route pieces under turn checkpoints | state enumeration + pruning | checkpoint decision depth | vector trace + deterministic output |
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
- VECTOR LOCK
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

Target:

- WORD WEAVE

Key risk: translation debt and vocabulary-dependent fairness.

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

## VECTOR LOCK

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
