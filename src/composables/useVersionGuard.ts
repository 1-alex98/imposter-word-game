import { computed } from 'vue';
import { useGameSession } from './useGameSession';

export function compareVersions(urlVersion: string | undefined, builtIn: string): boolean {
  if (!urlVersion) return true; // no URL state yet (host setup) — fine.
  return urlVersion === builtIn;
}

export function useVersionGuard() {
  const { state } = useGameSession();
  const mismatch = computed(() => !compareVersions(state.value?.version, __APP_VERSION__));
  return { mismatch };
}
