---
name: phase-12
description: Run Phase 12, template extraction, from PHASE-12-PLAN.md
agent: agent
---

Run Phase 12 of the DAILYKIT charter, template extraction.

Read in this order and do not skip any of it, because this task has no chat
history behind it:

1. `.github/copilot-instructions.md`, all of it, including sections 14 and 15.
2. `ARCHITECTURE.md`, all of it, including every numbered decisions section and
   the Phase 11 defect report.
3. `BACKLOG.md`.
4. `PHASE-12-PLAN.md`, which is the specification for this task.
5. `POKER-GRID.md` and `CIPHER.md`, as the worked shape of a game design
   document.
6. `src/games/toy-tap/module.ts`, `src/games/cipher/module.ts`, and
   `src/contract/game-module.ts`, as the three references the guide is written
   against.

`ARCHITECTURE.md` outranks `PHASE-12-PLAN.md`. If they disagree, follow
`ARCHITECTURE.md`, say so, and name the section.

Then work section 2 of the plan in order, deliverable by deliverable. Stop and
ask, rather than choosing for me, in exactly the cases section 12 of the Copilot
instructions names, and additionally if writing the scaffolding tool cannot be
done without an engine change.

Before you report done, run the acceptance in section 6 of the plan for real and
paste the output. Then produce the phase report in the shape section 9 gives.

Do not start Phase 13. When Phase 12 is done, say so and tell me to open a new
chat.
