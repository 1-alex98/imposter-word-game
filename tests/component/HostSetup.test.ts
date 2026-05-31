import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import HostSetup from '../../src/views/HostSetup.vue';
import { decodeState } from '../../src/core/state';
import { i18n } from '../../src/i18n';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'host', component: HostSetup },
      { path: '/play', name: 'play', component: { template: '<div>play</div>' } },
      { path: '/impressum', name: 'impressum', component: { template: '<div>impressum</div>' } },
      { path: '/datenschutz', name: 'datenschutz', component: { template: '<div>datenschutz</div>' } },
    ],
  });
}

async function fillFourNames(wrapper: ReturnType<typeof mount>) {
  for (let i = 0; i < 4; i++) {
    await wrapper.find(`[data-test="name-input-${i}"] input`).setValue(`Player${i}`);
  }
}

function findControl(wrapper: ReturnType<typeof mount>, testId: string) {
  return wrapper.findComponent<{ $emit: (event: string, value: unknown) => void }>(
    `[data-test="${testId}"]`,
  );
}

describe('HostSetup', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    i18n.global.locale.value = 'en';
  });

  it('shows no validation errors before the first Generate attempt', async () => {
    const router = makeRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find('[data-test="form-error"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Names must be unique');
    expect(wrapper.text()).not.toContain("can't be empty");
  });

  it('clicking Generate with invalid form surfaces inline errors and does not navigate', async () => {
    const router = makeRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    await wrapper.find('[data-test="name-input-0"] input').setValue('Anna');
    await wrapper.find('[data-test="name-input-1"] input').setValue('anna');
    await wrapper.find('[data-test="name-input-2"] input').setValue('Carl');
    await wrapper.find('[data-test="name-input-3"] input').setValue('Dora');
    await flushPromises();
    // No red yet — even with a duplicate typed in.
    expect(wrapper.text()).not.toContain('Names must be unique');

    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.find('[data-test="generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Names must be unique');
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('clicking generate triggers router navigation with encoded payload', async () => {
    const router = makeRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    for (let i = 0; i < 4; i++) {
      await wrapper.find(`[data-test="name-input-${i}"] input`).setValue(`Player${i}`);
    }
    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.find('[data-test="generate"]').trigger('click');
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'play', query: expect.objectContaining({ g: expect.any(String) }) }),
    );
  });

  it('exposes language, difficulty, hints controls', async () => {
    const router = makeRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find('[data-test="lang-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="difficulty-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="hints-switch"]').exists()).toBe(true);
  });

  it('settings round-trip through the generated URL', async () => {
    const router = makeRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    await fillFourNames(wrapper);

    findControl(wrapper, 'lang-select').vm.$emit('update:modelValue', 'de');
    findControl(wrapper, 'difficulty-select').vm.$emit('update:modelValue', 'easy');
    findControl(wrapper, 'hints-switch').vm.$emit('update:modelValue', false);
    await flushPromises();

    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.find('[data-test="generate"]').trigger('click');

    const payload = pushSpy.mock.calls[0][0] as { query: { g: string } };
    const decoded = decodeState(payload.query.g);
    expect(decoded.lang).toBe('de');
    expect(decoded.difficulty).toBe('easy');
    expect(decoded.hintsEnabled).toBe(false);
  });

  it('changing language updates the i18n locale immediately', async () => {
    const router = makeRouter();
    const wrapper = mount(HostSetup, { global: { plugins: [router] } });
    expect(i18n.global.locale.value).toBe('en');
    findControl(wrapper, 'lang-select').vm.$emit('update:modelValue', 'de');
    await flushPromises();
    expect(i18n.global.locale.value).toBe('de');
  });
});
