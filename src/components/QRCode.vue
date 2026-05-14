<script setup lang="ts">
import { computed } from 'vue';
import qrcode from 'qrcode-generator';

const props = withDefaults(
  defineProps<{
    value: string;
    size?: number;
    margin?: number;
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  }>(),
  { size: 220, margin: 2, errorCorrection: 'M' },
);

interface Cell {
  x: number;
  y: number;
  w: number;
}

const cells = computed<Cell[]>(() => {
  const qr = qrcode(0, props.errorCorrection);
  qr.addData(props.value);
  qr.make();
  const count = qr.getModuleCount();
  const total = count + props.margin * 2;
  const cellSize = props.size / total;
  const out: Cell[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        out.push({
          x: (c + props.margin) * cellSize,
          y: (r + props.margin) * cellSize,
          w: cellSize,
        });
      }
    }
  }
  return out;
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    xmlns="http://www.w3.org/2000/svg"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="value"
    data-test="qr-code"
  >
    <rect width="100%" height="100%" fill="#fff" />
    <rect
      v-for="(cell, i) in cells"
      :key="i"
      :x="cell.x"
      :y="cell.y"
      :width="cell.w"
      :height="cell.w"
      fill="#000"
    />
  </svg>
</template>
