import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// PLAN 5.1 / 5.2 — `vite.config.ts` is the single source of truth for the PWA config.
// We can't load it as a module (it imports vite plugins that don't run under vitest),
// so we grep its text for the structural invariants the spec requires.

const VITE_CONFIG = readFileSync(join(__dirname, '../../vite.config.ts'), 'utf8');

describe('PWA / manifest config (stories 5.1 + 5.2)', () => {
  it("registerType is 'autoUpdate'", () => {
    expect(VITE_CONFIG).toMatch(/registerType:\s*'autoUpdate'/);
  });

  it('skipWaiting and clientsClaim are enabled in workbox', () => {
    expect(VITE_CONFIG).toMatch(/skipWaiting:\s*true/);
    expect(VITE_CONFIG).toMatch(/clientsClaim:\s*true/);
  });

  it('NetworkFirst is configured for the app shell (no CacheFirst on HTML/JS/CSS)', () => {
    expect(VITE_CONFIG).toMatch(/handler:\s*'NetworkFirst'/);
    expect(VITE_CONFIG).toMatch(/cacheName:\s*'app-shell'/);
  });

  it('Word-list cache key includes the build-time version', () => {
    expect(VITE_CONFIG).toMatch(/cacheName:\s*`words-\$\{VERSION\}`/);
  });

  it('Manifest lists the required PWA icons (192, 512, 512-maskable)', () => {
    expect(VITE_CONFIG).toMatch(/src:\s*'pwa-192\.png'[\s\S]*?sizes:\s*'192x192'/);
    expect(VITE_CONFIG).toMatch(/src:\s*'pwa-512\.png'[\s\S]*?sizes:\s*'512x512'/);
    expect(VITE_CONFIG).toMatch(
      /src:\s*'pwa-maskable-512\.png'[\s\S]*?purpose:\s*'maskable'/,
    );
  });

  it('Manifest declares required fields (name, short_name, theme + background colors, display, start_url)', () => {
    expect(VITE_CONFIG).toMatch(/name:\s*'Imposter Game'/);
    expect(VITE_CONFIG).toMatch(/short_name:\s*'Imposter'/);
    expect(VITE_CONFIG).toMatch(/theme_color:\s*'#1976d2'/);
    expect(VITE_CONFIG).toMatch(/background_color:\s*'#ffffff'/);
    expect(VITE_CONFIG).toMatch(/display:\s*'standalone'/);
    expect(VITE_CONFIG).toMatch(/start_url:\s*'\/'/);
  });
});

describe('build outputs', () => {
  it('robots.txt is present in public/ and allows indexing', () => {
    // The site is intentionally crawlable (basic SEO) — robots.txt must NOT block everything.
    const robots = readFileSync(join(__dirname, '../../public/robots.txt'), 'utf8');
    expect(robots).toMatch(/User-agent:\s*\*/);
    expect(robots).toMatch(/Allow:\s*\//);
    expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  it('PWA icons are present in public/', () => {
    const files = ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'];
    for (const f of files) {
      const buf = readFileSync(join(__dirname, '../../public/', f));
      expect(buf.byteLength, `${f} should be a non-empty file`).toBeGreaterThan(0);
    }
  });
});
