---
name: review-change
description: Review the current diff against the DAILYKIT constraints before it is committed
agent: agent
---

Review the current working tree diff against this project's rules. Make no
edits. Report findings only.

Check each of these and say pass or fail with the file and line for every
failure:

1. The layer rule. No upward import, no game importing another game. Confirm
   with `npm run depcheck` as well as by reading.
2. Any numbered decision in `ARCHITECTURE.md` that the diff contradicts, quoted.
3. Any POKER GRID locked decision or listed invariant the diff weakens.
4. Hard constraints: a new dependency, a framework, browser storage used outside
   the storage module, a clock read in Layer 0 or Layer 1, `Math.random`,
   `innerHTML` or any HTML string set, a third party network call.
5. Test discipline: is every behaviour change covered, and was any existing test
   weakened, skipped, or deleted.
6. Accessibility: keyboard reachability, focus, live region announcements,
   meaning carried by color alone, touch target size, reduced motion.
7. Documentation duties: `ARCHITECTURE.md` manifest rows and decisions,
   `BACKLOG.md` for anything deferred, `ASSETS.md` for new assets, the game
   design document for a rules change, a changelog entry if a player would
   notice.
8. Prose style: dashes used as punctuation anywhere in the diff, comments that
   restate the code instead of explaining why.

Finish with a single verdict line: ready to commit, or not ready with the
shortest list of what would make it ready.
