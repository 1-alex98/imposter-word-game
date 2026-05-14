import type { WordEntry, Difficulty } from '@/content/types';

export function filterByDifficulty(
  words: readonly WordEntry[],
  difficulty: Difficulty,
): WordEntry[] {
  return words.filter((w) => w.difficulty === difficulty);
}
