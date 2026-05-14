import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test-version'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // @ts-expect-error vite plugin types from nested vitest are slightly off
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        inline: [/vuetify/, /@mdi\/font/],
      },
    },
    css: true,
  },
});
