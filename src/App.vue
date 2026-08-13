<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTheme } from 'vuetify';
import VersionMismatch from './components/VersionMismatch.vue';
import RoundBadge from './components/RoundBadge.vue';
import PlayerBadge from './components/PlayerBadge.vue';
import HelpButton from './components/HelpButton.vue';
import { useVersionGuard } from './composables/useVersionGuard';
import { useGameSession } from './composables/useGameSession';
import { setLocale } from './i18n';

const route = useRoute();
const { mismatch } = useVersionGuard();
const { state, round, chosenName, roleViewedThisSession, setRound } = useGameSession();

const theme = useTheme();
let darkQuery: MediaQueryList | null = null;
function applySystemTheme(e: MediaQueryList | MediaQueryListEvent) {
  theme.global.name.value = e.matches ? 'dark' : 'light';
}
onMounted(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  applySystemTheme(darkQuery);
  darkQuery.addEventListener('change', applySystemTheme);
});
onBeforeUnmount(() => {
  darkQuery?.removeEventListener('change', applySystemTheme);
});

const showRoundBadge = computed(() => {
  return route.name === 'play' && !!chosenName.value;
});
const showPlayerBadge = computed(() => {
  if (route.name !== 'play' || !chosenName.value) return false;
  // Round 1: hidden until the inline "you are X" title goes away (after first reveal).
  // Round 2+: name is in the corner from the start of the round; the title is suppressed.
  return roleViewedThisSession.value || round.value > 1;
});

watch(
  state,
  (s) => {
    if (s) setLocale(s.lang);
  },
  { immediate: true },
);
</script>

<template>
  <v-app>
    <VersionMismatch v-if="mismatch" />
    <template v-else>
      <HelpButton />
      <div
        v-if="showRoundBadge || showPlayerBadge"
        class="game-header d-flex align-center px-3 pt-2 pb-1"
      >
        <PlayerBadge v-if="showPlayerBadge && chosenName" :name="chosenName" />
        <div class="flex-grow-1" />
        <RoundBadge v-if="showRoundBadge" :round="round" @update:round="setRound" />
      </div>
      <v-main>
        <router-view />
      </v-main>
    </template>
  </v-app>
</template>

<style>
/* Colourful app backdrop — a soft two-tone wash behind the themed surfaces. */
.v-application {
  background-image:
    radial-gradient(circle at 12% 0%, rgba(var(--v-theme-primary), 0.22), transparent 55%),
    radial-gradient(circle at 88% 100%, rgba(var(--v-theme-secondary), 0.2), transparent 55%);
  background-attachment: fixed;
}

/* On very narrow phones, let button labels wrap instead of overflowing. */
@media (max-width: 360px) {
  .v-btn:not(.v-btn--icon) {
    height: auto;
    min-height: var(--v-btn-height);
    padding-block: 6px;
  }
  .v-btn:not(.v-btn--icon) .v-btn__content {
    white-space: normal;
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
  }
}
</style>
