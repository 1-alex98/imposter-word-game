<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { skipWaitingAndReload } from '@/pwa';

const { t } = useI18n();

function refresh() {
  void skipWaitingAndReload();
}
</script>

<template>
  <v-container class="fill-height" data-test="version-mismatch">
    <v-row align="center" justify="center">
      <v-col cols="12" md="6">
        <v-card class="pa-6">
          <v-card-title>{{ t('version.title') }}</v-card-title>
          <v-card-text>{{ t('version.message') }}</v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-refresh"
              data-test="version-refresh"
              @click="refresh"
            >
              {{ t('version.refresh') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
