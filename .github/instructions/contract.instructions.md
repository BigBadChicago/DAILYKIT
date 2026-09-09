---
name: The game module contract
description: Rules for Layer 3, the seam every game is written against
applyTo: "src/contract/**"
---

This is the spine of the project. Everything above it is written against it and
cannot be changed without changing every game. Treat an edit here as expensive
and prove it is necessary before making one.

## Rules

1. **The contract is small on purpose.** A new game should be a genuinely small
   amount of work. Every addition here is work every future game must do or
   ignore, so an addition needs a reason that survives being asked "would the
   fifth game thank us for this".
2. **One erasure point.** `defineGame()` in `game-module.ts` performs the
   codebase's only contract cast, producing the opaque branded types the shell
   and engine see. Do not add a second cast anywhere, and do not name a concrete
   game type in shell or engine source.
3. **Engine types live in Layer 0.** The contract composes `src/core/types.ts`
   into its descriptors. It does not export types downward, because Layer 1 sits
   below it and must never import the contract.
4. **A change here is a contract version change.** Say so explicitly, state
   which games must be rebuilt against it, and record it in the contract
   decisions section of `ARCHITECTURE.md` with the reason the alternative was
   rejected.
5. **The abstraction test governs.** Requirement 7.4 makes each new game a trial
   of this seam under a zero engine changes rule. If a defect report from that
   test is what brings you here, quote the defect it corrects.
6. **Anything optional must degrade cleanly.** An absent optional method disables
   a feature for that game rather than breaking the shell, the way an absent
   `firstSessionPuzzle` disables the tutorial state.
7. **`toy-tap` is the regression fixture.** It exists to prove the contract stays
   implementable in under a hundred lines, it is CI enforced, and it is excluded
   from production builds. A contract change that makes `toy-tap` longer or
   harder to write is a contract change worth arguing about.
