import enJson from './words.en.seed.json';
import deJson from './words.de.seed.json';
import type { WordEntry } from './types';
import { isWordList } from './types';

function load(raw: unknown, label: string): WordEntry[] {
  if (!isWordList(raw)) {
    throw new Error(`Invalid word list: ${label}`);
  }
  return raw;
}

export const seedWords: Record<'en' | 'de', WordEntry[]> = {
  en: load(enJson, 'en'),
  de: load(deJson, 'de'),
};
