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

const NAMES = ['Anna', 'Björn', 'Carl', 'Dora'];

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

async function mountAtRound(round: number) {
  const seed = 9001;
  const payload = encodeState({
    version: 'test-version',
    names: NAMES,
    lang: 'en',
    difficulty: 'medium',
    hintsEnabled: true,
    seed,
  });
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  if (round > 1) {
    useGameSession().setRound(round);
  }
  const router = makeRouter();
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  await wrapper.find('[data-test="pick-name-0"]').trigger('click');
  return wrapper;
}

describe('mid-game QR share (story 2.6)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('show-qr action is visible during round 1', async () => {
    const wrapper = await mountAtRound(1);
    expect(wrapper.find('[data-test="show-qr"]').exists()).toBe(true);
  });

  it('show-qr action is absent from round 2 onward', async () => {
    const wrapper2 = await mountAtRound(2);
    expect(wrapper2.find('[data-test="show-qr"]').exists()).toBe(false);
  });

  it('show-qr action is absent from round 3', async () => {
    const wrapper3 = await mountAtRound(3);
    expect(wrapper3.find('[data-test="show-qr"]').exists()).toBe(false);
  });
});
