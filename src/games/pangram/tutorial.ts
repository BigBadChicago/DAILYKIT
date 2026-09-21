/**
 * Layer 4. The PANGRAM first session day, embedded. PANGRAM.md 31.
 *
 * Every other day arrives in the manifest; the tutorial is a session mode that
 * never counts (ARCHITECTURE2 section 40), so it carries its own answers. The
 * set was picked because every answer is a familiar word and the pangram,
 * HABITATION, is an everyday one. tests/games/pangram/generator.test.ts solves
 * the set against the committed lists and requires this exact list, so it
 * cannot drift from the dictionary.
 */

export const FIRST_SESSION = {
  letters: "abhinot",
  centre: "h",
  answers: [
    "bath",
    "booth",
    "both",
    "habit",
    "habitat",
    "habitation",
    "hint",
    "hobbit",
    "hobnob",
    "hobo",
    "hoot",
    "inhabit",
    "inhabitant",
    "inhibit",
    "inhibition",
    "ninth",
    "oath",
    "than",
    "that",
    "thin",
    "tooth",
  ],
} as const;
