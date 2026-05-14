import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import fc from 'fast-check';
import { rngFor } from '../../src/core/rng';

describe('rng module', () => {
  it('does not reference Math.random in its source', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../src/core/rng.ts'),
      'utf8',
    );
    expect(src.includes('Math.random')).toBe(false);
  });

  it('produces identical sequences for the same (seed, round)', () => {
    const a = rngFor(12345, 1);
    const b = rngFor(12345, 1);
    const seqA = Array.from({ length: 20 }, () => a.nextU32());
    const seqB = Array.from({ length: 20 }, () => b.nextU32());
    expect(seqA).toEqual(seqB);
  });

  it('different rounds diverge', () => {
    const a = rngFor(42, 1);
    const b = rngFor(42, 2);
    const seqA = Array.from({ length: 10 }, () => a.nextU32());
    const seqB = Array.from({ length: 10 }, () => b.nextU32());
    expect(seqA).not.toEqual(seqB);
  });

  it('pickIndex stays within bounds', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.nat({ max: 1_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        (seed, round, len) => {
          const rng = rngFor(seed, round);
          for (let i = 0; i < 50; i++) {
            const v = rng.pickIndex(len);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(len);
            expect(Number.isInteger(v)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('pickWithoutReplacement returns unique items', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.nat({ max: 1_000_000 }),
        fc.integer({ min: 1, max: 20 }),
        (seed, round, n) => {
          const arr = Array.from({ length: 20 }, (_, i) => i);
          const rng = rngFor(seed, round);
          const picks = rng.pickWithoutReplacement(arr, n);
          expect(picks.length).toBe(n);
          expect(new Set(picks).size).toBe(n);
          picks.forEach((p) => expect(arr).toContain(p));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cross-engine fixture parity (golden file)', () => {
    // Pin known sequences. Identical bytes must be produced everywhere this runs.
    const golden: Record<string, number[]> = {
      '0:0': [],
      '1:1': [],
      '12345:7': [],
      '4294967295:100': [],
    };
    for (const k of Object.keys(golden)) {
      const [seed, round] = k.split(':').map((s) => Number(s));
      const rng = rngFor(seed, round);
      golden[k] = Array.from({ length: 8 }, () => rng.nextU32());
    }
    const fixturePath = path.resolve(__dirname, '../fixtures/rng-golden.json');
    if (!existsSync(fixturePath)) {
      writeFileSync(fixturePath, JSON.stringify(golden, null, 2));
    }
    const stored = JSON.parse(readFileSync(fixturePath, 'utf8'));
    expect(golden).toEqual(stored);
  });

  it('property: same (seed, round, playerCount) yields same imposter index', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.nat({ max: 1_000_000 }),
        fc.integer({ min: 4, max: 12 }),
        (seed, round, players) => {
          const a = rngFor(seed, round).pickIndex(players);
          const b = rngFor(seed, round).pickIndex(players);
          expect(a).toBe(b);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
