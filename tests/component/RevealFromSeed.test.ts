import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('../../src/content/loadWords', async () => {
  const { seedWords } = await import('../../src/content/seedWords');
  return { loadWords: (lang: 'en' | 'de') => Promise.resolve(seedWords[lang]) };
});
import { createRouter, createMemoryHistory } from 'vue-router';
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

async function mountWith(seed: number, lang: 'en' | 'de', difficulty: 'easy' | 'medium') {
  const payload = encodeState({
    version: 'test-version',
    names: NAMES,
    lang,
    difficulty,
    hintsEnabled: false,
    seed,
  });
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  const router = makeRouter();
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  return wrapper;
}

describe('Reveal screen pulls word + hint from the seed list (story 3.1)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  for (const lang of ['en', 'de'] as const) {
    for (const tier of ['easy', 'medium'] as const) {
      it(`innocent sees a ${tier} word from the ${lang} seed list`, async () => {
        const seed = 7777;
        const pool = filterByDifficulty(seedWords[lang], tier);
        const impIdx = imposterIndex(seed, 1, NAMES.length);
        const innocentIdx = impIdx === 0 ? 1 : 0;
        const expected = roleFor({
          playerIndex: innocentIdx,
          seed,
          round: 1,
          playerCount: NAMES.length,
          words: pool,
        });
        if (expected.isImposter) throw new Error('expected innocent');
        // sanity: the word the role returns actually lives in the seed list
        expect(pool.some((w) => w.word === expected.word)).toBe(true);

        const wrapper = await mountWith(seed, lang, tier);
        await wrapper.find(`[data-test="pick-name-${innocentIdx}"]`).trigger('click');
        await wrapper.find('[data-test="show-role"]').trigger('click');
        const text = wrapper.find('[data-test="role-innocent"]').text();
        expect(text).toContain(expected.word);
      });
    }
  }
});
