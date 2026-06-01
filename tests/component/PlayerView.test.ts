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

function makeRouter(initialPath: string) {
  return createRouter({
    history: createMemoryHistory(initialPath),
    routes: [
      { path: '/', name: 'host', component: { template: '<div>host</div>' } },
      { path: '/play', name: 'play', component: PlayerView },
    ],
  });
}

function setLocationSearch(query: string): void {
  const url = new URL(window.location.href);
  url.search = query;
  window.history.replaceState({}, '', url.toString());
}

const TEST_NAMES = ['Anna', 'Björn', 'Carl', 'Dora', 'Eve'];

function urlPayload(seed = 12345) {
  return encodeState({
    version: 'test-version',
    names: TEST_NAMES,
    lang: 'en',
    difficulty: 'medium',
    hintsEnabled: true,
    seed,
  });
}

async function mountWithPayload(payload: string) {
  setLocationSearch(`?g=${payload}`);
  useGameSession().reload();
  const router = makeRouter('/play');
  const wrapper = mount(PlayerView, { global: { plugins: [router] } });
  await router.isReady();
  await flushPromises();
  return wrapper;
}

// reveal-imposter is gated behind a "are you sure?" dialog when the round is
// less than 60s old. Most tests don't care about the gate — fast-forward past it.
async function skipRevealGate() {
  vi.setSystemTime(Date.now() + 61_000);
  await flushPromises();
}

describe('PlayerView', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    useGameSession().reload();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the host names for selection', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    for (let i = 0; i < TEST_NAMES.length; i++) {
      expect(wrapper.find(`[data-test="pick-name-${i}"]`).text()).toBe(TEST_NAMES[i]);
    }
  });

  it('tapping a name stores it and shows pre-reveal stage', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
    // sessionStorage key (per seed)
    expect(window.sessionStorage.getItem('imposter:name:12345')).toBe('Anna');
  });

  it('show -> auto-hide after 8 seconds returns to play stage', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(true);

    vi.advanceTimersByTime(4000);
    await flushPromises();
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(true);

    vi.advanceTimersByTime(4000);
    await flushPromises();
    expect(wrapper.find('[data-test="stage-reveal"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="stage-play"]').exists()).toBe(true);
  });

  it('manual hide returns to play immediately', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    expect(wrapper.find('[data-test="stage-play"]').exists()).toBe(true);
  });

  it('reveal-imposter is gated until role has been viewed', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    // play stage cannot be reached before show; jump there via hide
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    expect(wrapper.find('[data-test="reveal-imposter"]').exists()).toBe(true);
  });

  it('tap reveal -> shows the imposter name', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapper.find('[data-test="reveal-imposter"]').trigger('click');
    const text = wrapper.find('[data-test="imposter-name"]').text();
    expect(TEST_NAMES.some((n) => text.includes(n))).toBe(true);
  });

  it('reveal within 60s of round start opens a confirmation dialog', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await wrapper.find('[data-test="reveal-imposter"]').trigger('click');
    await flushPromises();
    // v-dialog teleports to document.body, so query there.
    expect(document.body.querySelector('[data-test="reveal-confirm-dialog"]')).not.toBeNull();
    expect(wrapper.find('[data-test="stage-imposter"]').exists()).toBe(false);

    // Confirm proceeds.
    const yes = document.body.querySelector<HTMLElement>('[data-test="reveal-confirm-yes"]');
    yes?.click();
    await flushPromises();
    expect(wrapper.find('[data-test="stage-imposter"]').exists()).toBe(true);
  });

  it('reveal after 60s skips the confirmation dialog', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapper.find('[data-test="reveal-imposter"]').trigger('click');
    await flushPromises();
    expect(document.body.querySelector('[data-test="reveal-confirm-dialog"]')).toBeNull();
    expect(wrapper.find('[data-test="stage-imposter"]').exists()).toBe(true);
  });

  it('next round increments and re-enters pre-reveal', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapper.find('[data-test="reveal-imposter"]').trigger('click');
    await wrapper.find('[data-test="next-round"]').trigger('click');
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
    // round is persisted in the URL (survives a phone-lock tab eviction), not sessionStorage
    expect(new URLSearchParams(window.location.search).get('r')).toBe('2');
    expect(window.sessionStorage.getItem('imposter:round:12345')).toBeNull();
  });

  it('skip-to-next-round within 60s of round start opens a confirmation dialog', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await wrapper.find('[data-test="next-round-play"]').trigger('click');
    await flushPromises();
    // v-dialog teleports to document.body, so query there.
    expect(document.body.querySelector('[data-test="next-round-confirm-dialog"]')).not.toBeNull();
    // Still on the play stage — the round didn't advance yet.
    expect(new URLSearchParams(window.location.search).get('r')).not.toBe('2');

    // Confirm proceeds to the next round.
    const yes = document.body.querySelector<HTMLElement>('[data-test="next-round-confirm-yes"]');
    yes?.click();
    await flushPromises();
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
    expect(new URLSearchParams(window.location.search).get('r')).toBe('2');
  });

  it('skip-to-next-round after 60s skips the confirmation dialog', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapper.find('[data-test="next-round-play"]').trigger('click');
    await flushPromises();
    expect(document.body.querySelector('[data-test="next-round-confirm-dialog"]')).toBeNull();
    expect(wrapper.find('[data-test="stage-pre-reveal"]').exists()).toBe(true);
    expect(new URLSearchParams(window.location.search).get('r')).toBe('2');
  });

  it('restores the round from the URL on reload (phone-lock recovery)', async () => {
    // Simulate reopening a tab whose URL already advanced to round 3, with
    // empty sessionStorage (as after the OS evicts a backgrounded tab).
    const payload = urlPayload();
    setLocationSearch(`?g=${payload}&r=3`);
    window.sessionStorage.clear();
    const session = useGameSession();
    session.reload();
    await flushPromises();
    expect(session.round.value).toBe(3);
  });

  it('two simulated devices agree on the imposter at round 2', async () => {
    const payload = urlPayload(42);
    const wrapperA = await mountWithPayload(payload);
    await wrapperA.find('[data-test="pick-name-0"]').trigger('click');
    await wrapperA.find('[data-test="show-role"]').trigger('click');
    await wrapperA.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapperA.find('[data-test="reveal-imposter"]').trigger('click');
    await wrapperA.find('[data-test="next-round"]').trigger('click');
    await wrapperA.find('[data-test="show-role"]').trigger('click');
    await wrapperA.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapperA.find('[data-test="reveal-imposter"]').trigger('click');
    const nameA = wrapperA.find('[data-test="imposter-name"]').text();

    // Simulated "device B": fresh storage, pick a different player.
    window.sessionStorage.clear();
    useGameSession().reload();
    const wrapperB = await mountWithPayload(payload);
    await wrapperB.find('[data-test="pick-name-1"]').trigger('click');
    // advance to round 2 explicitly
    useGameSession().setRound(2);
    await flushPromises();
    await wrapperB.find('[data-test="show-role"]').trigger('click');
    await wrapperB.find('[data-test="hide-role"]').trigger('click');
    await skipRevealGate();
    await wrapperB.find('[data-test="reveal-imposter"]').trigger('click');
    const nameB = wrapperB.find('[data-test="imposter-name"]').text();

    expect(nameA).toBe(nameB);
  });

  it('change my name clears storage and returns to picker', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="change-name"]').trigger('click');
    expect(wrapper.find('[data-test="pick-name-0"]').exists()).toBe(true);
    expect(window.sessionStorage.getItem('imposter:name:12345')).toBeNull();
  });

  it('hides change-name once the first word has been viewed', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    // Available before the first reveal...
    expect(wrapper.find('[data-test="change-name"]').exists()).toBe(true);
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');
    // ...and gone for good once the word has been seen.
    expect(wrapper.find('[data-test="change-name"]').exists()).toBe(false);
  });

  it('emphasizes "show word again" while the round is fresh, then the action buttons', async () => {
    const wrapper = await mountWithPayload(urlPayload());
    await wrapper.find('[data-test="pick-name-0"]').trigger('click');
    await wrapper.find('[data-test="show-role"]').trigger('click');
    await wrapper.find('[data-test="hide-role"]').trigger('click');

    // Fresh window: "show word again" is large, the action buttons are small.
    expect(wrapper.find('[data-test="show-role-again"]').classes()).toContain('v-btn--size-x-large');
    expect(wrapper.find('[data-test="reveal-imposter"]').classes()).toContain('v-btn--size-small');
    expect(wrapper.find('[data-test="next-round-play"]').classes()).toContain('v-btn--size-small');

    // After the fresh window elapses (60s) the emphasis flips.
    vi.advanceTimersByTime(61_000);
    await flushPromises();
    expect(wrapper.find('[data-test="show-role-again"]').classes()).toContain('v-btn--size-small');
    expect(wrapper.find('[data-test="reveal-imposter"]').classes()).toContain('v-btn--size-large');
    expect(wrapper.find('[data-test="next-round-play"]').classes()).toContain('v-btn--size-large');
  });
});
