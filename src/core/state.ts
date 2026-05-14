// URL state codec for game setup.
// Packs into a compact JSON-in-base64url payload kept under 2 KB total.

export type Difficulty = 'easy' | 'medium';

export interface GameState {
  version: string;
  names: string[];
  lang: 'en' | 'de';
  difficulty: Difficulty;
  hintsEnabled: boolean;
  seed: number;
}

export class StateDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateDecodeError';
  }
}

const DIFFICULTIES = new Set<Difficulty>(['easy', 'medium']);
const LANGS = new Set(['en', 'de']);

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa === 'function'
      ? btoa(bin)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  else if (pad === 1) throw new StateDecodeError('Malformed base64url');
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(b: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(b);
}

interface CompactState {
  v: string;
  n: string[];
  l: string;
  d: string;
  h: 0 | 1;
  s: number;
}

function toCompact(state: GameState): CompactState {
  return {
    v: state.version,
    n: state.names,
    l: state.lang,
    d: state.difficulty,
    h: state.hintsEnabled ? 1 : 0,
    s: state.seed >>> 0,
  };
}

export function encodeState(state: GameState): string {
  const compact = toCompact(state);
  const json = JSON.stringify(compact);
  return toBase64Url(utf8Encode(json));
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

export function decodeState(encoded: string): GameState {
  if (typeof encoded !== 'string' || encoded.length === 0) {
    throw new StateDecodeError('Empty payload');
  }
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(encoded);
  } catch (e) {
    throw new StateDecodeError(`Base64 decode failed: ${(e as Error).message}`);
  }
  let json: string;
  try {
    json = utf8Decode(bytes);
  } catch (e) {
    throw new StateDecodeError(`UTF-8 decode failed: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new StateDecodeError(`JSON parse failed: ${(e as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new StateDecodeError('Payload must be an object');
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.v !== 'string' || p.v.length === 0) {
    throw new StateDecodeError('Missing version');
  }
  if (!isStringArray(p.n)) {
    throw new StateDecodeError('Names must be an array of strings');
  }
  if (p.n.length < 4 || p.n.length > 12) {
    throw new StateDecodeError('Names must contain 4–12 entries');
  }
  if (typeof p.l !== 'string' || !LANGS.has(p.l)) {
    throw new StateDecodeError('Invalid language');
  }
  if (typeof p.d !== 'string' || !DIFFICULTIES.has(p.d as Difficulty)) {
    throw new StateDecodeError('Invalid difficulty');
  }
  if (p.h !== 0 && p.h !== 1) {
    throw new StateDecodeError('Invalid hints flag');
  }
  if (typeof p.s !== 'number' || !Number.isInteger(p.s) || p.s < 0 || p.s > 0xffffffff) {
    throw new StateDecodeError('Invalid seed');
  }
  return {
    version: p.v,
    names: p.n,
    lang: p.l as 'en' | 'de',
    difficulty: p.d as Difficulty,
    hintsEnabled: p.h === 1,
    seed: p.s,
  };
}

export function generateSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return (Math.floor(Math.random() * 0x100000000) >>> 0) >>> 0;
}
