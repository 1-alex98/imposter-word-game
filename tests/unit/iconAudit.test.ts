import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.vue')) out.push(p);
  }
  return out;
}

function stripNonTemplate(src: string): string {
  return src
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
}

// Extract every Vuetify-ish element tag (v-btn, v-list-item, v-select, v-text-field,
// v-switch, etc.) as the raw substring between `<v-foo` and the matching `>` /`/>`.
// We don't try to parse nested templates — only the tag's attribute block.
function extractTags(template: string): string[] {
  const out: string[] = [];
  const re = /<(v-[a-z-]+)([^>]*?)(\/?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    out.push(m[0]);
  }
  return out;
}

function attr(tag: string, name: string): string | null {
  // Match `name="..."`, `:name="..."`, `:name='...'`
  const re = new RegExp(`\\s:?${name}=("([^"]*)"|'([^']*)')`, 'i');
  const m = tag.match(re);
  return m ? (m[2] ?? m[3] ?? '') : null;
}

const ICON_ATTRS = ['icon', 'prepend-icon', 'append-icon', 'prepend-inner-icon'] as const;

function anyIcon(tag: string): string | null {
  for (const a of ICON_ATTRS) {
    const v = attr(tag, a);
    if (v) return v;
  }
  return null;
}

/**
 * Required actions per PLAN.md 4.2 AC.
 * Each maps to a stable `data-test` selector in the templates. Items deferred to
 * later stories (info → 4.5, back → none planned) are NOT in this list — they'll
 * be added when those stories land.
 *
 * `action` is the *logical* action key — two entries with the same `action`
 * are allowed to share an icon (e.g. show-role / show-role-again).
 */
const REQUIRED_ACTIONS: ReadonlyArray<{
  dataTest: string;
  action: string;
  icon: string;
}> = [
  { dataTest: 'copy-link', action: 'copy', icon: 'mdi-content-copy' },
  { dataTest: 'share-link', action: 'share', icon: 'mdi-share-variant' },
  { dataTest: 'show-qr', action: 'qr', icon: 'mdi-qrcode' },
  { dataTest: 'show-role', action: 'show-role', icon: 'mdi-eye' },
  { dataTest: 'show-role-again', action: 'show-role', icon: 'mdi-eye' },
  { dataTest: 'hide-role', action: 'hide-role', icon: 'mdi-eye-off' },
  { dataTest: 'reveal-imposter', action: 'reveal-imposter', icon: 'mdi-account-search' },
  { dataTest: 'next-round', action: 'next-round', icon: 'mdi-arrow-right' },
  { dataTest: 'next-round-play', action: 'next-round', icon: 'mdi-arrow-right' },
  { dataTest: 'new-game', action: 'new-game', icon: 'mdi-restart' },
  { dataTest: 'lang-select', action: 'language', icon: 'mdi-translate' },
  { dataTest: 'difficulty-select', action: 'difficulty', icon: 'mdi-speedometer' },
  { dataTest: 'hints-switch', action: 'hints', icon: 'mdi-lightbulb-on-outline' },
  { dataTest: 'change-name', action: 'change-name', icon: 'mdi-account-edit' },
  { dataTest: 'overflow-menu', action: 'overflow', icon: 'mdi-dots-vertical' },
  { dataTest: 'pick-overflow-menu', action: 'overflow', icon: 'mdi-dots-vertical' },
  { dataTest: 'pick-new-game', action: 'new-game', icon: 'mdi-restart' },
  { dataTest: 'add-player', action: 'add-player', icon: 'mdi-plus' },
  { dataTest: 'generate', action: 'generate', icon: 'mdi-link-variant' },
  { dataTest: 'impressum-back', action: 'back', icon: 'mdi-arrow-left' },
  { dataTest: 'datenschutz-back', action: 'back', icon: 'mdi-arrow-left' },
  { dataTest: 'version-refresh', action: 'refresh', icon: 'mdi-refresh' },
  { dataTest: 'qr-dialog-close', action: 'close-dialog', icon: 'mdi-close' },
  { dataTest: 'help-dialog-close', action: 'close-dialog', icon: 'mdi-close' },
  { dataTest: 'help-button', action: 'help', icon: 'mdi-help-circle-outline' },
];

function loadAllTagsByDataTest(): Map<string, { tag: string; file: string }> {
  const map = new Map<string, { tag: string; file: string }>();
  for (const file of walk(SRC)) {
    const body = stripNonTemplate(readFileSync(file, 'utf8'));
    for (const tag of extractTags(body)) {
      const dt = attr(tag, 'data-test');
      if (!dt) continue;
      // Skip dynamic data-tests we don't care about for the audit.
      if (dt.includes('${') || dt.includes('`')) continue;
      map.set(dt, { tag, file });
    }
  }
  return map;
}

describe('story 4.2 — icon audit', () => {
  const tags = loadAllTagsByDataTest();

  it('every required action has its expected icon', () => {
    const failures: string[] = [];
    for (const req of REQUIRED_ACTIONS) {
      const hit = tags.get(req.dataTest);
      if (!hit) {
        failures.push(`missing data-test="${req.dataTest}" — required for action "${req.action}"`);
        continue;
      }
      const icon = anyIcon(hit.tag);
      if (icon !== req.icon) {
        failures.push(
          `data-test="${req.dataTest}" expected icon "${req.icon}", got "${icon ?? 'none'}"`,
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('every required action has an accessible name (aria-label or slot text)', () => {
    const failures: string[] = [];
    for (const req of REQUIRED_ACTIONS) {
      const hit = tags.get(req.dataTest);
      if (!hit) continue; // covered by the icon test above
      const aria = attr(hit.tag, 'aria-label');
      const label = attr(hit.tag, 'label');
      // For self-closing icon-only buttons, slot text is impossible — they must have aria-label.
      const isSelfClosing = hit.tag.trimEnd().endsWith('/>');
      // For non-self-closing tags, locate matching closing tag's slot text in file body.
      let slotText = '';
      if (!isSelfClosing) {
        const body = stripNonTemplate(readFileSync(hit.file, 'utf8'));
        const tagName = (hit.tag.match(/^<(v-[a-z-]+)/i) ?? [])[1];
        if (tagName) {
          // crude: find this exact opening tag then capture until its closing tag
          const openIdx = body.indexOf(hit.tag);
          if (openIdx >= 0) {
            const rest = body.slice(openIdx + hit.tag.length);
            const closeIdx = rest.indexOf(`</${tagName}>`);
            if (closeIdx >= 0) slotText = rest.slice(0, closeIdx);
          }
        }
      }
      const hasText = /\{\{[^}]+\}\}|[A-Za-zÄÖÜäöüß]/.test(slotText);
      if (!aria && !label && !hasText) {
        failures.push(`data-test="${req.dataTest}" has no aria-label, label, or slot text`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('icon-only v-btn elements have aria-label', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const body = stripNonTemplate(readFileSync(file, 'utf8'));
      for (const tag of extractTags(body)) {
        if (!/^<v-btn[\s>]/i.test(tag)) continue;
        const iconAttr = attr(tag, 'icon');
        if (!iconAttr) continue; // not an icon-only btn (uses prepend-icon + text)
        const aria = attr(tag, 'aria-label');
        if (!aria) {
          offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }
    expect(offenders, `Icon-only v-btn without aria-label:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no MDI icon is reused across different logical actions', () => {
    // Allowed sharing: REQUIRED_ACTIONS entries with the same `action` value.
    const actionByIcon = new Map<string, Set<string>>();
    for (const req of REQUIRED_ACTIONS) {
      if (!actionByIcon.has(req.icon)) actionByIcon.set(req.icon, new Set());
      actionByIcon.get(req.icon)!.add(req.action);
    }
    const violators: string[] = [];
    for (const [icon, actions] of actionByIcon) {
      if (actions.size > 1) {
        violators.push(`${icon} used by actions: ${[...actions].join(', ')}`);
      }
    }
    expect(violators, violators.join('\n')).toEqual([]);

    // Also scan templates for ad-hoc icon use outside the table — every icon
    // string that appears on an element with a data-test should be in the table.
    const offenders: string[] = [];
    const known = new Set(REQUIRED_ACTIONS.map((r) => r.dataTest));
    const knownDynamicPrefixes = ['name-row-', 'name-input-', 'name-remove-', 'pick-name-'];
    for (const [dt, { tag }] of tags) {
      if (known.has(dt)) continue;
      if (knownDynamicPrefixes.some((p) => dt.startsWith(p))) continue;
      const icon = anyIcon(tag);
      if (!icon) continue;
      offenders.push(`unaudited icon "${icon}" on data-test="${dt}"`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
