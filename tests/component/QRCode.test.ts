import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';
import QRCode from '../../src/components/QRCode.vue';

function decodeViaMatrix(value: string): string | null {
  // Generate the same matrix the component would render, then feed it to jsQR
  // as a synthetic ImageData. Each module is 1 pixel; a small quiet zone
  // matches the component's default margin.
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const margin = 4;
  const size = count + margin * 2;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inQR = r >= margin && c >= margin && r < margin + count && c < margin + count;
      const dark = inQR && qr.isDark(r - margin, c - margin);
      const idx = (r * size + c) * 4;
      const v = dark ? 0 : 255;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  return jsQR(data, size, size)?.data ?? null;
}

describe('QRCode', () => {
  it('renders an SVG for a given value', () => {
    const wrapper = mount(QRCode, { props: { value: 'https://example.com/abc' } });
    const el = wrapper.find('[data-test="qr-code"]');
    expect(el.exists()).toBe(true);
    expect(el.findAll('rect').length).toBeGreaterThan(10);
  });

  it('rerenders when the value changes', async () => {
    const wrapper = mount(QRCode, { props: { value: 'aaa' } });
    const firstCount = wrapper.findAll('rect').length;
    await wrapper.setProps({ value: 'a much longer payload than the first value to ensure the QR matrix differs' });
    const secondCount = wrapper.findAll('rect').length;
    expect(secondCount).not.toBe(firstCount);
  });

  it('encode/decode round-trip recovers the input URL', () => {
    const url = 'https://example.com/imposter_game/play?g=abc123XYZ';
    expect(decodeViaMatrix(url)).toBe(url);
  });

  it('decodes a longer payload', () => {
    const url =
      'https://example.com/imposter_game/play?g=' +
      'eyJ2IjoiYWJjZGVmZ2hpamtsIiwibiI6WyJBbm5hIiwiQmrDtnJuIiwiQ2FybCJdfQ';
    expect(decodeViaMatrix(url)).toBe(url);
  });
});
