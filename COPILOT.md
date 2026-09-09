# Driving Copilot through a MANUAL CHECKS run

This file is for the human. It explains what is installed, how Copilot picks it
up, and how to phrase a failure so that Copilot fixes the cause without needing
rework afterwards.

## 1. What is installed

| File | What it does | When Copilot sees it |
|---|---|---|
| `.github/copilot-instructions.md` | The master instructions: constraints, the layer rule, locked decisions, invariants, the command gate, the defect protocol, the diagnosis table, documentation duties, and the definition of done | Every chat request, automatically |
| `AGENTS.md` | A short pointer to the same rules, for agents that read the open standard rather than the Copilot path | Every request, when `chat.useAgentsMdFile` is on |
| `.github/instructions/core-and-engine.instructions.md` | Layer 0 and Layer 1 rules | When the request touches `src/core`, `src/engine`, `src/shared` |
| `.github/instructions/presentation.instructions.md` | Layer 2 rules | When it touches `src/ui` |
| `.github/instructions/contract.instructions.md` | Layer 3, the game module seam | When it touches `src/contract` |
| `.github/instructions/games.instructions.md` | Layer 4 rules and the abstraction test | When it touches `src/games` |
| `.github/instructions/shell-and-hub.instructions.md` | Layer 5, the hub, the service worker, the about page | When it touches `src/shell`, `src/hub`, `src/sw`, `src/about` |
| `.github/instructions/tests.instructions.md` | What a test here must do | When it touches `tests` |
| `.github/instructions/tools-and-build.instructions.md` | Tooling, bundler, CI | When it touches `tools`, the configs, the workflows |
| `.github/instructions/docs.instructions.md` | How the documents are written and kept true | When it touches any markdown |
| `.github/prompts/*.prompt.md` | Reusable commands you invoke by name | Only when you run them |
| `.vscode/settings.json` | Turns the above on for this workspace | On open |

Nothing here changes the build or ships to players. It is all editor and agent
configuration.

## 2. One time setup in VS Code

1. Open the repository folder in VS Code and trust the workspace, so the
   workspace settings apply.
2. Install the GitHub Copilot and GitHub Copilot Chat extensions and sign in.
3. Open the Chat view and switch the mode selector to **Agent**. Ask mode can
   read and suggest but cannot run the verification gate, and the gate is the
   whole point.
4. Confirm the instructions are being applied: send any request in Agent mode and
   expand the References or Used references section on the reply. You should see
   `copilot-instructions.md` listed, plus any matching `.instructions.md` file
   for the paths in play.
5. Type `/` in the chat box. You should see `manual-check`, `verify`, `onboard`,
   `changelog-entry`, and `review-change` offered.

If the prompt files do not appear, check that `chat.promptFilesLocations` in
`.vscode/settings.json` survived, and reload the window.

## 3. Before your first checks run

Run `/onboard` once in a fresh chat and read what comes back.

It makes Copilot read the architecture and the source and prove its
understanding: the layer map, the contract, the day lifecycle, the data path,
the five things most likely to break, and a list of anything stale it found. It
makes no edits.

Two reasons to do this. It gives you a cheap read on whether Copilot actually
understands the codebase before you trust it with a fix, and its list of stale
or contradictory things is usually worth acting on by itself. If its layer map
is wrong, the fixes it proposes later will be wrong in the same way, and that is
much better to learn now.

Start a **new chat** for each defect afterwards. A long chat carries stale
context and it is the most common cause of an agent confidently editing the
wrong file.

## 4. Reporting a failure

In a new chat, type `/manual-check` and then the report. The prompt handles the
protocol. What it needs from you is precision about three things: which check,
where, and what you saw.

A good report:

```text
/manual-check Section 2, row alignment, daily card. WhatsApp on iOS 18. Four
games finished and one unrated. The unrated row is visibly narrower than the
other four, so the block reads ragged on the right. Screenshot attached. The
same block in Slack on Windows looks square.
```

A weak report, which will cost you a round trip:

```text
/manual-check the share thing looks off on my phone
```

The three things to always include:

1. **The section and the exact check.** `MANUAL-CHECKS.md` numbers them. Quote
   the pass condition if you can.
2. **The platform and the client.** iOS 18 in WhatsApp is a different code path
   from Windows in Slack, and glyph and alignment defects are almost always
   specific to one.
3. **What you saw against what the check says should happen.** Copilot cannot
   see your screen. If you have a screenshot, attach it: the chat accepts
   images, and for a rendering or alignment defect one is worth several
   paragraphs.

Useful extras when you have them: whether it reproduces every time or once, what
you did immediately before, whether it also happens in another client, and
anything in the browser console.

## 5. What Copilot will do, and what to check

It is instructed to work in this order: quote the failed pass condition,
reproduce it in the repository, name the layer before editing, write the failing
test first, fix the cause, run the whole gate, update the documents, then report.

Before you accept a fix, check three things in its reply.

1. **Did it paste real command output?** The instructions require it. Reasoning
   without output means nothing was actually run.
2. **Did it add or change a test?** If it says the failure cannot be automated,
   it must say why. Glyph rendering on a specific platform is a fair example.
   Streak arithmetic is not.
3. **Did it touch the documents?** A fix without an `ARCHITECTURE.md` update,
   when a file or a decision changed, is unfinished by this project's rules.

If any of those is missing, reply with one line: `Finish the definition of done
in section 13 of the instructions.` That is faster than explaining it again.

## 6. Before committing

Run `/review-change` in the same chat. It reviews the working tree diff against
the layer rule, the numbered decisions, the locked decisions, the hard
constraints, test discipline, accessibility, documentation duties, and prose
style, and it makes no edits. It ends with a ready or not ready verdict.

Then run `/verify` if you want the gate run again cleanly, on its own, with the
numbers in front of you.

## 7. When Copilot should push back

The instructions tell it to stop and ask rather than proceed when a fix would
contradict a numbered decision, need a new dependency, change a hard constraint,
change stored data shapes without an obvious migration, or reopen a POKER GRID
locked decision. They also tell it to stop when it cannot reproduce the failure
from what you gave it.

If it stops and asks, that is the instructions working. The answer is a decision
for you, not something to delegate back.

## 8. Keeping this accurate

These instructions are only as good as the documents they point at. Two habits
keep them true.

When `ARCHITECTURE.md` gains a decisions section for a new area, or a new layer
or top level directory appears, add or extend the matching
`.github/instructions/*.instructions.md` file so the rule lands automatically on
the right paths.

When Copilot makes the same mistake twice, that is a gap in the instructions
rather than a fact about the model. Write the rule that would have prevented it
into the file that governs those paths, in the same words you would use to
correct a person, and it will not come back.
