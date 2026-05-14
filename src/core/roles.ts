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

interface Picks {
  imposterIndex: number;
  entry: WordEntry;
}

function picksFor(
  seed: number,
  round: number,
  playerCount: number,
  words: readonly WordEntry[],
): Picks {
  if (playerCount < 1) throw new Error('playerCount must be >= 1');
  if (words.length === 0) throw new Error('Word list is empty');
  // Single shared RNG stream — order of draws is the only thing that matters.
  // Every device that calls this for the same (seed, round, playerCount, words)
  // gets the same picks because nothing here is time- or platform-dependent.
  const rng = rngFor(seed, round);
  const impIdx = rng.pickIndex(playerCount);
  const entry = words[rng.pickIndex(words.length)];
  return { imposterIndex: impIdx, entry };
}

export function imposterIndex(
  seed: number,
  round: number,
  playerCount: number,
  words: readonly WordEntry[],
): number {
  return picksFor(seed, round, playerCount, words).imposterIndex;
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
  const { imposterIndex: imp, entry } = picksFor(seed, round, playerCount, words);
  if (playerIndex === imp) {
    return { isImposter: true, hint: entry.hint };
  }
  return { isImposter: false, word: entry.word, hint: entry.hint };
}
