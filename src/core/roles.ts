import { rngFor } from './rng';
import type { WordEntry } from '@/content/types';

export interface InnocentRole {
  isImposter: false;
  word: string;
  hint: string;
}
export interface ImposterRole {
  isImposter: true;
  hint: string;
}
export type Role = InnocentRole | ImposterRole;

// "Don't be the imposter twice in a row" nudge: the player who was imposter in
// the immediately preceding round is 20% less likely to be picked again. People
// read a true coin-flip that lands on the same person twice as "not random", so
// we bend the odds to match that expectation — without ever taking anyone fully
// out of the running.
//
// Integer weights only (4/5 == 0.8): floats could round differently across
// devices and desync the game, which is the highest-impact bug class (SPEC §8).
const NORMAL_WEIGHT = 5;
const REPEAT_WEIGHT = 4; // 20% less than NORMAL_WEIGHT

// Salt for the session-level word shuffle. Real rounds are >= 1, so round 0 is a
// free, collision-proof stream that's independent of the per-round imposter draw.
const WORD_STREAM = 0;

/**
 * Index of the imposter for a given round.
 *
 * Depends only on (seed, round, playerCount) — never on the word list — so the
 * whole imposter chain is cheap to replay. The previous round's imposter carries
 * a reduced weight (see NORMAL_WEIGHT / REPEAT_WEIGHT); the penalty applies to
 * the most recent round only, it does not stack.
 *
 * Computed iteratively from round 1 forward (not recursively) so deep rounds
 * can't overflow the stack. Every device replays the same chain from the seed,
 * so all devices agree on the imposter.
 */
export function imposterIndex(seed: number, round: number, playerCount: number): number {
  if (playerCount < 1) throw new Error('playerCount must be >= 1');

  // Round 1 (or any non-positive round) has no predecessor: pick uniformly.
  let prev = rngFor(seed, round <= 1 ? round : 1).pickIndex(playerCount);
  if (round <= 1) return prev;

  // Total weight = every player at NORMAL minus the one-step discount for `prev`.
  const total = NORMAL_WEIGHT * playerCount - (NORMAL_WEIGHT - REPEAT_WEIGHT);

  for (let r = 2; r <= round; r++) {
    const target = rngFor(seed, r).pickIndex(total);
    let acc = 0;
    let pick = playerCount - 1; // fallback; the loop below always assigns it
    for (let i = 0; i < playerCount; i++) {
      acc += i === prev ? REPEAT_WEIGHT : NORMAL_WEIGHT;
      if (target < acc) {
        pick = i;
        break;
      }
    }
    prev = pick;
  }
  return prev;
}

/**
 * Word for a given round, drawn from a session-level shuffle of the pool.
 *
 * The shuffle is seeded once per (seed, pool) and indexed by round, so no word
 * repeats within a session until the pool is exhausted (SPEC §8). Only the first
 * `idx + 1` entries are shuffled, so early rounds stay cheap.
 */
export function wordForRound(
  seed: number,
  round: number,
  words: readonly WordEntry[],
): WordEntry {
  if (words.length === 0) throw new Error('Word list is empty');
  const n = words.length;
  // ((round-1) % n + n) % n keeps the index in range even for round <= 0.
  const idx = (((round - 1) % n) + n) % n;
  const order = rngFor(seed, WORD_STREAM).pickWithoutReplacement(words, idx + 1);
  return order[idx];
}

export interface RoleArgs {
  playerIndex: number;
  seed: number;
  round: number;
  words: readonly WordEntry[];
  playerCount: number;
}

export function roleFor(args: RoleArgs): Role {
  const { playerIndex, seed, round, words, playerCount } = args;
  if (playerIndex < 0 || playerIndex >= playerCount) {
    throw new Error('playerIndex out of range');
  }
  const imp = imposterIndex(seed, round, playerCount);
  const entry = wordForRound(seed, round, words);
  if (playerIndex === imp) {
    return { isImposter: true, hint: entry.hint };
  }
  return { isImposter: false, word: entry.word, hint: entry.hint };
}
