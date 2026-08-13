<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <div class="player-badge" data-test="player-badge">
    {{ name }}
  </div>
</template>

<style scoped>
.player-badge {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
  pointer-events: none;
  box-shadow: 0 2px 10px rgba(var(--v-theme-secondary), 0.45);
  white-space: nowrap;
}
</style>
