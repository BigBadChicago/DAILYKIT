---
name: changelog-entry
description: Add a player facing changelog entry for a change that shipped
argument-hint: what changed, in the words a player would understand
agent: agent
---

Add a changelog entry to `src/shell/changelog.ts` for this change:

${input:change}

Rules:

- The next integer version, appended to the end of `CHANGELOG_ENTRIES`. Never
  renumber an existing entry.
- Today's date as written in the file's existing format.
- `games` names only the games a player would notice this in, or `SUITE_WIDE`
  when it affects all of them. A player who only opens one game must never be
  told what changed in a game they have never played.
- Lines are written for a player, not for an engineer. No file names, no layer
  names, no jargon. Say what is different when they use the site.
- No dashes as punctuation.
- Only add an entry if a player would actually notice. An internal refactor, a
  test, or a tooling change gets nothing. If this change is invisible to
  players, say so and add nothing.

Then run `npm test` and paste the result, since `tests/shell/changelog.test.ts`
asserts the list's shape.
