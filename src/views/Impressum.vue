<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <v-container class="pa-2" data-test="impressum">
    <v-row justify="center" no-gutters>
      <v-col cols="12" md="8">
        <v-card class="pa-3">
          <v-card-title class="pa-0">{{ t('impressum.title') }}</v-card-title>
          <v-card-text class="px-0 pt-2 pb-0">
            <p class="text-medium-emphasis mb-2">{{ t('impressum.provider') }}</p>
            <p class="mb-0">Alexander von Trostorff</p>
            <p class="mb-0">Am Köppekreuz 11</p>
            <p class="mb-3">53225 Bonn</p>

            <p class="text-medium-emphasis mb-1">{{ t('impressum.contact') }}</p>
            <p class="mb-0">
              <a href="mailto:alexander.von.trostorff@gmail.com">
                alexander.von.trostorff@gmail.com
              </a>
            </p>
          </v-card-text>
          <v-card-actions class="px-0 pt-3 pb-0">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-test="impressum-back"
              @click="router.push({ name: 'host' })"
            >
              {{ t('impressum.back') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
