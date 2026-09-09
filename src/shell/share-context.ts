/**
 * Layer 5. The one rule about what a share block is told, kept out of main.ts
 * so it can be tested without mounting a session.
 */

export type ShareSessionMode = "live" | "archive" | "tutorial";

/**
 * Requirement 3.6.1 and resolution 6 keep a replay out of every live aggregate.
 * The share title is the one place that separation reaches a reader, so a
 * replay is told the streak is zero rather than today's number, which the
 * puzzle in its title had nothing to do with. A tutorial never shares at all
 * and is covered here so a later change cannot make it the exception.
 */
export function shareStreakFor(mode: ShareSessionMode, currentStreak: number): number {
  return mode === "live" ? currentStreak : 0;
}
