import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import HelpButton from '../../src/components/HelpButton.vue';

// PLAN 4.5 — `?` icon opens a localized how-to-play dialog dismissable via the close
// button, the backdrop, and the Escape key. We exercise the close-button path here;
// backdrop + Escape are wired by Vuetify and asserted at the E2E level.

describe('HelpButton (story 4.5)', () => {
  it('renders an always-available help icon', () => {
    const wrapper = mount(HelpButton);
    expect(wrapper.find('[data-test="help-button"]').exists()).toBe(true);
  });

  it('opens the dialog when the help icon is tapped', async () => {
    const wrapper = mount(HelpButton, { attachTo: document.body });
    await wrapper.find('[data-test="help-button"]').trigger('click');
    await flushPromises();
    const dialog = document.body.querySelector('[data-test="help-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toMatch(/how to play/i);
    wrapper.unmount();
  });

  it('close button dismisses the dialog', async () => {
    const wrapper = mount(HelpButton, { attachTo: document.body });
    await wrapper.find('[data-test="help-button"]').trigger('click');
    await flushPromises();
    const close = document.body.querySelector<HTMLElement>('[data-test="help-dialog-close"]');
    expect(close).not.toBeNull();
    close!.click();
    await flushPromises();
    expect(document.body.querySelector('[data-test="help-dialog"]')).toBeNull();
    wrapper.unmount();
  });
});
