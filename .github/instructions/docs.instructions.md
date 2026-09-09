---
name: Documentation
description: How the repository's documents are written and kept true
applyTo: "**/*.md"
---

The documents are the handoff between sessions. `ARCHITECTURE.md` plus the
project charter must be enough for a fresh session to resume with no chat
history, so a stale document is a defect like any other.

## Rules

1. **No dashes as punctuation.** Hyphens inside a compound word are fine. Rewrite
   the sentence rather than reaching for a dash.
2. **`ARCHITECTURE.md` file manifest.** Every file gets a row: path, layer, one
   sentence responsibility, imports. Add a row when a file is added, correct it
   when a role changes, remove it when a file goes.
3. **Decisions are numbered and appended, never renumbered.** Each entry states
   the decision and why the alternative was rejected. Reasoning is the part worth
   the space.
4. **`BACKLOG.md` is how something is declined.** One line and a rationale.
   Nothing in it is work in progress.
5. **`MANUAL-CHECKS.md` is a list to run, not prose to read.** Pass conditions
   are observable. The results table records human runs only.
6. **Write the reason, not the restatement.** A document that says what the code
   does is redundant with the code. A document that says why the obvious
   alternative was rejected is not.
7. **Keep the status table at the top of `ARCHITECTURE.md` current**, including
   the phase log row for whatever phase is in flight.
