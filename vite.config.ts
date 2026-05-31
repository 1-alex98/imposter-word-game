import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import type { Plugin } from 'vite';

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

// GitHub Pages has no server-side rewrite. A first-time visit to a vue-router
// path like `/play?g=...` would 404 before the SPA can boot (and before the
// service worker is installed). Emit `404.html` as a copy of the built
// `index.html` so GH Pages serves the SPA shell on unknown paths; vue-router
// then handles the route client-side.
function emitSpa404(): Plugin {
  return {
    name: 'emit-spa-404',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const indexHtml = path.join(outDir, 'index.html');
      const notFoundHtml = path.join(outDir, '404.html');
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, notFoundHtml);
      }
    },
  };
}

export default defineConfig({
  base: '/',
  // Bind to all interfaces (0.0.0.0/::) so the dev/preview server is reachable
  // from outside the dev container (VS Code port forwarding / host browser).
  // Vite defaults to loopback only (::1), which is unreachable from the host.
  server: { host: true },
  preview: { host: true },
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
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'favicon-16.png',
        'favicon-32.png',
        'apple-touch-icon.png',
        'robots.txt',
      ],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // App-shell (precached HTML/JS/CSS) — NetworkFirst on navigations so deployments
        // are picked up immediately when the user is online (SPEC §7.2).
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Word lists land via dynamic import → `assets/words.*-<hash>.js`. The hash already
            // includes the file contents, so plain CacheFirst would be safe — but we also key
            // the cache by the build-time version (__APP_VERSION__) so a redeploy can't reuse
            // a stale entry from a previous version.
            urlPattern: /\/assets\/words\..*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `words-${VERSION}`,
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:js|css|html)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Imposter Game',
        short_name: 'Imposter',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
    emitSpa404(),
  ],
});
