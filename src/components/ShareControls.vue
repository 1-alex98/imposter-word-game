<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import QRCode from './QRCode.vue';

const props = withDefaults(defineProps<{ url: string; qrSize?: number }>(), {
  qrSize: 220,
});
const { t } = useI18n();

const COPY_FEEDBACK_MS = 1500;

const copied = ref(false);
const errored = ref(false);
const fallbackUrl = ref<string | null>(null);
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

const shareSupported = computed(
  () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
);

async function onShare() {
  if (!shareSupported.value) return;
  try {
    await navigator.share({
      url: props.url,
      title: t('player.shareSubject'),
      text: t('player.shareText'),
    });
  } catch (err) {
    // User cancellation should not surface as an error.
    if ((err as DOMException)?.name === 'AbortError') return;
    errored.value = true;
  }
}

function clearFeedback() {
  if (feedbackTimer !== null) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
}

async function onCopy() {
  clearFeedback();
  errored.value = false;
  fallbackUrl.value = null;
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    feedbackTimer = setTimeout(() => {
      copied.value = false;
      feedbackTimer = null;
    }, COPY_FEEDBACK_MS);
  } catch {
    fallbackUrl.value = props.url;
    errored.value = true;
  }
}
</script>

<template>
  <div class="d-flex flex-column ga-2" data-test="share-controls">
    <div class="d-flex flex-wrap ga-2 align-center">
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-content-copy"
        data-test="copy-link"
        @click="onCopy"
      >
        {{ t('player.copyLink') }}
      </v-btn>
      <v-btn
        v-if="shareSupported"
        variant="elevated"
        prepend-icon="mdi-share-variant"
        data-test="share-link"
        @click="onShare"
      >
        {{ t('player.share') }}
      </v-btn>
      <span v-if="copied" class="text-success" data-test="copy-success">
        {{ t('player.linkCopied') }}
      </span>
      <span v-if="errored" class="text-error" data-test="copy-error">
        {{ t('player.copyFailed') }}
      </span>
    </div>

    <v-text-field
      v-if="fallbackUrl"
      :model-value="fallbackUrl"
      readonly
      density="compact"
      variant="outlined"
      hide-details
      data-test="copy-fallback-url"
    />

    <div class="d-flex justify-center mt-2">
      <QRCode :value="url" :size="props.qrSize" />
    </div>
  </div>
</template>
