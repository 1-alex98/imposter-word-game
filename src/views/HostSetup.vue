<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MAX_PLAYERS, MIN_PLAYERS, validateNames, type HostErrorCode } from '@/core/host';
import { encodeState, generateSeed, type Difficulty } from '@/core/state';
import { useGameSession } from '@/composables/useGameSession';
import { setLocale, type Locale } from '@/i18n';

const { t, locale } = useI18n();
const router = useRouter();
const { reload, URL_PARAM } = useGameSession();

const names = ref<string[]>(['', '', '', '']);
const lang = ref<Locale>(locale.value as Locale);
const difficulty = ref<Difficulty>('easy');
const hintsEnabled = ref<boolean>(false);
// Suppress validation chrome until the user actually attempts to start a game;
// nothing should look "wrong" before they've done anything.
const attempted = ref<boolean>(false);

const languageOptions = computed(() => [
  { value: 'en', title: 'English' },
  { value: 'de', title: 'Deutsch' },
]);
const difficultyOptions = computed(() => [
  { value: 'easy', title: t('host.difficulties.easy') },
  { value: 'medium', title: t('host.difficulties.medium') },
]);

function onLangChange(v: Locale) {
  lang.value = v;
  setLocale(v);
}

function addRow() {
  if (names.value.length < MAX_PLAYERS) names.value.push('');
}
function removeRow(i: number) {
  if (names.value.length > MIN_PLAYERS) names.value.splice(i, 1);
}

const validation = computed(() => validateNames(names.value));
const canGenerate = computed(() => validation.value.valid);

function errorMessage(code: HostErrorCode | null): string {
  if (!code) return '';
  return t(`host.errors.${code}`);
}

function onGenerate() {
  if (!canGenerate.value) {
    attempted.value = true;
    return;
  }
  const trimmed = names.value.map((n) => n.trim()).filter((n) => n.length > 0);
  const seed = generateSeed();
  const payload = encodeState({
    version: __APP_VERSION__,
    names: trimmed,
    lang: lang.value,
    difficulty: difficulty.value,
    hintsEnabled: hintsEnabled.value,
    seed,
  });
  router.push({ name: 'play', query: { [URL_PARAM]: payload } }).then(() => {
    reload();
  });
}
</script>

<template>
  <v-container class="pa-4" data-test="host-setup">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="pa-4">
          <v-card-title>{{ t('host.title') }}</v-card-title>
          <v-card-text>
            <div
              v-for="(_, i) in names"
              :key="i"
              class="d-flex align-center mb-2"
              :data-test="`name-row-${i}`"
            >
              <v-text-field
                v-model="names[i]"
                density="comfortable"
                hide-details="auto"
                :placeholder="t('host.namePlaceholder')"
                :error-messages="attempted ? errorMessage(validation.fieldErrors[i]) : ''"
                :data-test="`name-input-${i}`"
              />
              <v-btn
                v-if="names.length > 4"
                icon="mdi-close"
                variant="text"
                size="small"
                class="ml-2"
                :aria-label="t('host.removePlayer')"
                :data-test="`name-remove-${i}`"
                @click="removeRow(i)"
              />
            </div>
            <v-btn
              v-if="names.length < 12"
              variant="text"
              prepend-icon="mdi-plus"
              data-test="add-player"
              @click="addRow"
            >
              {{ t('host.addPlayer') }}
            </v-btn>
            <div
              v-if="attempted && validation.formError"
              class="text-error mt-2"
              data-test="form-error"
            >
              {{ errorMessage(validation.formError) }}
            </div>

            <v-divider class="my-4" />

            <div class="d-flex flex-wrap ga-4 align-center">
              <v-select
                :model-value="lang"
                :items="languageOptions"
                :label="t('host.language')"
                density="comfortable"
                hide-details
                style="min-width: 160px"
                data-test="lang-select"
                @update:model-value="onLangChange"
              />
              <v-select
                v-model="difficulty"
                :items="difficultyOptions"
                :label="t('host.difficulty')"
                density="comfortable"
                hide-details
                style="min-width: 160px"
                data-test="difficulty-select"
              />
              <v-switch
                v-model="hintsEnabled"
                :label="t('host.hints')"
                color="primary"
                density="comfortable"
                hide-details
                data-test="hints-switch"
              />
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              data-test="generate"
              @click="onGenerate"
            >
              {{ t('host.generate') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
