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

async function mountPlayer() {
  const payload = encodeState({
    version: 'test-version',
    names: NAMES,
    lang: 'en',
    difficulty: 'medium',
    hintsEnabled: false,
    seed: 777,
  });
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  const router = makeRouter();
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  return wrapper;
}

async function reachPlayStage(wrapper: Awaited<ReturnType<typeof mountPlayer>>) {
  await wrapper.find('[data-test="pick-name-0"]').trigger('click');
  await wrapper.find('[data-test="show-role"]').trigger('click');
  await wrapper.find('[data-test="hide-role"]').trigger('click');
}

describe('standalone next-round button', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is available on the play stage without revealing the imposter', async () => {
    const wrapper = await mountPlayer();
    await reachPlayStage(wrapper);
    expect(wrapper.find('[data-test="next-round-play"]').exists()).toBe(true);
  });

  it('warns when tapped within 60s of the round starting', async () => {
    const wrapper = await mountPlayer();
    await reachPlayStage(wrapper);
    await wrapper.find('[data-test="next-round-play"]').trigger('click');
    await flushPromises();
    expect(document.body.querySelector('[data-test="next-round-confirm-dialog"]')).not.toBeNull();
    expect(useGameSession().round.value).toBe(1);

    document.body.querySelector<HTMLElement>('[data-test="next-round-confirm-yes"]')?.click();
    await flushPromises();
    expect(useGameSession().round.value).toBe(2);
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
  });

  it('cancelling the warning keeps the current round', async () => {
    const wrapper = await mountPlayer();
    await reachPlayStage(wrapper);
    await wrapper.find('[data-test="next-round-play"]').trigger('click');
    await flushPromises();
    document.body.querySelector<HTMLElement>('[data-test="next-round-confirm-cancel"]')?.click();
    await flushPromises();
    expect(useGameSession().round.value).toBe(1);
    expect(wrapper.find('[data-test="stage-play"]').exists()).toBe(true);
  });

  it('advances directly once the round is older than 60s', async () => {
    const wrapper = await mountPlayer();
    await reachPlayStage(wrapper);
    vi.setSystemTime(Date.now() + 61_000);
    await wrapper.find('[data-test="next-round-play"]').trigger('click');
    await flushPromises();
    expect(document.body.querySelector('[data-test="next-round-confirm-dialog"]')).toBeNull();
    expect(useGameSession().round.value).toBe(2);
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
  });
});

describe('round jumping via the round picker', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('jumping to a past round resets the flow and plays the transition', async () => {
    const wrapper = await mountPlayer();
    const session = useGameSession();
    await reachPlayStage(wrapper);
    session.setRound(5);
    await flushPromises();
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);

    session.setRound(2);
    await flushPromises();
    expect(session.round.value).toBe(2);
    expect(new URLSearchParams(window.location.search).get('r')).toBe('2');
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
  });

  it('the word for a revisited round is identical to the first visit', async () => {
    const wrapper = await mountPlayer();
    const session = useGameSession();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    const firstVisit = wrapper.find('[data-test="stage-reveal"]').text();

    session.setRound(4);
    await flushPromises();
    session.setRound(1);
    await flushPromises();
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="stage-reveal"]').text()).toBe(firstVisit);
  });
});
