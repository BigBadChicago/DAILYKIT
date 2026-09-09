---
name: Tests
description: What a test in this repository has to do, and what it must never do
applyTo: "tests/**"
---

No feature is complete without its test, and a manual check failure that a test
could have caught means the suite had a hole. Closing the hole is part of the
fix, not a follow up.

## Rules

1. **Write the failing test first.** Watch it fail for the reason you expect
   before you fix anything. A test written after a fix tends to test the fix
   rather than the defect.
2. **Never weaken a test to make a suite green.** Not a loosened assertion, not a
   skip, not a deleted case, not a widened tolerance. If a test is genuinely
   wrong, say why in your report before changing it.
3. **Cover the rejection paths.** Rules coverage means every reason `apply` can
   refuse, not just the happy move.
4. **Determinism is a test, not a hope.** The same puzzle number produces a byte
   identical puzzle across runs.
5. **Migrations are tested from every historical version**, asserting stats
   survive.
6. **Property style tests belong on the RNG and on the rules.** No legal sequence
   of actions may produce an invalid state.
7. **Share strings get snapshot coverage across the outcome space**, including
   the unrated case and the row cap.
8. **jsdom is selected per file by a docblock.** Layers 0 and 1 stay in Node. Do
   not move the whole suite into a browser environment for convenience.
9. **Tests may import from `tools/`.** That is how the generation pipeline is
   covered.
10. **Keep tests fast and honest.** A solver test uses a compact board or a
    narrow beam. If a case genuinely needs seconds of search, say so in a comment
    with the reason.
11. **Name what the test protects, not what it calls.** The title should read as
    the property that must hold.
