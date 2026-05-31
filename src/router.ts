import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HostSetup from './views/HostSetup.vue';
import PlayerView from './views/PlayerView.vue';
import Impressum from './views/Impressum.vue';
import Datenschutz from './views/Datenschutz.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'host', component: HostSetup },
  { path: '/play', name: 'play', component: PlayerView },
  { path: '/impressum', name: 'impressum', component: Impressum },
  { path: '/datenschutz', name: 'datenschutz', component: Datenschutz },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.afterEach(() => {
  // Trigger session reload after route changes that may include a new ?g= payload.
  // (Handled by useGameSession's popstate listener; this is here for SPA navigations.)
});
