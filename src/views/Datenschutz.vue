<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <v-container class="pa-2" data-test="datenschutz">
    <v-row justify="center" no-gutters>
      <v-col cols="12" md="8">
        <v-card class="pa-3">
          <v-card-title class="pa-0">{{ t('datenschutz.title') }}</v-card-title>
          <v-card-text class="px-0 pt-2 pb-0">
            <h3 class="text-subtitle-2 mb-1">{{ t('datenschutz.responsibleTitle') }}</h3>
            <p class="mb-0">Alexander von Trostorff</p>
            <p class="mb-0">Am Köppekreuz 11</p>
            <p class="mb-0">53225 Bonn</p>
            <p class="mb-4">
              <a href="mailto:alexander.von.trostorff@gmail.com">
                alexander.von.trostorff@gmail.com
              </a>
            </p>

            <h3 class="text-subtitle-2 mb-1">{{ t('datenschutz.hostingTitle') }}</h3>
            <p class="mb-4">{{ t('datenschutz.hostingBody') }}</p>

            <h3 class="text-subtitle-2 mb-1">{{ t('datenschutz.noTrackingTitle') }}</h3>
            <p class="mb-4">{{ t('datenschutz.noTrackingBody') }}</p>

            <h3 class="text-subtitle-2 mb-1">{{ t('datenschutz.rightsTitle') }}</h3>
            <p class="mb-4">{{ t('datenschutz.rightsBody') }}</p>

            <h3 class="text-subtitle-2 mb-1">{{ t('datenschutz.complaintTitle') }}</h3>
            <p class="mb-0">{{ t('datenschutz.complaintBody') }}</p>
          </v-card-text>
          <v-card-actions class="px-0 pt-3 pb-0">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-test="datenschutz-back"
              @click="router.push({ name: 'host' })"
            >
              {{ t('datenschutz.back') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
