/**
 * Suite wide share vocabulary. Requirement 7.3.6.
 *
 * Games emit semantic tokens and never codepoints. Closed to games on purpose:
 * a module cannot reach this file's contents through the layer rule, so no game
 * can drift the family look, and the emoji audit of Section 10.7 has exactly one
 * surface to check rather than five.
 *
 * Shape uniqueness is load bearing. Requirement 8.1 forbids meaning carried by
 * color alone, so the five tier tokens are five different shapes as well as five
 * different hues. SHARE_TOKEN_SHAPE exists so a test can assert that.
 *
 * Every glyph below has Emoji_Presentation=Yes, so none of them needs U+FE0F.
 * That is deliberate: a stray variation selector is the usual cause of a share
 * block that misaligns on one platform and not another.
 */

export type TierToken = "best" | "strong" | "partial" | "weak" | "miss";
export type BarToken = "barFull" | "barEmpty";
export type ShareToken = TierToken | BarToken;

/** Ordered best to worst. Index is the tier index used by every game. */
export const TIER_TOKENS: readonly TierToken[] = [
  "best",
  "strong",
  "partial",
  "weak",
  "miss",
];

/**
 * Codepoints, spelled out so a reviewer can check them without a hex editor.
 *   best     U+2B50            star
 *   strong   U+1F537           diamond
 *   partial  U+1F7E9           square
 *   weak     U+1F7E0           circle
 *   miss     U+1F53B           triangle
 *   barFull  U+1F7E6           square, fill state not a tier
 *   barEmpty U+2B1C            square, fill state not a tier
 */
export const SHARE_GLYPHS: Readonly<Record<ShareToken, string>> = {
  best: "\u2B50",
  strong: "\uD83D\uDD37",
  partial: "\uD83D\uDFE9",
  weak: "\uD83D\uDFE0",
  miss: "\uD83D\uDD3B",
  barFull: "\uD83D\uDFE6",
  barEmpty: "\u2B1C",
};

/** Asserted distinct across TIER_TOKENS by test. Bar tokens are exempt because
 *  they read as fill state within one row, never as a rank. */
export const SHARE_TOKEN_SHAPE: Readonly<Record<ShareToken, string>> = {
  best: "star",
  strong: "diamond",
  partial: "square",
  weak: "circle",
  miss: "triangle",
  barFull: "square",
  barEmpty: "square",
};

/** Padding token. The engine right pads short rows with this so requirement
 *  3.5.4 holds without every game counting its own columns. */
export const SHARE_PAD_TOKEN: ShareToken = "barEmpty";

export function glyphFor(token: ShareToken): string {
  return SHARE_GLYPHS[token];
}

export function renderShareRow(tokens: readonly ShareToken[]): string {
  let out = "";
  for (const token of tokens) out += SHARE_GLYPHS[token];
  return out;
}
