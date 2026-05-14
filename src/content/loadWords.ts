import type { WordEntry } from './types';
import { isWordList } from './types';

export async function loadWords(lang: 'en' | 'de'): Promise<WordEntry[]> {
  const mod =
    lang === 'en'
      ? await import('./words.en.seed.json')
      : await import('./words.de.seed.json');

  const raw = mod.default;
  if (!isWordList(raw)) throw new Error(`Invalid word list: ${lang}`);
  return raw;
}
