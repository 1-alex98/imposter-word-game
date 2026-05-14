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
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}
</style>
