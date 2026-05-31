import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('../../src/content/loadWords', async () => {
  const { seedWords } = await import('../../src/content/seedWords');
  return { loadWords: (lang: 'en' | 'de') => Promise.resolve(seedWords[lang]) };
});
import { createRouter, createMemoryHistory } from 'vue-router';
import fc from 'fast-check';
import PlayerView from '../../src/views/PlayerView.vue';
import { encodeState } from '../../src/core/state';
import { useGameSession } from '../../src/composables/useGameSession';
import { imposterIndex, roleFor } from '../../src/core/roles';
import { filterByDifficulty } from '../../src/core/words';
import { seedWords } from '../../src/content/seedWords';

const NAMES = ['Anna', 'Björn', 'Carl', 'Dora', 'Eve'];

function setLocationSearch(query: string): void {
  const url = new URL(window.location.href);
  url.search = query;
  window.history.replaceState({}, '', url.toString());
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory('/play'),
    routes: [
      { path: '/', name: 'host', component: { template: '<div>host</div>' } },
      { path: '/play', name: 'play', component: PlayerView },
    ],
  });
}

interface MountArgs {
  seed: number;
  hintsEnabled: boolean;
  difficulty?: 'easy' | 'medium';
  lang?: 'en' | 'de';
}

async function mountAs(args: MountArgs) {
  const payload = encodeState({
    version: 'test-version',
    names: NAMES,
    lang: args.lang ?? 'en',
    difficulty: args.difficulty ?? 'medium',
    hintsEnabled: args.hintsEnabled,
    seed: args.seed,
  });
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  const router = makeRouter();
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  return wrapper;
}

function imposterNameFor(seed: number, round: number, _difficulty: 'easy' | 'medium') {
  return NAMES[imposterIndex(seed, round, NAMES.length)];
}

describe('Imposter hint (story 2.5)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('imposter sees hint when hints enabled', async () => {
    const seed = 1234;
    const impName = imposterNameFor(seed, 1, 'medium');
    const wrapper = await mountAs({ seed, hintsEnabled: true });
    await wrapper.find(`[data-test="pick-name-${NAMES.indexOf(impName)}"]`).trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="role-imposter"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="imposter-hint"]').exists()).toBe(true);
  });

  it('imposter does not see hint when hints disabled', async () => {
    const seed = 1234;
    const impName = imposterNameFor(seed, 1, 'medium');
    const wrapper = await mountAs({ seed, hintsEnabled: false });
    await wrapper.find(`[data-test="pick-name-${NAMES.indexOf(impName)}"]`).trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="role-imposter"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="imposter-hint"]').exists()).toBe(false);
  });

  it('innocents never see the imposter hint when hints enabled', async () => {
    const seed = 1234;
    const impName = imposterNameFor(seed, 1, 'medium');
    const innocentIdx = NAMES.findIndex((n) => n !== impName);
    const wrapper = await mountAs({ seed, hintsEnabled: true });
    await wrapper.find(`[data-test="pick-name-${innocentIdx}"]`).trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="role-innocent"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="imposter-hint"]').exists()).toBe(false);
  });

  it('innocents never see the imposter hint when hints disabled', async () => {
    const seed = 1234;
    const impName = imposterNameFor(seed, 1, 'medium');
    const innocentIdx = NAMES.findIndex((n) => n !== impName);
    const wrapper = await mountAs({ seed, hintsEnabled: false });
    await wrapper.find(`[data-test="pick-name-${innocentIdx}"]`).trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="role-innocent"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="imposter-hint"]').exists()).toBe(false);
  });
});

describe('deterministic hint selection', () => {
  it('same (seed, round, difficulty) yields the same hint across many samples', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffffffff }),
        fc.integer({ min: 1, max: 300 }),
        fc.constantFrom('easy', 'medium'),
        fc.integer({ min: 4, max: 12 }),
        (seed, round, difficulty, playerCount) => {
          const words = filterByDifficulty(seedWords.en, difficulty as 'easy' | 'medium');
          if (words.length === 0) return true;
          // Same inputs → same hint, no matter which playerIndex we use.
          // (Hint is shared across the round; only word/role differ per player.)
          const imp = imposterIndex(seed, round, playerCount);
          const a = roleFor({ playerIndex: imp, seed, round, playerCount, words });
          const b = roleFor({ playerIndex: imp, seed, round, playerCount, words });
          expect(a.hint).toBe(b.hint);
          const innocent = imp === 0 ? 1 : 0;
          const c = roleFor({ playerIndex: innocent, seed, round, playerCount, words });
          expect(c.hint).toBe(a.hint);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});
