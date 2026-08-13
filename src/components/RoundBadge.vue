<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ round: number }>();
const emit = defineEmits<{ 'update:round': [number] }>();
const { t } = useI18n();

const MIN_ROUND = 1;
const MAX_ROUND = 99;

const open = ref(false);
const draft = ref(props.round);

const canDecrease = computed(() => draft.value > MIN_ROUND);
const canIncrease = computed(() => draft.value < MAX_ROUND);

watch(
  () => props.round,
  (n) => {
    draft.value = n;
  },
);

function openPicker() {
  draft.value = props.round;
  open.value = true;
}

function step(delta: number) {
  draft.value = Math.min(MAX_ROUND, Math.max(MIN_ROUND, draft.value + delta));
}

function apply() {
  open.value = false;
  if (draft.value !== props.round) emit('update:round', draft.value);
}
</script>

<template>
  <v-btn
    class="round-badge"
    variant="flat"
    color="primary"
    rounded="pill"
    :aria-label="t('player.roundPickerOpen')"
    data-test="round-badge"
    @click="openPicker"
  >
    {{ t('player.round', { n: round }) }}
  </v-btn>

  <v-dialog v-if="open" v-model="open" max-width="360" data-test="round-picker-dialog">
    <v-card class="pa-4">
      <v-card-title class="text-h6 px-0">{{ t('player.roundPickerTitle') }}</v-card-title>
      <v-card-text class="px-0">
        <div class="d-flex align-center justify-center ga-4">
          <v-btn
            icon="mdi-minus-circle-outline"
            variant="tonal"
            color="secondary"
            size="large"
            :disabled="!canDecrease"
            :aria-label="t('player.roundPickerDecrease')"
            data-test="round-picker-minus"
            @click="step(-1)"
          />
          <div class="text-h3 font-weight-bold text-primary" data-test="round-picker-value">
            {{ draft }}
          </div>
          <v-btn
            icon="mdi-plus-circle-outline"
            variant="tonal"
            color="secondary"
            size="large"
            :disabled="!canIncrease"
            :aria-label="t('player.roundPickerIncrease')"
            data-test="round-picker-plus"
            @click="step(1)"
          />
        </div>
        <div class="text-body-2 text-medium-emphasis text-center mt-4">
          {{ t('player.roundPickerHint') }}
        </div>
      </v-card-text>
      <v-card-actions class="px-0">
        <v-spacer />
        <v-btn variant="text" data-test="round-picker-cancel" @click="open = false">
          {{ t('player.roundPickerCancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          data-test="round-picker-apply"
          @click="apply"
        >
          {{ t('player.roundPickerApply') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.round-badge {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 10px rgba(var(--v-theme-primary), 0.45);
  white-space: nowrap;
}
</style>
