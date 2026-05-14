import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RoundTransition from '../../src/components/RoundTransition.vue';

// PLAN 4.4 — overlay shows for ~1s (we use ~3s after the user request) then emits `done`.
// `prefers-reduced-motion: reduce` shortens the duration substantially.

function setReducedMotion(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('reduce') ? reduced : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('RoundTransition (story 4.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    setReducedMotion(false);
  });

  it('emits done after the full duration when motion is not reduced', async () => {
    setReducedMotion(false);
    const wrapper = mount(RoundTransition, { props: { round: 2, show: false } });
    await flushPromises();
    await wrapper.setProps({ show: true });
    expect(wrapper.find('[data-test="round-transition"]').exists()).toBe(true);

    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(wrapper.emitted('done')).toBeFalsy();

    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper.emitted('done')).toHaveLength(1);
  });

  it('uses the reduced duration when prefers-reduced-motion is set', async () => {
    setReducedMotion(true);
    const wrapper = mount(RoundTransition, { props: { round: 2, show: false } });
    await flushPromises();
    await wrapper.setProps({ show: true });

    // 300ms is enough for the reduced duration (250ms), too short for the full one (3100ms).
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(wrapper.emitted('done')).toHaveLength(1);
    expect(wrapper.find('[data-test="round-transition"]').attributes('data-test-reduced-motion'))
      .toBe('1');
  });

  it('renders the localized round label', async () => {
    setReducedMotion(false);
    const wrapper = mount(RoundTransition, { props: { round: 3, show: true } });
    await flushPromises();
    expect(wrapper.find('[data-test="round-transition"]').text()).toContain('3');
  });
});
