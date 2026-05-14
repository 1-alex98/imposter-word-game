import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

function buildVersion(): string {
  const parts: string[] = [];
  const wordsDir = path.resolve(__dirname, 'src/content');
  if (existsSync(wordsDir)) {
    for (const f of readdirSync(wordsDir).sort()) {
      parts.push(f);
      parts.push(readFileSync(path.join(wordsDir, f), 'utf8'));
    }
  }
  const pkg = readFileSync(path.resolve(__dirname, 'package.json'), 'utf8');
  parts.push(pkg);
  return createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 12);
}

const VERSION = buildVersion();

export default defineConfig({
  base: '/imposter_game/',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Imposter Game',
        short_name: 'Imposter',
        start_url: '/imposter_game/',
        display: 'standalone',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        icons: [],
      },
    }),
  ],
});
