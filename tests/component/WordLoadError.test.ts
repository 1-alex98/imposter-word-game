import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import PlayerView from '../../src/views/PlayerView.vue';
import { encodeState } from '../../src/core/state';
import { useGameSession } from '../../src/composables/useGameSession';

const loadWordsMock = vi.fn();

vi.mock('../../src/content/loadWords', () => ({
  loadWords: (...args: unknown[]) => loadWordsMock(...args),
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory('/play'),
    routes: [
      { path: '/', name: 'host', component: { template: '<div/>' } },
      { path: '/play', name: 'play', component: PlayerView },
    ],
  });
}

function setLocationSearch(query: string): void {
  const url = new URL(window.location.href);
  url.search = query;
  window.history.replaceState({}, '', url.toString());
}

async function mountPlayer() {
  const payload = encodeState({
    version: 'test-version',
    names: ['Anna', 'Björn', 'Carl', 'Dora'],
    lang: 'en',
    difficulty: 'medium',
    hintsEnabled: false,
    seed: 1,
  });
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  const router = makeRouter();
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  return wrapper;
}

describe('word list load error (story 3.4)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
  });

  it('shows a loading indicator while words are fetching', async () => {
    let resolveLoad!: (v: unknown) => void;
    loadWordsMock.mockReturnValue(new Promise((res) => (resolveLoad = res)));
    const payload = encodeState({
      version: 'test-version',
      names: ['Anna', 'Björn', 'Carl', 'Dora'],
      lang: 'en',
      difficulty: 'medium',
      hintsEnabled: false,
      seed: 1,
    });
    setLocationSearch(`?g=${payload}`);
    useGameSession().reload();
    const router = makeRouter();
    const wrapper = mount(PlayerView, { global: { plugins: [router] } });
    await router.isReady();
    // Don't flush — still pending
    expect(wrapper.find('[data-test="word-loading"]').exists()).toBe(true);
    resolveLoad([]);
    await flushPromises();
  });

  it('shows error message and retry button when load fails', async () => {
    loadWordsMock.mockRejectedValue(new Error('network error'));
    const wrapper = await mountPlayer();
    expect(wrapper.find('[data-test="word-load-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="word-load-retry"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="pick-name-0"]').exists()).toBe(false);
  });

  it('retry button re-attempts load and shows game UI on success', async () => {
    const { seedWords } = await import('../../src/content/seedWords');
    loadWordsMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(seedWords.en);
    const wrapper = await mountPlayer();
    expect(wrapper.find('[data-test="word-load-error"]').exists()).toBe(true);

    await wrapper.find('[data-test="word-load-retry"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="word-load-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="pick-name-0"]').exists()).toBe(true);
  });
});
