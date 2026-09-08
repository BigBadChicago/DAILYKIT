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

/* Called once per candidate selection, which is 961 times per board state and
   millions of times across a generation run, so this counts ranks into a
   reused scratch array rather than allocating a map, a values array, and a
   sort per call. Single threaded and non reentrant by construction: nothing
   inside this function can call it again. */
const RANK_LOW = 2;
const RANK_HIGH = 14;
const rankCounts = new Uint8Array(RANK_HIGH + 1);

export function classifyHand(cards: readonly number[]): HandCategory {
  if (cards.length !== HAND_SIZE) throw new RangeError("a poker hand must contain five cards");
  rankCounts.fill(0);
  let suitMask = 0;
  for (const card of cards) {
    const rank = cardRank(card);
    rankCounts[rank] = (rankCounts[rank] as number) + 1;
    suitMask |= 1 << cardSuit(card);
  }
  const flush = (suitMask & (suitMask - 1)) === 0;

  let distinct = 0;
  let pairs = 0;
  let trips = 0;
  let quads = 0;
  let lowest = RANK_HIGH + 1;
  let highest = 0;
  for (let rank = RANK_LOW; rank <= RANK_HIGH; rank += 1) {
    const count = rankCounts[rank] as number;
    if (count === 0) continue;
    distinct += 1;
    if (rank < lowest) lowest = rank;
    if (rank > highest) highest = rank;
    if (count === 2) pairs += 1;
    else if (count === 3) trips += 1;
    else if (count === 4) quads += 1;
  }

  /* The wheel is the only straight that is not a contiguous run, because the
     ace is stored high and plays low only here. */
  const wheel = distinct === HAND_SIZE
    && rankCounts[RANK_HIGH] === 1
    && rankCounts[2] === 1 && rankCounts[3] === 1 && rankCounts[4] === 1 && rankCounts[5] === 1;
  const straight = (distinct === HAND_SIZE && highest - lowest === HAND_SIZE - 1) || wheel;

  if (straight && flush) return "straight-flush";
  if (quads === 1) return "four-of-a-kind";
  if (trips === 1 && pairs === 1) return "full-house";
  if (flush) return "flush";
  if (straight) return "straight";
  if (trips === 1) return "three-of-a-kind";
  if (pairs === 2) return "two-pair";
  if (pairs === 1) return "one-pair";
  return "high-card";
}

export function handOrdinal(cards: readonly number[]): HandOrdinal {
  return HAND_ORDINAL[classifyHand(cards)];
}

export function isHand(cards: readonly number[]): boolean {
  return handOrdinal(cards) > HAND_ORDINAL[HAND_CATEGORIES[0]];
}
