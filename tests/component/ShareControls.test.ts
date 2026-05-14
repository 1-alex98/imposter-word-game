import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ShareControls from '../../src/components/ShareControls.vue';

const URL = 'https://example.com/imposter_game/play?g=abc123';

describe('ShareControls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls navigator.clipboard.writeText with the URL on copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const wrapper = mount(ShareControls, { props: { url: URL } });
    await wrapper.find('[data-test="copy-link"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(URL);
  });

  it('shows confirmation after success then hides after 1.5s', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const wrapper = mount(ShareControls, { props: { url: URL } });
    await wrapper.find('[data-test="copy-link"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="copy-success"]').exists()).toBe(true);
    vi.advanceTimersByTime(1500);
    await flushPromises();
    expect(wrapper.find('[data-test="copy-success"]').exists()).toBe(false);
  });

  it('shows fallback selectable URL + error message on clipboard rejection', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const wrapper = mount(ShareControls, { props: { url: URL } });
    await wrapper.find('[data-test="copy-link"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="copy-fallback-url"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="copy-error"]').exists()).toBe(true);
  });

  it('shows fallback selectable URL when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    const wrapper = mount(ShareControls, { props: { url: URL } });
    await wrapper.find('[data-test="copy-link"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="copy-fallback-url"]').exists()).toBe(true);
  });

  describe('Web Share API', () => {
    afterEach(() => {
      // Remove our injected share method so the next test's branch is clean.
      delete (navigator as unknown as { share?: unknown }).share;
    });

    it('share button is absent when navigator.share is unsupported', () => {
      delete (navigator as unknown as { share?: unknown }).share;
      const wrapper = mount(ShareControls, { props: { url: URL } });
      expect(wrapper.find('[data-test="share-link"]').exists()).toBe(false);
    });

    it('share button calls navigator.share with url, title, text', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: share,
      });
      const wrapper = mount(ShareControls, { props: { url: URL } });
      expect(wrapper.find('[data-test="share-link"]').exists()).toBe(true);
      await wrapper.find('[data-test="share-link"]').trigger('click');
      await flushPromises();
      expect(share).toHaveBeenCalledTimes(1);
      const arg = share.mock.calls[0][0] as { url: string; title: string; text: string };
      expect(arg.url).toBe(URL);
      expect(arg.title).toBeTruthy();
      expect(arg.text).toBeTruthy();
    });

    it('user-canceled share does not produce an error message', async () => {
      const abort = new DOMException('canceled', 'AbortError');
      const share = vi.fn().mockRejectedValue(abort);
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: share,
      });
      const wrapper = mount(ShareControls, { props: { url: URL } });
      await wrapper.find('[data-test="share-link"]').trigger('click');
      await flushPromises();
      expect(wrapper.find('[data-test="copy-error"]').exists()).toBe(false);
    });
  });
});
