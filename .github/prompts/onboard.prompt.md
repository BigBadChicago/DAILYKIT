---
name: onboard
description: Build an accurate working model of the DAILYKIT codebase before making changes
agent: agent
---

Build a working model of this repository and prove it back to me. Make no edits
during this task.

Read, in this order: `.github/copilot-instructions.md`, `ARCHITECTURE.md` in
full including every decisions section, `BACKLOG.md`, `MANUAL-CHECKS.md`,
`POKER-GRID.md`, `CIPHER.md`, then the source, layer by layer from
`src/core` upward.

Then produce:

1. **The layer map.** Each layer, its files, and what it is responsible for, in
   your own words. Flag any file whose actual imports disagree with its row in
   the `ARCHITECTURE.md` manifest.
2. **The contract in one page.** What a `GameModule` must supply, what the engine
   guarantees in return, and which parts of the contract exist because of a
   specific past defect.
3. **The day lifecycle.** From page load to a shared result, naming the state
   machine transitions and who triggers each one.
4. **The data path.** How a puzzle goes from the generator, through the manifest
   and the codec, into a board on screen, and what happens at each point where it
   can fail.
5. **The five things most likely to break** in a manual check, with the file you
   would open first for each. Justify each from the code, not from intuition.
6. **Everything you found that looks wrong or stale**: a manifest row that does
   not match the tree, a decision the code no longer honours, a document that
   contradicts another, a test that asserts less than its name promises. List
   them with file and line. Do not fix any of them.
7. **Ten questions** whose answers you could not find in the repository, ordered
   by how much they would change what you would do.

Be specific and cite file paths. If you are unsure about something, say so
rather than filling the gap with a plausible guess.
