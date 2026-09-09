---
name: verify
description: Run the full verification gate and report honestly
agent: agent
---

Run the verification gate for DAILYKIT and report the result. Do not fix
anything in this run unless I say so: the job here is an accurate picture.

```text
npm run typecheck
npm run typecheck:tools
npm run typecheck:sw
npm run depcheck
npm test
npm run poker-grid:verify
npm run cipher:verify
npm run build
npm run budget
```

Rules for this run:

- Run every command even after one fails, so I see the whole picture, unless a
  failure makes a later command meaningless. Say which ones you skipped and why.
- Paste the real tail of each command's output, including the numbers. Do not
  summarise a pass as "ok" without the counts.
- If `npm test` appears to hang for several minutes, read the section "Running
  the test suite" in `ARCHITECTURE.md` before doing anything else. On a mounted
  or network filesystem the cost is jsdom module resolution, not the tests. Do
  not change the Vitest configuration.
- End with a table: command, pass or fail, the key number, and for each failure
  one sentence on what it appears to be. No fixes, no edits.
