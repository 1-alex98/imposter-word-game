// Deterministic seeded RNG. Integer-only math, no platform-RNG calls, no floats.
// Uses mulberry32 with a 32-bit unsigned state derived from (seed, round).

const MASK_32 = 0xffffffff;

function mix32(a: number, b: number): number {
  // 32-bit integer mix; both inputs forced to uint32 first.
  let x = (a >>> 0) ^ ((b >>> 0) + 0x9e3779b9);
  x = ((x + ((x << 6) >>> 0)) ^ ((x >>> 2) & MASK_32)) >>> 0;
  return x;
}

function seedFor(seed: number, round: number): number {
  return mix32(seed >>> 0, round >>> 0);
}

export interface Rng {
  nextU32(): number;
  pickIndex(arrayLen: number): number;
  pickWithoutReplacement<T>(arr: readonly T[], n: number): T[];
}

export function rngFor(seed: number, round: number): Rng {
  let state = seedFor(seed, round);
  // Avoid the degenerate 0 state for mulberry32 (still deterministic but bland).
  if (state === 0) state = 0x9e3779b9;

  function nextU32(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0))) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  }

  function pickIndex(arrayLen: number): number {
    if (!Number.isInteger(arrayLen) || arrayLen <= 0) {
      throw new Error('arrayLen must be a positive integer');
    }
    // Rejection sampling to avoid modulo bias.
    const range = arrayLen >>> 0;
    const limit = Math.floor(0x100000000 / range) * range;
    let v: number;
    do {
      v = nextU32();
    } while (v >= limit);
    return v % range;
  }

  function pickWithoutReplacement<T>(arr: readonly T[], n: number): T[] {
    if (!Number.isInteger(n) || n < 0) throw new Error('n must be a non-negative integer');
    if (n > arr.length) throw new Error('n cannot exceed arr.length');
    const pool = arr.slice();
    const out: T[] = [];
    for (let i = 0; i < n; i++) {
      const idx = pickIndex(pool.length);
      out.push(pool[idx]);
      pool[idx] = pool[pool.length - 1];
      pool.pop();
    }
    return out;
  }

  return { nextU32, pickIndex, pickWithoutReplacement };
}
