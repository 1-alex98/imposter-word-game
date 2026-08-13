import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import RoundBadge from '../../src/components/RoundBadge.vue';

type Wrapper = ReturnType<typeof mount>;

let active: Wrapper | null = null;

function mountBadge(round: number): Wrapper {
  active = mount(RoundBadge, { props: { round }, attachTo: document.body });
  return active;
}

// v-dialog teleports to <body>; without an explicit unmount the previous test's
// dialog stays in the DOM and later queries hit the stale one.
afterEach(() => {
  active?.unmount();
  active = null;
  document.body.innerHTML = '';
});

async function openPicker(wrapper: Wrapper) {
  await wrapper.find('[data-test="round-badge"]').trigger('click');
  await new Promise((r) => setTimeout(r, 0));
}

function bodyEl(selector: string): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(selector);
}

describe('RoundBadge', () => {
  it('renders the round number', () => {
    const wrapper = mountBadge(3);
    expect(wrapper.text()).toContain('Round 3');
  });

  it('reacts to round prop changes', async () => {
    const wrapper = mountBadge(1);
    expect(wrapper.text()).toContain('Round 1');
    await wrapper.setProps({ round: 7 });
    expect(wrapper.text()).toContain('Round 7');
  });

  it('tapping the badge opens the round picker seeded with the current round', async () => {
    const wrapper = mountBadge(4);
    await openPicker(wrapper);
    expect(bodyEl('[data-test="round-picker-dialog"]')).not.toBeNull();
    expect(bodyEl('[data-test="round-picker-value"]')?.textContent?.trim()).toBe('4');
  });

  it('+ / - step the draft and apply emits the new round', async () => {
    const wrapper = mountBadge(4);
    await openPicker(wrapper);
    bodyEl('[data-test="round-picker-minus"]')?.click();
    bodyEl('[data-test="round-picker-minus"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(bodyEl('[data-test="round-picker-value"]')?.textContent?.trim()).toBe('2');
    bodyEl('[data-test="round-picker-plus"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(bodyEl('[data-test="round-picker-value"]')?.textContent?.trim()).toBe('3');

    bodyEl('[data-test="round-picker-apply"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.emitted('update:round')?.[0]).toEqual([3]);
  });

  it('can jump back into past rounds but never below round 1', async () => {
    const wrapper = mountBadge(2);
    await openPicker(wrapper);
    for (let i = 0; i < 5; i++) bodyEl('[data-test="round-picker-minus"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(bodyEl('[data-test="round-picker-value"]')?.textContent?.trim()).toBe('1');
    bodyEl('[data-test="round-picker-apply"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.emitted('update:round')?.[0]).toEqual([1]);
  });

  it('cancel closes without emitting', async () => {
    const wrapper = mountBadge(4);
    await openPicker(wrapper);
    bodyEl('[data-test="round-picker-plus"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    bodyEl('[data-test="round-picker-cancel"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.emitted('update:round')).toBeUndefined();
  });
});
