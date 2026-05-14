<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ round: number }>();
const { t } = useI18n();
</script>

<template>
  <div class="round-badge" data-test="round-badge">
    {{ t('player.round', { n: round }) }}
  </div>
</template>

<style scoped>
.round-badge {
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
