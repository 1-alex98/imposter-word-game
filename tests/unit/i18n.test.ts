import { describe, it, expect } from 'vitest';
import { resolveDefaultLocale } from '../../src/i18n';

describe('resolveDefaultLocale', () => {
  it.each([
    ['de', 'de'],
    ['de-DE', 'de'],
    ['de-AT', 'de'],
    ['en', 'en'],
    ['en-US', 'en'],
    ['fr', 'en'],
    [undefined, 'en'],
  ])('maps %s -> %s', (input, expected) => {
    expect(resolveDefaultLocale(input as string | undefined)).toBe(expected);
  });
});
