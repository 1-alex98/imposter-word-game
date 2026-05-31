import { computed, ref, watch } from 'vue';
import { decodeState, type GameState, StateDecodeError } from '@/core/state';

const URL_PARAM = 'g';
const ROUND_PARAM = 'r';

const state = ref<GameState | null>(null);
const decodeError = ref<Error | null>(null);
const chosenName = ref<string | null>(null);
const round = ref<number>(1);
const roleViewedThisSession = ref<boolean>(false);
const roundStartedAt = ref<number>(Date.now());

function storageKey(seed: number, suffix: 'name' | 'roundStartedAt'): string {
  return `imposter:${suffix}:${seed >>> 0}`;
}

// The round lives in the URL (?r=N) rather than sessionStorage so it survives a
// phone lock / tab eviction on mobile — the browser restores the tab's URL, but
// not its sessionStorage. We write it back via history.replaceState (preserving
// vue-router's history.state) to avoid spamming the back-button history.
function writeRoundToUrl(n: number): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(ROUND_PARAM, String(n));
  window.history.replaceState(window.history.state, '', url.toString());
}

function loadFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const payload = params.get(URL_PARAM);
  if (!payload) {
    state.value = null;
    chosenName.value = null;
    round.value = 1;
    return;
  }
  try {
    const decoded = decodeState(payload);
    state.value = decoded;
    decodeError.value = null;
    const stored = window.sessionStorage.getItem(storageKey(decoded.seed, 'name'));
    chosenName.value = stored && decoded.names.includes(stored) ? stored : null;
    const roundParam = params.get(ROUND_PARAM);
    const parsed = roundParam ? parseInt(roundParam, 10) : NaN;
    round.value = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
    const storedStart = window.sessionStorage.getItem(
      storageKey(decoded.seed, 'roundStartedAt'),
    );
    const parsedStart = storedStart ? parseInt(storedStart, 10) : NaN;
    if (Number.isInteger(parsedStart) && parsedStart > 0) {
      roundStartedAt.value = parsedStart;
    } else {
      roundStartedAt.value = Date.now();
      window.sessionStorage.setItem(
        storageKey(decoded.seed, 'roundStartedAt'),
        String(roundStartedAt.value),
      );
    }
    roleViewedThisSession.value = false;
  } catch (e) {
    if (e instanceof StateDecodeError) {
      decodeError.value = e;
      state.value = null;
    } else {
      throw e;
    }
  }
}

if (typeof window !== 'undefined') {
  loadFromUrl();
  window.addEventListener('popstate', () => {
    loadFromUrl();
  });
}

function setChosenName(name: string): void {
  if (!state.value) return;
  chosenName.value = name;
  window.sessionStorage.setItem(storageKey(state.value.seed, 'name'), name);
}

function clearChosenName(): void {
  if (!state.value) return;
  chosenName.value = null;
  window.sessionStorage.removeItem(storageKey(state.value.seed, 'name'));
  roleViewedThisSession.value = false;
}

function setRound(n: number): void {
  if (!state.value) return;
  round.value = n;
  writeRoundToUrl(n);
  roundStartedAt.value = Date.now();
  window.sessionStorage.setItem(
    storageKey(state.value.seed, 'roundStartedAt'),
    String(roundStartedAt.value),
  );
  roleViewedThisSession.value = false;
}

function advanceRound(): void {
  setRound(round.value + 1);
}

function markRoleViewed(): void {
  roleViewedThisSession.value = true;
}

function clearSession(): void {
  if (!state.value) return;
  const seed = state.value.seed;
  window.sessionStorage.removeItem(storageKey(seed, 'name'));
  window.sessionStorage.removeItem(storageKey(seed, 'roundStartedAt'));
  // The round lives in the URL; navigating away from /play (new game) drops it.
  state.value = null;
  chosenName.value = null;
  round.value = 1;
  roleViewedThisSession.value = false;
}

const playerIndex = computed(() => {
  if (!state.value || !chosenName.value) return -1;
  return state.value.names.indexOf(chosenName.value);
});

watch(state, (s) => {
  if (s) {
    // sync vue-i18n locale to the game's locale (set elsewhere via i18n module).
  }
});

export function useGameSession() {
  return {
    state,
    decodeError,
    chosenName,
    playerIndex,
    round,
    roundStartedAt,
    roleViewedThisSession,
    setChosenName,
    clearChosenName,
    setRound,
    advanceRound,
    markRoleViewed,
    clearSession,
    reload: loadFromUrl,
    URL_PARAM,
  };
}
