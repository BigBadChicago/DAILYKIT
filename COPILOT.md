# Using Copilot on DAILYKIT

Everything Copilot needs is already in the repository. This page is the short
version for you.

## Setup, once

1. Open this folder in VS Code and trust the workspace.
2. Install GitHub Copilot and GitHub Copilot Chat, and sign in.
3. Open the Chat view and set the mode selector to **Agent**. Ask mode cannot run
   the tests, and running them is the point.
4. Type `/` in the chat box. If you see `manual-check`, `verify`, `onboard`,
   `review-change`, and `changelog-entry`, everything is loaded. If you do not,
   reload the window.

Nothing else to configure. The rules load themselves on every request.

## Daily use

| You want to | Type this |
|---|---|
| Check Copilot understands the code, before trusting it | `/onboard` |
| Fix something a manual check turned up | `/manual-check` then your report |
| See whether the repository is green | `/verify` |
| Check a diff before committing | `/review-change` |
| Add a player facing changelog entry | `/changelog-entry` then what changed |
| Run the next charter phase | `/phase 12`, or `/phase-12` |

**What Copilot reads by itself, and what it does not.**
`.github/copilot-instructions.md` loads on every request. The files under
`.github/instructions/` load when a matching file is opened. Nothing else loads
by itself, including `ARCHITECTURE.md`, which is where every settled decision
lives. Section 14 of the instructions tells Copilot to open it first, every
task. If a reply does not begin by naming the documents it read, that is the
sign to stop and ask it to read them.

Start a **new chat for every defect**. A long chat carries stale context, and
that is the usual reason an agent edits the wrong file.

## Reporting a failure

Three things, every time: which check, where, and what you saw.

```text
/manual-check Section 2, row alignment, daily card. WhatsApp on iOS 18. Four
games finished and one unrated. The unrated row is narrower than the other
four, so the block reads ragged on the right. Slack on Windows looks square.
```

Attach a screenshot for anything visual. Copilot cannot see your screen.

"The share thing looks off on my phone" will cost you a round trip.

## Before you accept a fix

1. Did it paste real command output? Reasoning alone means nothing was run.
2. Did it add a test, or say why the failure cannot be automated?
3. Did it update `ARCHITECTURE.md` if a file or a decision changed?

If any is missing, reply: `Finish the definition of done in section 13 of the
instructions.` That is faster than explaining it again.

Then run `/review-change` before you commit.

## If Copilot stops and asks

It is instructed to stop rather than guess when a fix would break a recorded
decision, need a new dependency, change saved data, or when it cannot reproduce
what you described. That is the instructions working. The answer is yours to
give.

## What is installed

| File | Purpose |
|---|---|
| `.github/copilot-instructions.md` | The rules, loaded on every request |
| `AGENTS.md` | The same rules, for agents other than Copilot |
| `.github/instructions/` | Extra rules per area, loaded when you touch those files |
| `.github/prompts/` | The `/` commands above |
| `.vscode/settings.json` | Turns it on for this workspace |

When Copilot makes the same mistake twice, add the rule that would have stopped
it to the file that governs those paths. Write it as you would say it to a
person.

## Changes from the first `/onboard` run, 2026-09-09

The first onboarding review read the tree and reported back. Two of its findings
were real defects, several were stale documentation, and three were misreadings
worth recording so the same ground is not covered again. Everything below is
already applied.

**Fixed in code**

- `ManifestDescriptor.urlForChunk` is removed. All three modules implemented it,
  three tests asserted it, and nothing ever called it: `boot.ts` takes chunk URLs
  from the index pointers. Contract decision 17.
- An archive replay no longer carries the live streak into its share title. It
  was passing today's streak to a block titled with a past puzzle number.
  `src/shell/share-context.ts` now holds the rule with its own test. Suite
  decision 9. This one the review did not find; its question about archive shares
  is what led to it.
- Two stale comments in `src/games/cipher/module.ts` that still described the
  shell blanking CIPHER's tier, corrected by engine decision 16 in Phase 11.

**Fixed in documentation**

- Charter decision 1 said the share block caps at nine lines while
  `SHARE_MAX_ROWS` has been 8, meaning ten lines, since the suite gained a second
  game. The decision now matches the constant, and the constant's own comment
  says it caps rows rather than lines.
- `CIPHER.md` described the manifest contract as it was before the Phase 11
  corrections, in two places, and presented corrected defects as current
  workarounds. Its prediction table is now marked as history and each corrected
  row says so.
- The Phase 11 defect report in `ARCHITECTURE.md` now says at its head that it is
  a historical record and is never edited to match today.
- `MANUAL-CHECKS.md` gained section 5a, a post deploy check against the live
  origin: worker activated, one cache whose build id matches the deployed
  manifest, offline reload, and no stale cache after the next deploy.

**Not defects, recorded so they are not re-reported**

- The Phase 11 defect report contradicting the current status table is not a
  contradiction. It is a record of what was true when it was written.
- The CIPHER test that proves a save from another day deserializes cleanly is
  deliberate. Engine decision 14 puts puzzle identity in `stats.resumableState`,
  so no module has to detect it, and the test stops a later refactor assuming
  otherwise.

**One thing to know about the environment**

If `depcheck` or Vitest will not start and the error mentions the wrong platform
binary for esbuild or Rollup, run `npm ci`. That happens when the same
`node_modules` has been used from more than one operating system.
