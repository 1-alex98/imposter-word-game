import { describe, it, expect } from 'vitest';
import { compareVersions } from '../../src/composables/useVersionGuard';

describe('compareVersions', () => {
  it('matching versions return true', () => {
    expect(compareVersions('abc', 'abc')).toBe(true);
  });

  it('mismatched versions return false', () => {
    expect(compareVersions('abc', 'def')).toBe(false);
  });

  it('absent URL version returns true (host setup case)', () => {
    expect(compareVersions(undefined, 'abc')).toBe(true);
  });
});
