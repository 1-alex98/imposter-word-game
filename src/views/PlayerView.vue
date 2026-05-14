<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameSession } from '@/composables/useGameSession';
import { imposterIndex, roleFor } from '@/core/roles';
import { loadWords } from '@/content/loadWords';
import { filterByDifficulty } from '@/core/words';
import type { WordEntry } from '@/content/types';
import ShareControls from '@/components/ShareControls.vue';

type Stage = 'pre-reveal' | 'reveal' | 'play' | 'imposter-revealed';

const REVEAL_AUTO_HIDE_MS = 8000;

const { t } = useI18n();
const router = useRouter();
const {
  state,
  chosenName,
  playerIndex,
  round,
  roundStartedAt,
  roleViewedThisSession,
  setChosenName,
  clearChosenName,
  advanceRound,
  markRoleViewed,
  clearSession,
  reload,
} = useGameSession();

const REVEAL_CONFIRM_THRESHOLD_MS = 60_000;

const stage = ref<Stage>('pre-reveal');
const revealTimerId = ref<ReturnType<typeof setTimeout> | null>(null);
const qrDialogOpen = ref<boolean>(false);
const revealConfirmOpen = ref<boolean>(false);

const wordList = ref<WordEntry[] | null>(null);
const wordLoadError = ref<boolean>(false);
const wordLoadPending = ref<boolean>(false);

async function fetchWords() {
  if (!state.value) return;
  wordLoadPending.value = true;
  wordLoadError.value = false;
  try {
    wordList.value = await loadWords(state.value.lang);
  } catch {
    wordLoadError.value = true;
  } finally {
    wordLoadPending.value = false;
  }
}

onMounted(() => {
  // HostSetup → router.push().then(reload) means state can land after we mount;
  // re-read URL ourselves so word loading isn't gated on the trailing reload().
  if (!state.value) reload();
  fetchWords();
});

const words = computed(() => {
  if (!state.value || !wordList.value) return [];
  return filterByDifficulty(wordList.value, state.value.difficulty);
});

const shareUrl = computed(() =>
  typeof window !== 'undefined' ? window.location.href : '',
);

const role = computed(() => {
  if (!state.value || playerIndex.value < 0) return null;
  return roleFor({
    playerIndex: playerIndex.value,
    seed: state.value.seed,
    round: round.value,
    playerCount: state.value.names.length,
    words: words.value,
  });
});

const imposterName = computed(() => {
  if (!state.value) return '';
  const idx = imposterIndex(state.value.seed, round.value, state.value.names.length, words.value);
  return state.value.names[idx] ?? '';
});

function pickName(name: string) {
  setChosenName(name);
  stage.value = 'pre-reveal';
}

function unpick() {
  cancelTimer();
  clearChosenName();
  stage.value = 'pre-reveal';
}

function cancelTimer() {
  if (revealTimerId.value !== null) {
    clearTimeout(revealTimerId.value);
    revealTimerId.value = null;
  }
}

function showRole() {
  stage.value = 'reveal';
  markRoleViewed();
  cancelTimer();
  revealTimerId.value = setTimeout(() => {
    stage.value = 'play';
    revealTimerId.value = null;
  }, REVEAL_AUTO_HIDE_MS);
}

function hideRole() {
  cancelTimer();
  stage.value = 'play';
}

function revealImposter() {
  // Guard against accidental early reveals — confirm if the round is fresh.
  if (Date.now() - roundStartedAt.value < REVEAL_CONFIRM_THRESHOLD_MS) {
    revealConfirmOpen.value = true;
    return;
  }
  stage.value = 'imposter-revealed';
}

function confirmRevealImposter() {
  revealConfirmOpen.value = false;
  stage.value = 'imposter-revealed';
}

function nextRound() {
  advanceRound();
  stage.value = 'pre-reveal';
}

function newGame() {
  cancelTimer();
  clearSession();
  router.push({ name: 'host' });
}
</script>

<template>
  <v-container class="pa-4" data-test="player-view">
    <!-- Word list loading -->
    <template v-if="wordLoadPending">
      <v-row justify="center" class="mt-12">
        <v-col cols="12" md="8" class="text-center">
          <v-progress-circular indeterminate color="primary" size="64" data-test="word-loading" />
        </v-col>
      </v-row>
    </template>

    <!-- Word list error -->
    <template v-else-if="wordLoadError">
      <v-row justify="center" class="mt-12">
        <v-col cols="12" md="8">
          <v-card class="pa-6 text-center">
            <v-card-text>
              <div class="text-h6 mb-4" data-test="word-load-error">{{ t('player.wordLoadError') }}</div>
              <v-btn color="primary" variant="elevated" data-test="word-load-retry" @click="fetchWords">
                {{ t('player.retry') }}
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Name pick -->
    <template v-else-if="state && !chosenName">
      <v-row justify="center">
        <v-col cols="12" md="8">
          <v-card class="pa-6" data-test="share-card">
            <v-card-title class="text-h5">{{ t('player.shareTitle') }}</v-card-title>
            <v-card-text>
              <ShareControls :url="shareUrl" />
            </v-card-text>
          </v-card>
          <v-card class="pa-6 mt-4">
            <v-card-title class="text-h4">{{ t('player.pickName') }}</v-card-title>
            <v-card-text>
              <div class="d-flex flex-wrap ga-3">
                <v-btn
                  v-for="(name, i) in state.names"
                  :key="i"
                  size="x-large"
                  variant="outlined"
                  :data-test="`pick-name-${i}`"
                  @click="pickName(name)"
                >
                  {{ name }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- In-game -->
    <template v-else-if="state && chosenName && role">
      <v-row justify="center" class="mt-12">
        <v-col cols="12" md="8">
          <v-card class="pa-6" data-test="player-card">
            <v-card-title
              v-if="round === 1 && !roleViewedThisSession"
              class="text-h4"
              data-test="you-are-title"
            >
              {{ t('player.youAre') }} {{ chosenName }}
            </v-card-title>

            <!-- pre-reveal -->
            <v-card-text v-if="stage === 'pre-reveal'" data-test="stage-pre-reveal">
              <div class="d-flex justify-center mt-8">
                <v-btn
                  color="primary"
                  size="x-large"
                  variant="elevated"
                  prepend-icon="mdi-eye"
                  data-test="show-role"
                  @click="showRole"
                >
                  {{ t('player.showRole') }}
                </v-btn>
              </div>
            </v-card-text>

            <!-- reveal -->
            <v-card-text v-else-if="stage === 'reveal'" data-test="stage-reveal">
              <div v-if="role.isImposter" class="text-center" data-test="role-imposter">
                <div class="text-h3">{{ t('player.imposter') }}</div>
                <div
                  v-if="state.hintsEnabled"
                  class="text-h6 text-medium-emphasis mt-4"
                  data-test="imposter-hint"
                >
                  {{ t('player.hint') }}: {{ role.hint }}
                </div>
              </div>
              <div v-else class="text-center" data-test="role-innocent">
                <div class="text-h6 text-medium-emphasis">{{ t('player.yourWord') }}</div>
                <div class="text-h2 mt-2">{{ role.word }}</div>
              </div>
              <div class="d-flex justify-center mt-10">
                <v-btn
                  size="large"
                  variant="outlined"
                  prepend-icon="mdi-eye-off"
                  data-test="hide-role"
                  @click="hideRole"
                >
                  {{ t('player.hide') }}
                </v-btn>
              </div>
            </v-card-text>

            <!-- play -->
            <v-card-text v-else-if="stage === 'play'" data-test="stage-play">
              <div class="text-h4 text-center">{{ t('player.haveFun') }}</div>
              <div class="d-flex flex-wrap justify-center ga-3 mt-10 mb-10">
                <v-btn
                  size="large"
                  variant="outlined"
                  prepend-icon="mdi-eye"
                  data-test="show-role-again"
                  @click="showRole"
                >
                  {{ t('player.showRoleAgain') }}
                </v-btn>
                <v-btn
                  v-if="roleViewedThisSession"
                  color="secondary"
                  size="large"
                  variant="elevated"
                  prepend-icon="mdi-account-search"
                  data-test="reveal-imposter"
                  @click="revealImposter"
                >
                  {{ t('player.revealImposter') }}
                </v-btn>
              </div>
            </v-card-text>

            <!-- imposter revealed -->
            <v-card-text v-else-if="stage === 'imposter-revealed'" data-test="stage-imposter">
              <div class="text-h5 text-medium-emphasis text-center">
                {{ t('player.imposterIs') }}
              </div>
              <div class="text-h2 text-center mt-2" data-test="imposter-name">
                {{ imposterName }}
              </div>
              <div class="d-flex justify-center mt-10">
                <v-btn
                  color="primary"
                  size="x-large"
                  variant="elevated"
                  append-icon="mdi-arrow-right"
                  data-test="next-round"
                  @click="nextRound"
                >
                  {{ t('player.nextRound') }}
                </v-btn>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-btn
                v-if="!roleViewedThisSession"
                variant="text"
                size="small"
                prepend-icon="mdi-account-edit"
                data-test="change-name"
                @click="unpick"
              >
                {{ t('player.changeName') }}
              </v-btn>
              <v-btn
                v-if="round === 1"
                variant="text"
                size="small"
                prepend-icon="mdi-qrcode"
                data-test="show-qr"
                @click="qrDialogOpen = true"
              >
                {{ t('player.showQr') }}
              </v-btn>
              <v-spacer />
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    variant="text"
                    size="small"
                    v-bind="props"
                    :aria-label="t('player.newGame')"
                    data-test="overflow-menu"
                  />
                </template>
                <v-list>
                  <v-list-item
                    prepend-icon="mdi-restart"
                    data-test="new-game"
                    @click="newGame"
                  >
                    <v-list-item-title>{{ t('player.newGame') }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-dialog
      v-if="qrDialogOpen"
      v-model="qrDialogOpen"
      max-width="360"
      data-test="qr-dialog"
    >
      <v-card class="pa-4">
        <v-card-title>{{ t('player.qrDialogTitle') }}</v-card-title>
        <v-card-text>
          <ShareControls :url="shareUrl" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            prepend-icon="mdi-close"
            data-test="qr-dialog-close"
            @click="qrDialogOpen = false"
          >
            {{ t('player.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="revealConfirmOpen"
      v-model="revealConfirmOpen"
      max-width="420"
      data-test="reveal-confirm-dialog"
    >
      <v-card class="pa-4">
        <v-card-title>{{ t('player.revealConfirmTitle') }}</v-card-title>
        <v-card-text>{{ t('player.revealConfirmMessage') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            data-test="reveal-confirm-cancel"
            @click="revealConfirmOpen = false"
          >
            {{ t('player.revealConfirmNo') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            data-test="reveal-confirm-yes"
            @click="confirmRevealImposter"
          >
            {{ t('player.revealConfirmYes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
