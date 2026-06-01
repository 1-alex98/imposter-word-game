<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ round: number; show: boolean }>();
const emit = defineEmits<{ done: [] }>();

// Cosmetic dice roll shown above "Round N". The face is purely decorative — it
// has nothing to do with the seeded game RNG — so cycling it here is safe.
const DICE_FACES = 6;
const ROLL_TICK_MS = 160;
const ROLL_TICKS = 11;
const dieFace = ref(1);
let rollTimer: ReturnType<typeof setInterval> | null = null;

function stopRoll() {
  if (rollTimer) {
    clearInterval(rollTimer);
    rollTimer = null;
  }
}

function startRoll() {
  stopRoll();
  let ticks = 0;
  rollTimer = setInterval(() => {
    ticks += 1;
    dieFace.value = (dieFace.value % DICE_FACES) + 1;
    if (ticks >= ROLL_TICKS) stopRoll();
  }, ROLL_TICK_MS);
}

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
      dieFace.value = 1;
      if (!reducedMotion.value) startRoll();
      timer = setTimeout(() => {
        timer = null;
        emit('done');
      }, duration.value);
    } else {
      stopRoll();
    }
  },
);

onUnmounted(() => {
  if (timer) clearTimeout(timer);
  stopRoll();
});
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
        <div
          class="round-transition-die"
          :class="{ 'is-rolling': !reducedMotion }"
          data-test="round-die"
          aria-hidden="true"
        >
          <v-icon :icon="`mdi-dice-${dieFace}`" />
        </div>
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
  /* Dark base with a faint accent-coloured glow so the overlay isn't flat black. */
  background:
    radial-gradient(circle at center, rgba(var(--v-theme-primary), 0.28), transparent 60%),
    rgba(0, 0, 0, 0.78);
  color: #fff;
  pointer-events: none;
}

.round-transition-content {
  text-align: center;
  animation: round-pop 600ms ease-out forwards;
}

.round-transition-die {
  font-size: clamp(3.5rem, 16vw, 7rem);
  line-height: 1;
  margin-bottom: 0.1em;
  color: rgb(var(--v-theme-secondary));
  filter: drop-shadow(0 2px 14px rgba(var(--v-theme-secondary), 0.6));
}
.round-transition-die.is-rolling {
  animation: dice-roll 1760ms cubic-bezier(0.33, 0.9, 0.45, 1) forwards;
}

.round-transition-label {
  font-size: clamp(3rem, 18vw, 8rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  /* Accent gradient text: primary (teal) → secondary (orange). */
  background-image: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary)),
    rgb(var(--v-theme-secondary))
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  /* Soft accent glow keeps the gradient legible over the dark overlay. */
  filter: drop-shadow(0 2px 12px rgba(var(--v-theme-primary), 0.55));
}

.round-transition-enter-active,
.round-transition-leave-active {
  transition: opacity 200ms ease-out;
}
.round-transition-enter-from,
.round-transition-leave-to {
  opacity: 0;
}

@keyframes dice-roll {
  0% {
    transform: rotate(-200deg) scale(0.4);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  80% {
    transform: rotate(620deg) scale(1.12);
    opacity: 1;
  }
  100% {
    transform: rotate(720deg) scale(1);
    opacity: 1;
  }
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
  .round-transition-content,
  .round-transition-die.is-rolling {
    animation: none;
  }
  .round-transition-enter-active,
  .round-transition-leave-active {
    transition: none;
  }
}
</style>
