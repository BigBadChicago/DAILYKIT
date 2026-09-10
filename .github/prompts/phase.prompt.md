---
name: phase
description: Run any charter phase that has a plan document, with the correct reading order
agent: agent
---

Run the DAILYKIT charter phase I name after this command. If I did not name one,
ask which phase before reading anything else.

**Find the plan first.** A phase with a plan document has one at
`PHASE-<n>-PLAN.md` in the repository root. If that file does not exist, stop and
say so: a phase without a written plan is not ready to run, and inventing the
plan yourself is how a phase produces work that has to be redone.

**Reading order**, every time, because a phase task carries no chat history:

1. `.github/copilot-instructions.md`, all of it, including sections 14 and 15.
2. `ARCHITECTURE.md`, all of it. The status table, the phase log, the file
   manifest, every numbered decisions section, and every defect report.
3. `BACKLOG.md`, so you do not build something already declined.
4. The phase plan document.
5. `NEW_GAME.md`, if the phase builds a game.
6. `SLATE.md`, if the phase involves which games exist.
7. That game's design document, if one exists, and the design documents of
   POKER GRID and CIPHER as the worked shape if one does not.
8. Only then, source, layer by layer from `src/core` upward, and only the parts
   the phase needs.

`ARCHITECTURE.md` outranks every plan document. If they disagree, follow
`ARCHITECTURE.md`, say so in your reply, and name the section.

**While working**, hold to section 15 of the Copilot instructions: one phase per
chat, the verification gate before any claim of done, documents updated as part
of the phase and not after it, and the abstraction test rule if the phase builds
a game.

**Finish** with the phase report the plan document specifies. Then stop, say the
phase is done, and tell me to open a new chat for the next one.
