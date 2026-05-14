import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import VersionMismatch from '../../src/components/VersionMismatch.vue';

describe('VersionMismatch', () => {
  it('renders the localized blocking screen', () => {
    const wrapper = mount(VersionMismatch);
    expect(wrapper.find('[data-test="version-mismatch"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('different app version');
  });
});
