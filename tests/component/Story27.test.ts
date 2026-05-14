import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('../../src/content/loadWords', async () => {
  const { seedWords } = await import('../../src/content/seedWords');
  return { loadWords: (lang: 'en' | 'de') => Promise.resolve(seedWords[lang]) };
});
import { createRouter, createMemoryHistory } from 'vue-router';
import HostSetup from '../../src/views/HostSetup.vue';
import PlayerView from '../../src/views/PlayerView.vue';
import { decodeState, encodeState } from '../../src/core/state';
import { useGameSession } from '../../src/composables/useGameSession';

const NAMES = ['Anna', 'Björn', 'Carl', 'Dora'];

function setLocationSearch(query: string): void {
  const url = new URL(window.location.href);
  url.search = query;
  window.history.replaceState({}, '', url.toString());
}

function makeHostRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'host', component: HostSetup },
      { path: '/play', name: 'play', component: { template: '<div>play</div>' } },
    ],
  });
}

function makePlayRouter() {
  return createRouter({
    history: createMemoryHistory('/play'),
    routes: [
      { path: '/', name: 'host', component: { template: '<div>host</div>' } },
      { path: '/play', name: 'play', component: PlayerView },
    ],
  });
}

async function mountPlayer(hintsEnabled = false) {
  const payload = encodeState({
    version: 'test-version',
    names: NAMES,
    lang: 'en',
    difficulty: 'medium',
    hintsEnabled,
    seed: 4242,
  });
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  const router = makePlayRouter();
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  return wrapper;
}

describe('Story 2.7 — hints default off', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('hints switch defaults to off; generated URL has hintsEnabled=false', async () => {
    const router = makeHostRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    await flushPromises();
    for (let i = 0; i < 4; i++) {
      await wrapper.find(`[data-test="name-input-${i}"] input`).setValue(NAMES[i]);
    }
    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.find('[data-test="generate"]').trigger('click');
    const payload = pushSpy.mock.calls[0][0] as { query: { g: string } };
    expect(decodeState(payload.query.g).hintsEnabled).toBe(false);
  });
});

describe('Story 2.7 — auto-hide 8s + re-reveal', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-hide fires at 8s, not earlier', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(true);

    vi.advanceTimersByTime(7999);
    await flushPromises();
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(true);

    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="stage-play"]').exists()).toBe(true);
  });

  it('show-role-again is visible on play stage and re-enters reveal', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    expect(wrapper.find('[data-test="stage-play"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="show-role-again"]').exists()).toBe(true);

    await wrapper.find('[data-test="show-role-again"]').trigger('click');
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(true);
  });

  it('re-revealed role auto-hides after 8s', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await wrapper.find('[data-test="show-role-again"]').trigger('click');
    vi.advanceTimersByTime(8000);
    await flushPromises();
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="stage-play"]').exists()).toBe(true);
  });
});

describe('Story 2.7 — change-name gated on role-not-yet-viewed', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('change-name is visible on pre-reveal (before role has been viewed)', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    expect(wrapper.find('[data-test="change-name"]').exists()).toBe(true);
  });

  it('change-name disappears once the role has been viewed (manual hide)', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    expect(wrapper.find('[data-test="change-name"]').exists()).toBe(false);
  });

  it('change-name disappears after auto-hide as well', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    vi.advanceTimersByTime(8000);
    await flushPromises();
    expect(wrapper.find('[data-test="change-name"]').exists()).toBe(false);
  });
});

describe('Story 2.7 — QR dialog hosts share controls', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opening the round-1 QR dialog shows the copy button and QR', async () => {
    const wrapper = await mountPlayer();
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    expect(wrapper.find('[data-test="show-qr"]').exists()).toBe(true);
    await wrapper.find('[data-test="show-qr"]').trigger('click');
    await flushPromises();
    // The dialog teleports into document.body — query the document directly.
    expect(document.querySelector('[data-test="copy-link"]')).not.toBeNull();
    expect(document.querySelector('[data-test="qr-code"]')).not.toBeNull();
  });
});
