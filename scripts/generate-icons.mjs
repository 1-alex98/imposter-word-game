// Renders src/content/favicon.svg into the favicon + PWA icon set under public/.
// Single source of truth: do not hand-author per-size artwork (PLAN 4.6).
//
// Outputs:
//   public/favicon.svg                — copied verbatim
//   public/favicon.ico                — single 32×32 PNG-format icon
//   public/favicon-16.png             — browser tab
//   public/favicon-32.png             — browser tab
//   public/apple-touch-icon.png       — 180×180 for iOS home screen
//   public/pwa-192.png                — PWA manifest 192×192
//   public/pwa-512.png                — PWA manifest 512×512
//   public/pwa-maskable-512.png       — PWA manifest maskable 512×512 (safe zone padded)

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'public');

const PRIMARY = '#1976d2';
const WHITE = '#ffffff';

mkdirSync(OUT, { recursive: true });

function renderPng(svgInput, size) {
  const resvg = new Resvg(svgInput, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(255,255,255,0)',
  });
  return resvg.render().asPng();
}

// Standard square icon — uses the existing SVG as-is.
function squareSvg() {
  // Re-wrap with a primary-coloured rounded background so the icon reads on dark/light surfaces.
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${PRIMARY}"/>
  <g transform="translate(8 8) scale(3.4286)">
    <circle cx="6.9" cy="3.84" r="3.84" fill="${WHITE}"/>
    <path d="M3.27 11.3c-1.07 0.22-1.86 1.16-1.86 2.3v3.24h11.02v-3.24c0-1.14-0.79-2.08-1.86-2.3-0.85 1.08-2.17 1.79-3.65 1.79s-2.77-0.72-3.62-1.79z" fill="${WHITE}"/>
  </g>
</svg>`;
}

// Maskable icon — Android masks crop ~40px of a 512px icon edge; keep art in the inner 60% safe zone.
function maskableSvg() {
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${PRIMARY}"/>
  <g transform="translate(16 16) scale(2.286)">
    <circle cx="6.9" cy="3.84" r="3.84" fill="${WHITE}"/>
    <path d="M3.27 11.3c-1.07 0.22-1.86 1.16-1.86 2.3v3.24h11.02v-3.24c0-1.14-0.79-2.08-1.86-2.3-0.85 1.08-2.17 1.79-3.65 1.79s-2.77-0.72-3.62-1.79z" fill="${WHITE}"/>
  </g>
</svg>`;
}

// Minimal ICO container that embeds a PNG (Vista+ format). 22-byte header + PNG bytes.
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type = icon
  header.writeUInt16LE(1, 4);   // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2);   // palette
  entry.writeUInt8(0, 3);   // reserved
  entry.writeUInt16LE(1, 4);    // planes
  entry.writeUInt16LE(32, 6);   // bit depth
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset to image data
  return Buffer.concat([header, entry, pngBuffer]);
}

writeFileSync(join(OUT, 'favicon.svg'), squareSvg(), 'utf8');

const square = squareSvg();
const maskable = maskableSvg();

const png16 = renderPng(square, 16);
const png32 = renderPng(square, 32);
const png180 = renderPng(square, 180);
const png192 = renderPng(square, 192);
const png512 = renderPng(square, 512);
const pngMask512 = renderPng(maskable, 512);

writeFileSync(join(OUT, 'favicon-16.png'), png16);
writeFileSync(join(OUT, 'favicon-32.png'), png32);
writeFileSync(join(OUT, 'apple-touch-icon.png'), png180);
writeFileSync(join(OUT, 'pwa-192.png'), png192);
writeFileSync(join(OUT, 'pwa-512.png'), png512);
writeFileSync(join(OUT, 'pwa-maskable-512.png'), pngMask512);
writeFileSync(join(OUT, 'favicon.ico'), pngToIco(png32, 32));

console.log('icons written to', OUT);
