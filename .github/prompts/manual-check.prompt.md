---
name: manual-check
description: Investigate and fix a failure found while running MANUAL-CHECKS.md
argument-hint: section and check that failed, the platform or client, and what you saw
agent: agent
---

A manual check from `MANUAL-CHECKS.md` failed. Investigate it, fix the cause,
and prove the fix. Follow `.github/copilot-instructions.md` section 7
throughout. Do not skip a step because the defect looks obvious.

## The report

${input:report:Example: Section 2, daily card, Slack on Windows. Rows are ragged when one game is unrated.}

## What to do

1. Read `ARCHITECTURE.md` and `MANUAL-CHECKS.md` before touching anything. Quote
   the exact pass condition that failed. If the report does not identify one
   unambiguously, stop and ask rather than guessing which behaviour is wrong.

2. Reproduce it inside the repository. Pick the cheapest faithful reproduction:
   the share harness, a Vitest case, a build and preview at 360 pixels, or the
   preview with the network disabled. Show what you ran and what it produced. If
   you cannot reproduce it, say exactly what extra information from the device
   would let you, and stop.

3. Locate the layer with the diagnosis table in section 8 of the instructions
   before writing a line. State the layer and why the fix belongs there and not
   one layer up or down.

4. Write the failing test first. Watch it fail for the right reason. If the
   failure genuinely cannot be automated, say why explicitly.

5. Fix the cause. No defensive wrapper, no special case for the reported input,
   no widened type.

6. Run the whole gate and paste the real output:

   ```text
   npm run typecheck
   npm run typecheck:tools
   npm run typecheck:sw
   npm run depcheck
   npm test
   npm run poker-grid:verify     # if POKER GRID rules, scoring, generation, or data changed
   npm run cipher:verify         # if CIPHER rules, scoring, generation, or data changed
   npm run build
   npm run budget
   ```

7. Update the documents in the same change: the `ARCHITECTURE.md` manifest row
   or decision entry, `BACKLOG.md` for anything deferred, `MANUAL-CHECKS.md` if
   the check itself was wrong or a new row is warranted, and
   `src/shell/changelog.ts` if a player would notice.

8. Report in this order: the pass condition that failed, the cause in one or two
   sentences, the fix and its layer, the test that now covers it, the gate
   output, the documents you touched, and anything you deliberately did not do
   with the reason.

Stop and ask instead of proceeding if the fix would contradict a numbered
decision in `ARCHITECTURE.md`, need a new dependency, change stored data shapes
without an obvious migration, or reopen a locked POKER GRID decision.
