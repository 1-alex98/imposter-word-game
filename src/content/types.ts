export type Difficulty = 'easy' | 'medium';

export interface WordEntry {
  word: string;
  hint: string;
  difficulty: Difficulty;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium'];

export function isWordEntry(value: unknown): value is WordEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.word !== 'string' || v.word.trim() === '') return false;
  if (typeof v.hint !== 'string' || v.hint.trim() === '') return false;
  if (typeof v.difficulty !== 'string') return false;
  return DIFFICULTIES.includes(v.difficulty as Difficulty);
}

export function isWordList(value: unknown): value is WordEntry[] {
  return Array.isArray(value) && value.every(isWordEntry);
}
