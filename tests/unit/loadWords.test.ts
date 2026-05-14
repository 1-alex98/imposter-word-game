import { describe, it, expect } from 'vitest';
import { loadWords } from '../../src/content/loadWords';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('loadWords', () => {
  it('returns a Promise', () => {
    const result = loadWords('en');
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it('resolves to a non-empty WordEntry[] for en', async () => {
    const words = await loadWords('en');
    expect(words.length).toBeGreaterThan(0);
    expect(words[0]).toMatchObject({ word: expect.any(String), hint: expect.any(String), difficulty: expect.any(String) });
  });

  it('resolves to a non-empty WordEntry[] for de', async () => {
    const words = await loadWords('de');
    expect(words.length).toBeGreaterThan(0);
  });

  it('resolves independently for each lang', async () => {
    const [en, de] = await Promise.all([loadWords('en'), loadWords('de')]);
    expect(en).not.toBe(de);
  });
});

const DIST_ASSETS = join(__dirname, '../../dist/assets');

describe.skipIf(!existsSync(DIST_ASSETS))('build: word data is not in the initial chunk', () => {
  it('main entry chunk does not contain word list data', () => {
    const jsFiles = readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.js'));
    const mainEntry = jsFiles.find((f) => f.startsWith('index-'));
    if (!mainEntry) throw new Error('No main entry chunk (index-*.js) found in dist/assets');
    const content = readFileSync(join(DIST_ASSETS, mainEntry), 'utf-8');
    // "Krankenwagen" is the first word in the DE seed list — must live in a lazy chunk
    expect(content).not.toContain('Krankenwagen');
  });
});
