import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import { router } from './router';
import { i18n } from './i18n';
import App from './App.vue';
import { light, dark, preferredThemeName } from './theme';
import './pwa';

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: preferredThemeName(),
    themes: { light, dark },
  },
});

const app = createApp(App);
app.use(router);
app.use(i18n);
app.use(vuetify);
app.mount('#app');
