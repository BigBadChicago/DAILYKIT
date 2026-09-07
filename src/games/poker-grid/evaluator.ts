import {
  HAND_CATEGORIES,
  HAND_ORDINAL,
  type HandCategory,
  type HandOrdinal,
} from "../../shared/poker-hands.js";

export const CARD_COUNT = 52;
export const HAND_SIZE = 5;

export function cardRank(card: number): number {
  return Math.floor(card / 4) + 2;
}

export function cardSuit(card: number): number {
  return card % 4;
}

function isStraight(ranks: readonly number[]): boolean {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique.length !== HAND_SIZE) return false;
  if ((unique[4] as number) - (unique[0] as number) === 4) return true;
  return unique[0] === 2 && unique[1] === 3 && unique[2] === 4 && unique[3] === 5 && unique[4] === 14;
}

export function classifyHand(cards: readonly number[]): HandCategory {
  if (cards.length !== HAND_SIZE) throw new RangeError("a poker hand must contain five cards");
  const ranks = cards.map(cardRank);
  const frequency = new Map<number, number>();
  for (const rank of ranks) {
    frequency.set(rank, (frequency.get(rank) ?? 0) + 1);
  }
  const groups = [...frequency.values()].sort((a, b) => b - a);
  const flush = cards.every((card) => cardSuit(card) === cardSuit(cards[0] as number));
  const straight = isStraight(ranks);
  if (straight && flush) return "straight-flush";
  if (groups[0] === 4) return "four-of-a-kind";
  if (groups[0] === 3 && groups[1] === 2) return "full-house";
  if (flush) return "flush";
  if (straight) return "straight";
  if (groups[0] === 3) return "three-of-a-kind";
  if (groups[0] === 2 && groups[1] === 2) return "two-pair";
  if (groups[0] === 2) return "one-pair";
  return "high-card";
}

export function handOrdinal(cards: readonly number[]): HandOrdinal {
  return HAND_ORDINAL[classifyHand(cards)];
}

export function isHand(cards: readonly number[]): boolean {
  return handOrdinal(cards) > HAND_ORDINAL[HAND_CATEGORIES[0]];
}
