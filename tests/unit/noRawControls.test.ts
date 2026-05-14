import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../../src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.vue')) out.push(p);
  }
  return out;
}

// Story 4.1: production screens must use Vuetify, not raw HTML controls.
// Strip <script> and <style> blocks so JS strings and CSS selectors can't trip the check.
function stripNonTemplate(src: string): string {
  return src
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
}

const RAW_TAGS = ['button', 'input', 'select'] as const;

describe('story 4.1 — no raw HTML controls in src/', () => {
  const files = walk(SRC);

  for (const tag of RAW_TAGS) {
    it(`no <${tag}> elements appear in any .vue template under src/`, () => {
      const offenders: string[] = [];
      // Match opening tag only: <button, <input ...>, <select foo="bar">.
      // Does not match <v-button or any tag whose name starts with another char.
      const re = new RegExp(`<${tag}(\\s|>|/)`, 'i');
      for (const f of files) {
        const body = stripNonTemplate(readFileSync(f, 'utf8'));
        if (re.test(body)) offenders.push(relative(SRC, f));
      }
      expect(offenders, `Raw <${tag}> found in: ${offenders.join(', ')}`).toEqual([]);
    });
  }
});
