import { describe, it, expect } from 'vitest';
import { filterByDifficulty } from '../../src/core/words';
import { seedWords } from '../../src/content/seedWords';
import { isWordEntry } from '../../src/content/types';

describe('filterByDifficulty', () => {
  it('returns only entries matching the given tier (en seed)', () => {
    for (const tier of ['easy', 'medium'] as const) {
      const out = filterByDifficulty(seedWords.en, tier);
      expect(out.length).toBeGreaterThan(0);
      for (const w of out) {
        expect(w.difficulty).toBe(tier);
      }
    }
  });

  it('returns only entries matching the given tier (de seed)', () => {
    for (const tier of ['easy', 'medium'] as const) {
      const out = filterByDifficulty(seedWords.de, tier);
      expect(out.length).toBeGreaterThan(0);
      for (const w of out) {
        expect(w.difficulty).toBe(tier);
      }
    }
  });

  it('returns [] when no entries match', () => {
    const out = filterByDifficulty(
      [{ word: 'A', hint: 'X', difficulty: 'easy' }],
      'medium',
    );
    expect(out).toEqual([]);
  });

  it('does not mutate the source list', () => {
    const src = [...seedWords.en];
    const before = JSON.stringify(src);
    filterByDifficulty(src, 'easy');
    expect(JSON.stringify(src)).toBe(before);
  });
});

describe('seed word lists (story 3.1)', () => {
  it('ship at least 20 entries per language', () => {
    expect(seedWords.en.length).toBeGreaterThanOrEqual(20);
    expect(seedWords.de.length).toBeGreaterThanOrEqual(20);
  });

  it('every entry validates against the schema', () => {
    for (const lang of ['en', 'de'] as const) {
      for (const entry of seedWords[lang]) {
        expect(isWordEntry(entry)).toBe(true);
      }
    }
  });

  it('cover both difficulty tiers per language', () => {
    for (const lang of ['en', 'de'] as const) {
      for (const tier of ['easy', 'medium'] as const) {
        const tierEntries = seedWords[lang].filter((w) => w.difficulty === tier);
        expect(tierEntries.length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects malformed entries', () => {
    expect(isWordEntry({ word: 'X', hint: 'Y', difficulty: 'impossible' })).toBe(false);
    expect(isWordEntry({ word: '', hint: 'Y', difficulty: 'easy' })).toBe(false);
    expect(isWordEntry({ word: 'X', hint: '', difficulty: 'easy' })).toBe(false);
    expect(isWordEntry({ word: 'X', difficulty: 'easy' })).toBe(false);
    expect(isWordEntry(null)).toBe(false);
    expect(isWordEntry('not an object')).toBe(false);
  });
});
