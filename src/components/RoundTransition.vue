<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ round: number; show: boolean }>();
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();

// PLAN 4.4 calls for ~1s; user later requested +2s to land at ~3s so a phone passed
// across the room can read "Round N" before the next-round flow resumes.
const FULL_DURATION_MS = 3100;
const REDUCED_DURATION_MS = 250;

const reducedMotion = ref(false);
function detectReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
onMounted(() => {
  reducedMotion.value = detectReducedMotion();
});

const duration = computed(() =>
  reducedMotion.value ? REDUCED_DURATION_MS : FULL_DURATION_MS,
);

let timer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => props.show,
  (isShown) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (isShown) {
      timer = setTimeout(() => {
        timer = null;
        emit('done');
      }, duration.value);
    }
  },
);
</script>

<template>
  <Transition name="round-transition">
    <div
      v-if="show"
      class="round-transition-overlay"
      :class="{ 'reduced-motion': reducedMotion }"
      data-test="round-transition"
      :data-test-reduced-motion="reducedMotion ? '1' : '0'"
      role="status"
      aria-live="polite"
    >
      <div class="round-transition-content">
        <div class="round-transition-label">{{ t('player.round', { n: round }) }}</div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.round-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  pointer-events: none;
}

.round-transition-content {
  text-align: center;
  animation: round-pop 600ms ease-out forwards;
}

.round-transition-label {
  font-size: clamp(3rem, 18vw, 8rem);
  font-weight: 800;
  letter-spacing: 0.02em;
}

.round-transition-enter-active,
.round-transition-leave-active {
  transition: opacity 200ms ease-out;
}
.round-transition-enter-from,
.round-transition-leave-to {
  opacity: 0;
}

@keyframes round-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  40% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.round-transition-overlay.reduced-motion .round-transition-content {
  animation: none;
}
.round-transition-overlay.reduced-motion {
  /* still legible — just no pop. */
}

@media (prefers-reduced-motion: reduce) {
  .round-transition-content {
    animation: none;
  }
  .round-transition-enter-active,
  .round-transition-leave-active {
    transition: none;
  }
}
</style>
