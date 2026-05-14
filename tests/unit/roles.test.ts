import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { roleFor, imposterIndex } from '../../src/core/roles';
import { seedWords } from '../../src/content/seedWords';

const words = seedWords.en;

describe('roleFor', () => {
  it('exactly one imposter per round', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.nat({ max: 1_000_000 }),
        fc.integer({ min: 4, max: 12 }),
        (seed, round, playerCount) => {
          let imposterCount = 0;
          for (let p = 0; p < playerCount; p++) {
            const role = roleFor({ playerIndex: p, seed, round, playerCount, words });
            if (role.isImposter) imposterCount++;
          }
          expect(imposterCount).toBe(1);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('all innocents share the same word', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.nat({ max: 1_000_000 }),
        fc.integer({ min: 4, max: 12 }),
        (seed, round, playerCount) => {
          const innocentWords = new Set<string>();
          for (let p = 0; p < playerCount; p++) {
            const role = roleFor({ playerIndex: p, seed, round, playerCount, words });
            if (!role.isImposter) innocentWords.add(role.word);
          }
          expect(innocentWords.size).toBe(1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('imposter result excludes word property', () => {
    for (let p = 0; p < 6; p++) {
      const role = roleFor({ playerIndex: p, seed: 999, round: 1, playerCount: 6, words });
      if (role.isImposter) {
        expect('word' in role).toBe(false);
      }
    }
  });

  it('is pure — repeated calls return deep-equal results', () => {
    const args = { playerIndex: 2, seed: 17, round: 5, playerCount: 8, words };
    const a = roleFor(args);
    const b = roleFor(args);
    expect(a).toEqual(b);
  });

  it('imposterIndex stable across calls', () => {
    expect(imposterIndex(42, 1, 6, words)).toBe(imposterIndex(42, 1, 6, words));
  });
});
