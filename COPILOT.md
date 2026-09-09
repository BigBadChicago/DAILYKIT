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
