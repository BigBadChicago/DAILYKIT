---
name: Game modules
description: Rules for Layer 4, one directory per game, the abstraction test rules
applyTo: "src/games/**"
---

Each game is one directory implementing the `GameModule` contract. The engine
never imports a game and a game never imports another game. The whole point of
the seam is that a new game is a directory plus one entry file and zero engine
changes.

## Rules

1. **Never import from another game.** If two games need the same thing, it
   belongs in the engine, in the presentation kit, or in `src/shared`. Moving it
   there is an engine change and needs the reasoning written down.
2. **Rules are pure.** `apply`, `inspect`, `bucketOf`, and `shareBlock` take
   state and return values. No DOM, no clock, no network, no randomness beyond
   the seeded RNG. A rejection is a value carrying a `code` and an `announce`
   sentence, never a thrown error.
3. **Serialization is a snapshot, not an action log.** A log would freeze apply
   semantics across every stored save and turn a routine rules fix into a
   migration event.
4. **The renderer owns the play area only.** No header, no modals, no toasts, no
   countdown. Those are the shell's, and reaching for them means the fix belongs
   in Layer 2 or Layer 5.
5. **`dispatch` is synchronous.** The shell applies the action and calls `update`
   from inside `dispatch`, so a renderer must never read its own state after
   dispatching to decide what the dispatch did. This exact assumption made POKER
   GRID unplayable in a browser while every headless test passed. See the Phase
   10 defect report in `ARCHITECTURE.md`.
6. **Puzzle production is synchronous.** `parsePuzzle` and `generatePuzzle`
   return values. All fetching, caching, and offline behaviour belongs to the
   shell.
7. **Share blocks are spoiler free.** Never a card, a suit, a position, a symbol,
   or anything a reader could work backwards from. Games emit vocabulary tokens,
   never glyphs of their own.
8. **Data under `data/<game>/` is generated.** Never hand edit it. Fix the
   generator, regenerate the affected range only, then run that game's verify
   script.
9. **Read that game's design document before changing its behaviour.**
   `POKER-GRID.md` or `CIPHER.md`. Rules, scoring, tiers, and share layout are
   specified there, and a change to any of them changes that document too.
10. **The abstraction test still applies.** If working a game defect makes you
    want to change engine source, that wanting is itself the finding. Log it,
    state what the contract failed to express, and report it rather than
    reaching upward quietly.
