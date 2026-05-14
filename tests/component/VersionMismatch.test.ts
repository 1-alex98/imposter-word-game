import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// pwa.ts imports the vite-plugin-pwa virtual module which doesn't exist in vitest.
// Mock the side-effects so VersionMismatch (which uses pwa.ts's skipWaitingAndReload)
// can be mounted in unit tests.
vi.mock('../../src/pwa', () => ({
  updateApp: vi.fn(),
  skipWaitingAndReload: vi.fn(),
}));

import VersionMismatch from '../../src/components/VersionMismatch.vue';

describe('VersionMismatch', () => {
  it('renders the localized blocking screen', () => {
    const wrapper = mount(VersionMismatch);
    expect(wrapper.find('[data-test="version-mismatch"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('different app version');
  });
});
