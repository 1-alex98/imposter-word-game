<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, tm, rt } = useI18n();
const open = ref(false);

const steps = computed<string[]>(() => {
  const raw = tm('help.steps') as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => rt(s as string));
});
</script>

<template>
  <v-btn
    icon="mdi-help-circle-outline"
    variant="text"
    class="help-button"
    :aria-label="t('help.open')"
    data-test="help-button"
    @click="open = true"
  />
  <v-dialog
    v-if="open"
    v-model="open"
    max-width="480"
    data-test="help-dialog"
  >
    <v-card class="pa-4">
      <v-card-title>{{ t('help.title') }}</v-card-title>
      <v-card-text>
        <p class="mb-3">{{ t('help.intro') }}</p>
        <ol class="ps-5">
          <li v-for="(s, i) in steps" :key="i" class="mb-2">{{ s }}</li>
        </ol>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-close"
          data-test="help-dialog-close"
          @click="open = false"
        >
          {{ t('help.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.help-button {
  position: fixed;
  bottom: 0.75rem;
  right: 0.75rem;
  z-index: 1500;
  background: rgb(var(--v-theme-tertiary));
  color: rgb(var(--v-theme-on-tertiary));
  box-shadow: 0 2px 10px rgba(var(--v-theme-tertiary), 0.45);
}
</style>
