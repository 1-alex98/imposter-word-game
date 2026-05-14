import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RoundBadge from '../../src/components/RoundBadge.vue';

describe('RoundBadge', () => {
  it('renders the round number', () => {
    const wrapper = mount(RoundBadge, { props: { round: 3 } });
    expect(wrapper.text()).toContain('Round 3');
  });

  it('reacts to round prop changes', async () => {
    const wrapper = mount(RoundBadge, { props: { round: 1 } });
    expect(wrapper.text()).toContain('Round 1');
    await wrapper.setProps({ round: 7 });
    expect(wrapper.text()).toContain('Round 7');
  });
});
