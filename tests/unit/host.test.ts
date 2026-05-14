import { describe, it, expect } from 'vitest';
import { validateNames } from '../../src/core/host';

describe('host name validation', () => {
  it('requires at least 4 names', () => {
    const r = validateNames(['A', 'B', 'C']);
    expect(r.valid).toBe(false);
    expect(r.formError).toBe('minCount');
  });

  it('rejects more than 12 names', () => {
    const r = validateNames(Array.from({ length: 13 }, (_, i) => `P${i}`));
    expect(r.valid).toBe(false);
    expect(r.formError).toBe('maxCount');
  });

  it('flags empty rows', () => {
    const r = validateNames(['A', '', 'C', 'D']);
    expect(r.fieldErrors[1]).toBe('empty');
    expect(r.valid).toBe(false);
  });

  it('flags whitespace-only as empty', () => {
    const r = validateNames(['A', '   ', 'C', 'D']);
    expect(r.fieldErrors[1]).toBe('empty');
  });

  it('detects case-insensitive duplicates and flags both', () => {
    const r = validateNames(['Anna', 'anna', 'Carl', 'Dora']);
    expect(r.fieldErrors[0]).toBe('duplicate');
    expect(r.fieldErrors[1]).toBe('duplicate');
    expect(r.valid).toBe(false);
  });

  it('trims surrounding whitespace before duplicate check', () => {
    const r = validateNames(['  Anna  ', 'Anna', 'Carl', 'Dora']);
    expect(r.fieldErrors[0]).toBe('duplicate');
    expect(r.fieldErrors[1]).toBe('duplicate');
  });

  it('valid when 4 unique non-empty names', () => {
    const r = validateNames(['A', 'B', 'C', 'D']);
    expect(r.valid).toBe(true);
    expect(r.formError).toBeNull();
    expect(r.fieldErrors).toEqual([null, null, null, null]);
  });
});
