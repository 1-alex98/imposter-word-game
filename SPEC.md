# Imposter Game — Specification

**Version:** 1.0

## 1. Overview

- **Product name:** Imposter word game
- **One-line pitch:** Every body get's a word the imposter does not know the word
- **Target users:** famalies
- **Problem it solves / why build it:** Not wanting to install an app

## 2. Goals & Non-Goals

### Goals

- No backend
- Uses seed in query parameter to sync players randomness
- friendly UX
- Everybody can use there own phone
- deployment on gh pages (for me to do not agent)
- runs on any mobile browser that is half way modern
- Multi language
- For my personal use only make a robots.txt telling google to not index.

### Non-Goals

- backend

## 3. Game Rules

- **Player count (min / max):** 4-12
- **Round structure:** An *app round* = one secret word + one selected imposter. Within a round, players describe the word IRL one at a time — any number of describing passes — only the imposter is bluffing with similar or generic words. Play continues IRL until innocents accuse someone or the imposter decides to guess (both resolved IRL). After the IRL outcome, anyone taps *Reveal imposter* in-app, then *Next round* to advance to a new app round with a freshly chosen imposter and word.
- **How the imposter is chosen:** Random per app round, computed deterministically from `(seed, round number)` so every device picks the same imposter without communication.
- **Word / category mechanic:** Common words, everybody knows
- **Win conditions (innocents / imposter):**Innocents can at any time accuse somebody and choose who they believe is imposter with a simple majority. Imposter wins if the innocents pick wrong or if he guesses the word(either after being voted or at any time before)
- **Voting mechanic:** Not in the app irl with hand guesture.
- **Tie-breaker rules:** Tie means nothing happens
- **Edge cases (disconnects, host leaves, mid-round join):** No backend no disconnects if anybody leave you have to restart the game

## 4. User Stories

- As a **host**, I want to enter the names of the players and maybe some settings if applicable. Then generate a link and share it via WhatsApp Telegram etc. and also have the option to show a QR Code for others to scan. Maybe also joined players could show the QR code then.
- As a **player**, I want to open the host's URL, tap my own firstname, then tap to privately reveal my word/role. The word/role auto-hides after a few seconds (and offers a manual hide button) so a neighbor can't peek. After hiding I see a friendly *have fun playing* screen with a *Reveal imposter* button for when the IRL round ends. I want to be confident I'm on the right round — round number always visible, round transitions animated.
- As a **spectator**, does not exist

## 5. Functional Requirements

### 5.1 Host setup

- Host enters unique firstnames (4–12 players); duplicates blocked at entry.
- Host picks language (default: browser locale; choices: German / English).
- Host picks word difficulty.
- Host toggles *Hints for imposter* on/off.
- Host hits *Generate link* → app produces a compact URL encoding names, settings, and a random seed.
- Sharing UI (UX matters — these are the host's main path forward):
  - **Copy link** button is always present, with a visible confirmation when copied.
  - **Share** button using the Web Share API when the browser / OS supports it (`navigator.share`), so the host gets the native share sheet (WhatsApp, Telegram, AirDrop, …). Hide gracefully when unsupported.
  - **QR code** rendered on screen for in-person scanning.

### 5.2 Game (per player, per app round)

1. Player opens the URL → sees the list of firstnames.
2. Player taps their own firstname.
3. Player taps *Show my word/role*:
   - Innocent → the secret word.
   - Imposter → *You are the imposter* + (if hints enabled) a very generic category hint (*object*, *organic*, *place*, …).
4. Word/role auto-hides after a few seconds; a manual hide button is also visible while shown.
5. After hiding: a friendly *have fun playing* state with a *Reveal imposter* button.
6. Round counter is always visible in a corner; round transitions are animated.

A player can show their own QR code so a not-yet-joined person can scan it — **only during round 1**, since the deterministic imposter math doesn't tolerate mid-game additions.

### 5.3 Voting & reveal

- Accusation and voting happen IRL by hand gesture; the app doesn't tally votes.
- The app exposes a *Reveal imposter* button. Tapping it shows who the imposter was this app round.
- After reveal, *Next round* advances each player to the next app round, independently per device (IRL coordination still required — see round-sync risk in §8).
- A hidden *Start a new game* option (e.g. in a menu) discards the current URL and returns to host setup.

### 5.4 Scoring / round end

Not needed.

### 5.5 Persistence (history, stats)

Not needed

### 5.6 Installability (PWA)

- Ship a web app manifest with icons in standard sizes (including maskable) so the game is *Add to Home Screen* installable on Android and iOS.
- Service worker provides limited offline support (open the URL, play with the cached word list) but **must not become stale**: NetworkFirst caching, auto-update check on visibility, immediate `skipWaiting`. See §7.2 *PWA caching strategy*.

## 6. Non-Functional Requirements

- **Browser & device support:** all mobile
- **Internationalization (i18n):** yes German and English are enough
- **Security & privacy:** no data no risk

## 7. Design

### 7.1 UX / UI

- Big touch targets, big text, mobile-first; works across phone screen sizes.
- Use **Vuetify** (Material Design components for Vue) and Material Design Icons wherever an icon fits.
- **No scrolling** in normal flows — every screen fits a typical mobile viewport. Name selection for up to 12 players uses a grid / wrap layout, not a long list.
- A small *How to play* (`?` icon) opens a popup that briefly explains the game in a few sentences. Reachable from every screen.
- Round counter persistently visible in a top corner; round transitions animate.
- Favicon and app icons (multiple sizes, including maskable) are required, not optional.

### 7.2 Architecture

- **Frontend stack:** Vue 3 + Vite + TypeScript.
- **UI library:** Vuetify (Material Design components for Vue) + Material Design Icons.
- **i18n:** `vue-i18n` (de / en).
- **State:** URL fragment is the source of truth; local component state for ephemeral UI; `sessionStorage` for per-URL name pick. No store library needed at this scale.
- **Version field:** the URL also carries an app+data `version` (injected at build time, e.g. from a content hash of the bundle + word-list files). On boot every device compares it to its built-in version and refuses to play on mismatch (see §8 risks).
- **PWA:** `vite-plugin-pwa` (Workbox under the hood) for manifest + service worker. See caching strategy below.
- **QR:** small client-side QR generator library (specific lib TBD; target ≤ ~10 KB gzipped).
- **Testing:** Vitest (unit + component) and Playwright (E2E, multi-browser).
- **No backend.** Static build output deployed to GitHub Pages.

#### PWA caching strategy (anti-stale)

A stale-cached client is a desync risk (SPEC §8). The service worker must err on the side of freshness, not on the side of aggressive caching:

- **App shell** (HTML / JS / CSS): **NetworkFirst** — always try network; fall back to cache only when offline.
- **Word lists**: NetworkFirst with a **version-keyed cache** (cache name includes the build `version` so old data can't contaminate a newer build).
- Service worker registered with `registerType: 'autoUpdate'`, `skipWaiting: true`, `clientsClaim: true` — a new SW activates immediately on install.
- On every `visibilitychange → visible`, the app calls `registration.update()` to pull a fresh SW in the background.
- Mid-session SW updates do **not** force a reload (would be jarring mid-round); the version-mismatch guard (§8 risks + §0.4 in the plan) catches the cross-device case at the next game boot.

### 7.5 Word / Category Content

- **Source:** static JSON files, LLM-generated. Claude Opus for a small set of seed examples; Claude Haiku for bulk generation (target: a few thousand entries per language).
- **Per-entry shape:** `{ word, hint, difficulty }`:
  - `word` — common, preferably ambiguous noun (e.g. *bank*, *light*, *crane*).
  - `hint` — very generic category the imposter sees when hints are enabled (*object*, *organic*, *place*, *concept*, …).
  - `difficulty` — integer or label; the host's difficulty setting filters which entries are eligible.
- **Languages:** separate German and English lists. The host's language pick selects both UI strings and the active word list (no mixed-language sessions).
- **How to add content:** edit the static JSON files.
- **Loading:** load the relevant language's list lazily (before the first round starts); don't bloat initial page load.

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Desync (different imposter / word on different devices) | HIGH | Breaks the game | Deterministic RNG seeded from URL; avoid platform-dependent floating point; same word-list data version shipped to every device |
| Version mismatch (stale service-worker cache, mid-game redeploy, one device on an older build) | MEDIUM | Subset of desync — RNG / word-list changes between versions silently break agreement | Embed an app+data `version` in the generated URL; at boot every device compares the URL's version to its built-in version; on mismatch, force a service-worker update / hard reload and surface a clear "your game is on a different version, refresh to continue" message instead of letting play continue |
| Wrong-player identification | MEDIUM | Wrong person treated as imposter | Host must enter *unique* firstnames, enforced at entry; first action on each device is tapping your own firstname |
| Player out of sync on round number | MEDIUM | Imposter / word inconsistency at the table | Round counter always visible in top corner; animated round transitions; large round number on the next-round screen |
| URL too long for share targets | MEDIUM | Link can't be shared via some apps | Compact encoding of names + settings + seed; 12-player cap; warn if names balloon the URL |
| Mid-game player addition | LOW | Breaks deterministic imposter math | Disallow new joiners after round 1 begins; QR / share UI only visible during round 1 |
| Word repeats inside one session | LOW | Player annoyance | Derive each round's word from `(seed, round)` with shuffle / skip to avoid recent repeats |
| Browser compatibility on older mobile devices | LOW | App won't run for some users | Stick to widely supported APIs; progressive enhancement; smoke-test on Android Chrome + iOS Safari |
| QR scan fails (lighting, distance) | LOW | New player can't join | Always offer copy-link and system-share as fallbacks |

### 8.1 Explicit non-risks

- **Cheating** is not a concern — players analysing the DOM, reading the URL, or peeking is acceptable; this is a casual social game.

## 9. Open Questions

- QR library: `qrcode-generator` (Kazuhiko Arase, MIT). Pure-JS, ~7 KB unminified / ~3 KB gzipped; produces a module matrix that the app renders to inline SVG (so it scales and themes via CSS). Picked during story 2.4. Decode round-trip in tests uses `jsqr` as a dev dependency only.
- Vuetify theme: **light + dark, system-driven** (`prefers-color-scheme`). Single source-of-truth palette lives in `src/theme.ts` (closed during story 4.1). Accent / primary: Vuetify Material Blue (`#1976d2` light, `#2196f3` dark).
