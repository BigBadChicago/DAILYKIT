/**
 * Charter decision 2 and requirement 3.7.3. The board a player sees before
 * their first real puzzle.
 *
 * It is a fixed board rather than a generated one, and it is deliberately not
 * any day's puzzle, so a first time player cannot burn today's board learning
 * the controls. Nothing about it is recorded: it is not shareable, it does not
 * touch stats, and it cannot start or break a streak. That is enforced by the
 * shell, which never persists a tutorial session.
 *
 * ## How this board was chosen
 *
 * Screened over generated unlevered boards, keeping the one with the smallest
 * mean greedy shortfall, which is exactly the property the daily generator
 * rejects a board for: a board where taking the best hand in front of you keeps
 * working is a board with few traps, which is what a first board should be. The
 * chosen board's mean greedy shortfall is 0.10 against a scheduled median of
 * about 0.16, it clears all seven hands, and it opens with 488 legal moves, so
 * nothing a beginner tries first is a dead end.
 *
 * `best` is null on purpose. A tutorial result is never graded, so there is no
 * stored optimum to grade it against, and no tier is ever shown for it.
 */

import type { PokerPuzzle } from "./generator.js";

/** Puzzle numbers count from one, so zero cannot collide with a real day. */
export const TUTORIAL_PUZZLE_NUMBER = 0;

/* Board layout, row major, five columns by seven rows. Cards are the shared
   0 to 51 encoding. Regenerating this list means rerunning the screen above and
   updating the numbers in the comment with it. */
const TUTORIAL_CELLS: readonly number[] = [
  22, 17, 10, 34, 45,
  38, 50, 24, 9, 42,
  44, 29, 35, 8, 3,
  36, 51, 0, 33, 40,
  21, 27, 43, 14, 41,
  4, 48, 2, 47, 1,
  30, 12, 28, 6, 19,
];

export function tutorialPuzzle(): PokerPuzzle {
  return {
    number: TUTORIAL_PUZZLE_NUMBER,
    cells: TUTORIAL_CELLS.slice(),
    best: null,
    levers: ["none"],
  };
}
