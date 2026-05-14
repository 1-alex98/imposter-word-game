import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { i18n } from '../src/i18n';

// Stub Vuetify supportsTouch/jsdom layout APIs.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  // ResizeObserver shim
  (window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  // visualViewport shim used by some Vuetify components
  if (!(window as unknown as { visualViewport?: unknown }).visualViewport) {
    (window as unknown as { visualViewport: unknown }).visualViewport = {
      width: 1024,
      height: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
}

const vuetify = createVuetify({ components, directives });

config.global.plugins = [vuetify, i18n];
