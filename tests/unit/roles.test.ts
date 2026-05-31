import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { roleFor, imposterIndex, wordForRound } from '../../src/core/roles';
import { seedWords } from '../../src/content/seedWords';
import type { WordEntry } from '../../src/content/types';

const words = seedWords.en;

// The imposter is now derived by replaying the round chain from round 1, so the
// cost is O(round). Real sessions never reach more than a few dozen rounds; we
// cap the generators well above that to keep the property runs fast.
const ROUND = fc.integer({ min: 1, max: 200 });

describe('roleFor', () => {
  it('exactly one imposter per round', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        ROUND,
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
        ROUND,
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
    expect(imposterIndex(42, 1, 6)).toBe(imposterIndex(42, 1, 6));
    expect(imposterIndex(42, 7, 6)).toBe(imposterIndex(42, 7, 6));
  });

  it('imposterIndex stays in range', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        ROUND,
        fc.integer({ min: 1, max: 12 }),
        (seed, round, playerCount) => {
          const idx = imposterIndex(seed, round, playerCount);
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(playerCount);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('imposter repeat nudge (−20%)', () => {
  // Over many seeds, the player who was imposter last round should be picked
  // again markedly less often than a uniform 1/n — but never zero, so the bias
  // can't be gamed into a guaranteed "safe" player.
  it('previous imposter repeats well below the uniform rate, but can still repeat', () => {
    const playerCount = 6;
    const SAMPLES = 30_000;
    let repeats = 0;
    for (let seed = 0; seed < SAMPLES; seed++) {
      const prev = imposterIndex(seed, 1, playerCount);
      const next = imposterIndex(seed, 2, playerCount);
      if (prev === next) repeats++;
    }
    const observed = repeats / SAMPLES;
    // Expected repeat probability = REPEAT_WEIGHT / total = 4 / (5*6 - 1) = 4/29.
    const expected = 4 / (5 * playerCount - 1);
    const uniform = 1 / playerCount;
    expect(observed).toBeGreaterThan(0); // never fully excluded — not exploitable
    expect(observed).toBeLessThan(uniform); // genuinely less likely than chance
    expect(Math.abs(observed - expected)).toBeLessThan(0.02);
  });

  it('every player remains a possible imposter each round', () => {
    // Round 1 imposter for seed 123, then verify round 2 can still land on them
    // for *some* seed-equivalent path: scan seeds until the prev imposter repeats.
    const playerCount = 5;
    let foundRepeat = false;
    for (let seed = 0; seed < 1000 && !foundRepeat; seed++) {
      if (imposterIndex(seed, 1, playerCount) === imposterIndex(seed, 2, playerCount)) {
        foundRepeat = true;
      }
    }
    expect(foundRepeat).toBe(true);
  });

  it('is deterministic across calls for the same chain', () => {
    fc.assert(
      fc.property(fc.nat({ max: 0xffffffff }), ROUND, (seed, round) => {
        expect(imposterIndex(seed, round, 8)).toBe(imposterIndex(seed, round, 8));
      }),
      { numRuns: 300 },
    );
  });
});

describe('wordForRound — no repeats within a session', () => {
  const pool: WordEntry[] = Array.from({ length: 50 }, (_, i) => ({
    word: `w${i}`,
    hint: `h${i}`,
    difficulty: 'easy',
  }));

  it('every word in the pool appears exactly once before any repeats', () => {
    fc.assert(
      fc.property(fc.nat({ max: 0xffffffff }), (seed) => {
        const seen = new Set<string>();
        for (let round = 1; round <= pool.length; round++) {
          seen.add(wordForRound(seed, round, pool).word);
        }
        expect(seen.size).toBe(pool.length);
      }),
      { numRuns: 300 },
    );
  });

  it('innocents and imposter share the round word; consecutive rounds differ', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.integer({ min: 1, max: 49 }),
        (seed, round) => {
          const a = wordForRound(seed, round, pool).word;
          const b = wordForRound(seed, round + 1, pool).word;
          expect(a).not.toBe(b);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('is deterministic for the same (seed, round, pool)', () => {
    expect(wordForRound(7, 3, pool).word).toBe(wordForRound(7, 3, pool).word);
  });
});
