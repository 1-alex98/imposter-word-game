// Service-worker lifecycle wiring for SPEC §7.2 / PLAN 5.2.
//
// - registerType: 'autoUpdate' (configured in vite.config.ts) makes vite-plugin-pwa
//   import the SW automatically; here we additionally call registration.update()
//   on every `visibilitychange → visible` so a foregrounded tab grabs the latest
//   bundle before the user even taps anything.
// - When the version-mismatch screen's refresh button fires, we tell any waiting
//   SW to `skipWaiting` *first*, then reload — so the new bundle is served and
//   the version-mismatch guard (story 0.4) won't fire again on the reload.

import { registerSW } from 'virtual:pwa-register';

let waitingWorker: ServiceWorker | null = null;
let registrationRef: ServiceWorkerRegistration | null = null;

export const updateApp = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    registrationRef = registration;
    if (registration.waiting) waitingWorker = registration.waiting;
    registration.addEventListener('updatefound', () => {
      const next = registration.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        if (next.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = next;
        }
      });
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {
            /* update failures are non-fatal — next visibility tick retries */
          });
        }
      });
    }
  },
});

/** Tell any waiting SW to take over, then reload. Used by VersionMismatch's refresh button. */
export async function skipWaitingAndReload(): Promise<void> {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else if (registrationRef?.waiting) {
    registrationRef.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  window.location.reload();
}
