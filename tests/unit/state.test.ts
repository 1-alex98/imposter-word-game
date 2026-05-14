import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { encodeState, decodeState, StateDecodeError, type GameState } from '../../src/core/state';

function makeState(over: Partial<GameState> = {}): GameState {
  return {
    version: 'abc123',
    names: ['Anna', 'Björn', 'Caro', 'Dieter'],
    lang: 'de',
    difficulty: 'medium',
    hintsEnabled: true,
    seed: 12345,
    ...over,
  };
}

describe('state codec', () => {
  it('round-trips a simple state', () => {
    const s = makeState();
    expect(decodeState(encodeState(s))).toEqual(s);
  });

  it('preserves umlauts and emoji in names', () => {
    const s = makeState({ names: ['Müller', 'Größe', 'Ütopia', '🎉name'] });
    expect(decodeState(encodeState(s))).toEqual(s);
  });

  it('preserves 1-char and max-length name lists', () => {
    const min = makeState({ names: ['a', 'b', 'c', 'd'] });
    expect(decodeState(encodeState(min))).toEqual(min);
    const max = makeState({
      names: Array.from({ length: 12 }, (_, i) => `Player${i}`),
    });
    expect(decodeState(encodeState(max))).toEqual(max);
  });

  it('rejects malformed inputs', () => {
    expect(() => decodeState('')).toThrow(StateDecodeError);
    expect(() => decodeState('not-base64-!@#')).toThrow(StateDecodeError);
    expect(() => decodeState('YWJjZA')).toThrow(StateDecodeError); // "abcd" is not JSON
    // wrong-schema payload
    const badSchema = encodeState(makeState());
    const bad = badSchema.slice(0, 8); // truncated
    expect(() => decodeState(bad)).toThrow(StateDecodeError);
  });

  it('rejects out-of-range name counts', () => {
    const tooFew = makeState({ names: ['a', 'b', 'c'] });
    expect(() => decodeState(encodeState(tooFew))).toThrow(StateDecodeError);
    const tooMany = makeState({
      names: Array.from({ length: 13 }, (_, i) => `P${i}`),
    });
    expect(() => decodeState(encodeState(tooMany))).toThrow(StateDecodeError);
  });

  it('rejects invalid enum values', () => {
    // Hand-craft a payload with a bad difficulty
    const json = JSON.stringify({
      v: 'x',
      n: ['a', 'b', 'c', 'd'],
      l: 'en',
      d: 'extreme',
      h: 1,
      s: 0,
    });
    const enc = Buffer.from(json, 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(() => decodeState(enc)).toThrow(StateDecodeError);
  });

  it('worst-case payload (12 German firstnames + max settings) < 2 KB', () => {
    const worst = makeState({
      names: ['Maximilian', 'Charlotte', 'Sebastian', 'Friedrich', 'Wilhelmina',
              'Alexandra', 'Konstantin', 'Heinrich', 'Joséphine', 'Gertraude',
              'Hildegard', 'Sigismund'],
      version: 'abcdef012345',
      seed: 4_294_967_295,
    });
    expect(encodeState(worst).length).toBeLessThan(2048);
  });

  it('property: round-trips 500 random valid states', () => {
    fc.assert(
      fc.property(
        fc.record({
          version: fc.string({ minLength: 1, maxLength: 32 }),
          names: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
            { minLength: 4, maxLength: 12 },
          ),
          lang: fc.constantFrom('en', 'de') as fc.Arbitrary<'en' | 'de'>,
          difficulty: fc.constantFrom('easy', 'medium') as fc.Arbitrary<
            'easy' | 'medium'
          >,
          hintsEnabled: fc.boolean(),
          seed: fc.integer({ min: 0, max: 0xffffffff }),
        }),
        (s) => {
          const out = decodeState(encodeState(s));
          expect(out).toEqual(s);
        },
      ),
      { numRuns: 500 },
    );
  });
});
