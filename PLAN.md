# Imposter Game — Implementation Plan

Stories that slice [SPEC.md](SPEC.md) v1.0 into ~1–3 day chunks. Ordered by dependency; milestones group stories into demoable checkpoints. A "walking skeleton" lands at the end of Milestone 1 so the game is playable end-to-end before polish work begins.

Each story has **Acceptance criteria** (what must be true to be done) and **Tests** (what to write — Vitest for unit/component, Playwright for E2E).

## Tech stack (decided — see SPEC §7.2)

- **Framework:** Vue 3 + Vite + TypeScript.
- **UI:** Vuetify + Material Design Icons.
- **i18n:** `vue-i18n` (de / en).
- **PWA:** `vite-plugin-pwa` (manifest + service worker via Workbox), NetworkFirst strategy (SPEC §7.2).
- **Testing:** Vitest (unit + component) and Playwright (E2E on Chromium + WebKit).
- **QR:** small client-side QR lib, picked during 2.4 (target ≤ ~10 KB gzipped).

## Milestone 0 — Foundation

### 0.1 Project scaffolding

`npm create vue@latest` → enable TypeScript + Vitest + ESLint + Prettier. Add Vuetify, `vue-i18n`, `vite-plugin-pwa`, Playwright. Configure Vite `base` for GH Pages subpath (`/imposter_game/`).

**Acceptance criteria:**

- `npm run dev` serves a Vuetify-themed blank page on localhost.
- `npm run build` produces deployable static files in `dist/`.
- `npm run test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint` all pass on the empty project.
- Vite `base` is set for the GH Pages subpath; a placeholder build deployed to GH Pages renders.
- README captures the scripts and the deploy procedure (deploy is user-run, not agent).

**Tests:**

- *Unit (Vitest):* trivial smoke test confirms Vitest is wired up.
- *E2E (Playwright):* one test that loads the placeholder page on Chromium + WebKit and asserts a known element renders.

### 0.2 Deterministic seeded RNG

Pick a seeded PRNG (e.g. mulberry32, sfc32) and wrap it with `rngFor(seed, round)` exposing `pickIndex(arrayLen)` and `pickWithoutReplacement(arr, n)`. Integer-only math; no reliance on `Math.random` or non-integer floats.

**Acceptance criteria:**

- No call to `Math.random` anywhere in the RNG module.
- `rngFor(seed, round)` returns a deterministic sequence; identical for the same inputs across runs.
- `pickIndex` and `pickWithoutReplacement` are exposed and behave as named.
- Cross-browser fixture parity: sequences captured on one engine are bit-equal on the others.

**Tests:**

- *Unit (Vitest):* fixture tests pin known sequences for known `(seed, round)` inputs.
- *Property (Vitest + fast-check or hand-rolled):* for player counts 4–12 and 1000+ random `(seed, round)` samples, the same inputs always pick the same imposter index.
- *E2E (Playwright):* a tiny fixture page runs the RNG in-browser and asserts identical output on Chromium and WebKit (regression guard for engine-specific math drift).

### 0.3 URL state codec

Compact encode/decode of `{ version, names[], lang, difficulty, hintsEnabled, seed }` to a URL fragment / query. `version` injected at build time (content hash of bundle + word-list files, e.g. via Vite `define`).

**Acceptance criteria:**

- Round-trip: `decode(encode(state)) === state` for randomized valid inputs.
- Worst-case payload (12 German firstnames + max settings + seed + version) is measured and documented; total URL stays under 2 KB.
- Malformed input is rejected with a structured error; the app never proceeds with partially decoded state.
- `version` is present in every generated URL and stable for a given build.
- Names preserve Unicode (umlauts, ß) through encode/decode.

**Tests:**

- *Unit (Vitest):* round-trip for hand-crafted edge cases (1-char names, names with umlauts / emoji, max names, min names).
- *Property (Vitest):* 1000+ random valid states encode/decode losslessly.
- *Unit:* malformed input rejection — assert errors thrown for truncated, corrupted, and wrong-schema payloads.
- *Unit:* worst-case size assertion (`expect(encode(worstCase).length).toBeLessThan(2048)`).

### 0.4 Version-mismatch guard

At app boot, compare the URL's `version` to the built-in version. On mismatch, render a blocking screen and refuse to enter game flow.

**Acceptance criteria:**

- On boot, version comparison runs before any game UI is rendered.
- On mismatch, a localized (de / en) full-screen message shows: *"This game was started on a different app version — refresh to continue."*
- The blocking screen has a refresh button; no other navigation is reachable.
- Matching versions pass through silently with no UI noise.
- Once 5.2 lands, the refresh button triggers `skipWaiting` on the service worker before reloading.

**Tests:**

- *Unit (Vitest):* comparator logic.
- *Component (Vitest):* mounting the app with a mismatched version prop renders the blocking screen; matching version renders the game flow.
- *E2E (Playwright):* hand-craft a URL with a wrong `version` → assert blocking screen renders on Chromium + WebKit and the rest of the app is unreachable.

### 0.5 i18n scaffold

Configure `vue-i18n` with `de` and `en` message catalogs. Browser-locale default with manual override.

**Acceptance criteria:**

- Default locale = `navigator.language` if it starts with `de` or `en`, else `en`.
- A locale toggle changes UI strings at runtime without reload.
- Selected locale persists across reloads for the session (`sessionStorage`).
- Missing keys fail loudly in dev (console warning) and fall back to the key name in prod.

**Tests:**

- *Unit (Vitest):* default-locale resolver covers `de`, `de-DE`, `de-AT`, `en`, `en-US`, `fr` (→ en fallback), `undefined`.
- *Component (Vitest):* mounting with each locale renders the corresponding catalog; toggling triggers reactive updates.
- *E2E (Playwright):* reload after locale toggle keeps the selected locale.

## Milestone 1 — Walking skeleton

Goal: a playable end-to-end game with stub word list, no QR, no animations, no Material polish. URL gets manually copied from the address bar across test devices.

### 1.1 Host name entry

Screen to enter 4–12 unique firstnames. Inline duplicate validation.

**Acceptance criteria:**

- UI accepts up to 12 firstname inputs and adapts the layout as the host adds/removes rows.
- Leading/trailing whitespace is trimmed before duplicate and length checks.
- Duplicate detection is case-insensitive and triggers an inline error on the offending field.
- "Generate" is disabled with fewer than 4 valid names or more than 12.
- Empty names are not accepted; an inline error explains why.

**Tests:**

- *Unit (Vitest):* validation function — duplicates, count bounds, whitespace, empty input.
- *Component (Vitest):* typing a duplicate shows the inline error; the *Generate* button enables/disables on every relevant edit.
- *E2E (Playwright):* full name-entry flow lands on a valid generated URL.

### 1.2 Generate link → navigate

Generate-link button encodes current host inputs + a random seed via 0.3 and navigates the host's own tab to the player URL.

**Acceptance criteria:**

- Pressing *Generate link* sets `window.location` to the encoded URL.
- The host immediately sees the player flow (name list) on their own device.
- A fresh setup followed by *Generate link* produces a different seed each time.
- The browser back button returns to host setup with previously entered names preserved.

**Tests:**

- *Unit (Vitest):* seed generator returns different values on consecutive calls.
- *Component (Vitest):* clicking the button triggers navigation with the expected encoded payload (router/location mock).
- *E2E (Playwright):* host fills names → presses generate → lands on a URL whose decoded payload matches inputs; pressing back restores the setup state.

### 1.3 Player name selection

Open URL → see firstnames → tap own → store choice in `sessionStorage` keyed by the URL's seed.

**Acceptance criteria:**

- On URL load, the firstname list is rendered in the order the host entered.
- Tapping a firstname stores `{ seed → chosenName }` in `sessionStorage`.
- Refresh keeps the same firstname selected for that device.
- A "change my name" affordance lets a mis-tap be recovered.
- Cross-device duplicate prevention is *not* attempted — coordination is IRL per SPEC §8.

**Tests:**

- *Component (Vitest):* renders the host's names; tapping writes to `sessionStorage` (mocked).
- *E2E (Playwright):* open URL → tap name → reload → name still selected; tap *change my name* → name list returns.

### 1.4 Word + imposter assignment (logic only)

Pure function `roleFor(playerIndex, seed, round, wordList) → { isImposter, word?, hint? }`.

**Acceptance criteria:**

- For every `(seed, round)` and player count 4–12, exactly one `playerIndex` returns `isImposter: true`.
- All non-imposter `playerIndex` values return the same `word` for the same `(seed, round)`.
- The imposter's result does not include `word`.
- Function is pure — same inputs always produce the same output, no side effects.

**Tests:**

- *Unit (Vitest):* fixture tests pin known role assignments for known inputs.
- *Property (Vitest):* 1000+ random `(seed, round, playerCount ∈ [4,12])` samples, assert both invariants (one imposter, shared word).
- *Unit:* purity check — repeated calls return deep-equal results.

### 1.5 Reveal screen (minimal)

After name pick, tap *Show my word/role* to reveal. Auto-hide after a few seconds. Manual hide button.

**Acceptance criteria:**

- *Show my word/role* button is the only primary action visible before reveal.
- Tapping it shows the role (word for innocent, "you are the imposter" for imposter).
- A manual hide button is visible alongside the revealed content.
- Reveal auto-hides after a configurable delay (default 4 seconds).
- Refreshing the page does not re-reveal automatically; the *Show* button must be tapped again.

**Tests:**

- *Component (Vitest, using fake timers):* tap show → role visible; advance timer → role hidden; tap manual hide → role hidden immediately.
- *Component:* on remount, role starts hidden regardless of prior reveal state.
- *E2E (Playwright):* full reveal-then-hide flow.

### 1.6 Play state + reveal-imposter button

After hiding, player sees a "have fun playing" placeholder with a *Reveal imposter* button.

**Acceptance criteria:**

- After hide, screen shows a localized "have fun playing" message.
- *Reveal imposter* button is always available on this screen.
- Tapping it shows the imposter's firstname for this round.
- All players on the same URL who tap reveal see the same firstname.
- Reveal screen is reachable from the play state but not before the role has been viewed at least once (anti-spoil).

**Tests:**

- *Component (Vitest):* button visible only after role has been viewed; click renders the correct imposter name.
- *E2E (Playwright):* two browser contexts on the same URL both tap reveal → both see the same imposter.

### 1.7 Next round + new game

*Next round* advances local round counter. *Start a new game* (hidden in a menu) returns to host setup.

**Acceptance criteria:**

- *Next round* button is available after imposter reveal.
- Tapping it increments the local round counter and returns to the *Show my word/role* state.
- All devices that independently tap *Next round* arrive at the same imposter and word for round N+1.
- Round counter is stored such that a refresh keeps the player on the same round.
- *Start a new game* lives in an overflow menu and clears per-URL session state before navigating to host setup.

**Tests:**

- *Component (Vitest):* tap next round → round increments → reveal flow re-enters.
- *Component:* tap new game → confirm (if any) → session cleared → router back to setup.
- *E2E (Playwright):* two contexts independently advance to round 2 → both see the same imposter (deterministic agreement across devices).
- *E2E:* refresh mid-round 3 → still on round 3.

### 1.8 Round counter always visible

Persistent round indicator in a top corner of every in-game screen.

**Acceptance criteria:**

- Round number rendered in a top corner on every screen after name pick.
- Indicator updates immediately when *Next round* is tapped.
- Legible at all targeted viewport sizes.

**Tests:**

- *Component (Vitest):* counter renders the current round across each in-game route.
- *E2E (Playwright):* tap next round → counter increments without page reload.

**Milestone 1 demo:** four phones loading one manually-shared URL, each player picks a name, reveals their word, plays a round IRL, taps reveal, advances to round 2.

## Milestone 2 — Real settings & sharing

### 2.1 Settings on host setup

Language picker (default = browser locale), difficulty picker, hints-for-imposter toggle.

**Acceptance criteria:**

- Host setup exposes controls for language, difficulty, and hints toggle.
- Language picker defaults to the i18n scaffold's resolved locale.
- All three settings round-trip through the URL via 0.3.
- Loading a URL applies the host's language to the UI before the name pick screen renders.
- Difficulty setting filters the candidate word pool at selection time.
- Hints toggle controls whether the imposter sees a hint on reveal (verified in 2.5).

**Tests:**

- *Unit (Vitest):* difficulty filter function returns only entries matching the selected tier.
- *Component (Vitest):* each control is two-way bound; values land in the generated URL.
- *E2E (Playwright):* set non-default language → reload via URL → UI is in that language.

### 2.2 Copy link button

Always-visible copy button on the host's generated-link screen.

**Acceptance criteria:**

- Copy button is visible whenever the generated URL is on screen.
- Tapping it calls `navigator.clipboard.writeText` with the full URL.
- A transient confirmation ("copied") is shown for ~1.5s after success.
- If clipboard write fails, the URL is shown selectable as fallback and an error toast appears.

**Tests:**

- *Component (Vitest, mocked clipboard):* tap copy → `writeText` called with the URL; snackbar visible; fade after timer.
- *Component:* mock clipboard rejection → fallback selectable text + error toast.
- *E2E (Playwright, Chromium with clipboard permission granted):* tap copy → read clipboard → equals URL.

### 2.3 Web Share API button

Native share button when supported.

**Acceptance criteria:**

- *Share* button rendered only when `navigator.share` is truthy.
- Tapping it calls `navigator.share({ url, title, text })` with localized title and text.
- Button is absent (not just disabled) on browsers without support.
- User-canceled shares do not produce error messages.

**Tests:**

- *Component (Vitest):* with `navigator.share` mocked → button visible, click invokes mock with expected args.
- *Component:* with `navigator.share` undefined → button not rendered.
- *Component:* mock share rejecting with `AbortError` → no error toast.

### 2.4 QR code on host screen

Render the generated link as a QR code.

**Acceptance criteria:**

- QR code rendered alongside the generated URL on the host's share screen.
- Scanning the QR with a second mobile device opens the same URL.
- QR re-renders when the link changes (host edits names and regenerates).
- QR ≥ ~200×200 CSS px so it scans from across a room.
- QR library bundle impact ≤ ~10 KB gzipped; choice documented in SPEC §9.

**Tests:**

- *Component (Vitest):* QR renders for a given URL; changing the URL prop triggers re-render.
- *Unit (Vitest):* QR encode/decode round-trip (encode → decode via library helper) returns the input URL.
- *Visual (Playwright screenshot, optional):* snapshot of the share screen for regression.

### 2.5 Imposter hint on reveal

Show a generic category hint to the imposter when hints are enabled.

**Acceptance criteria:**

- When hints are enabled and the player is the imposter, the reveal screen shows the entry's `hint`.
- When hints are disabled, no hint is shown to the imposter.
- Innocents never see the hint.
- The hint shown is identical on every device for the same `(seed, round, difficulty)`.

**Tests:**

- *Component (Vitest):* mount with imposter role + hints on → hint visible; imposter role + hints off → no hint; innocent → no hint regardless.
- *Property (Vitest):* deterministic hint selection for `(seed, round, difficulty)` matches across many samples.

### 2.6 Mid-game QR share from a player (round 1 only)

A player can show their own QR code — round 1 only.

**Acceptance criteria:**

- During round 1, every player screen exposes a "show my QR" action.
- The action is removed entirely from round 2 onward.
- The QR encodes the current game URL exactly; scanning it lands a new device on the same game.

**Tests:**

- *Component (Vitest):* round = 1 → QR action present; round ≥ 2 → action absent.
- *E2E (Playwright):* on round 1, open the player QR; in a second context, navigate to the URL the QR encodes → lands on the same game.

### 2.7 Settings & reveal-flow refinements

Small UX corrections found during Milestone 2 review.

**Acceptance criteria:**

- Hints-for-imposter is **off** by default in the host setup screen (was on).
- The mid-game QR dialog (2.6) also exposes copy-link and (when supported) native share controls — i.e. it shares the full `ShareControls` UI, not just the QR.
- After the role has been auto-hidden or manually hidden, the player can re-reveal it (a *Show role again* affordance on the play screen). Re-reveal auto-hides the same way the first reveal does.
- The reveal auto-hide delay is **8 seconds** (was 4). Manual hide still works at any time.
- `Reveal imposter` remains gated on the role having been viewed at least once (anti-spoil, unchanged from 1.6).
- **2.7f:** *Change my name* is only available **before** the player has viewed their role. Once the role has been viewed for this session (`roleViewedThisSession === true`), the affordance is removed — a mis-pick can still be corrected via *Start a new game* in the overflow menu, but a player who has already seen the word can't re-pick a different identity.

**Tests:**

- *Component (Vitest):* host setup mount → hints switch's `model-value` is `false`; generated URL decodes to `hintsEnabled: false`.
- *Component:* show role → auto-hide after 8s (advance fake timers); re-reveal action visible on the play stage and re-enters the reveal stage with the same role.
- *Component:* mid-game QR dialog (round 1) contains the share controls (copy button visible, QR rendered).
- *Component:* *Change my name* visible on pre-reveal stage; absent after the role has been viewed (either via auto-hide or manual hide).
- *E2E (Playwright):* full flow with the new defaults — round survives correctly.

## Milestone 3 — Word content

### 3.1 Word list schema + seed examples

Lock the schema `{ word, hint, difficulty }`. Hand-curate / Opus-generate ~20 examples per language.

**Acceptance criteria:**

- TypeScript type + JSON schema documented in the repo.
- `words.de.seed.json` and `words.en.seed.json` ship with ≥20 entries each, spread across difficulty tiers.
- Reveal screen successfully pulls a word + hint from the seed lists.
- Difficulty filter unit-tested against the seed data.

**Tests:**

- *Unit (Vitest):* every seed entry validates against the schema (`ajv` or hand-rolled).
- *Unit:* difficulty filter returns the expected subset for each tier.
- *Component (Vitest):* reveal screen renders a word fetched from the seed list.

### 3.2 Bulk German word list

Generate a few thousand German entries via Claude Haiku from the Opus seed.

**Acceptance criteria:**

- `words.de.json` ships with N≥2000 entries.
- Entries distributed across difficulty tiers (no tier < 10% or > 70% of entries).
- Spot-check of ≥50 random entries confirms ambiguity, common usage, no offensive content.
- Bulk generation script / prompt committed for reproducibility.

**Tests:**

- *Unit (Vitest):* schema validation passes for every entry in `words.de.json`.
- *Unit:* count assertion (`expect(words.length).toBeGreaterThanOrEqual(2000)`).
- *Unit:* tier-distribution assertion.
- *Unit:* deny-list filter (offensive-words deny list) returns zero matches against the corpus.

### 3.3 Bulk English word list

Same as 3.2 for English.

**Acceptance criteria:**

- `words.en.json` ships with N≥2000 entries.
- Distribution and spot-check criteria as 3.2.

**Tests:**

- Same shape as 3.2 against `words.en.json`.

### 3.4 Lazy-load word list

Load the active language's list on demand, not in the initial bundle.

**Acceptance criteria:**

- Build analysis confirms word data is not in the initial chunk.
- Word list fetch happens after host setup submission and completes before round 1 reveal.
- A brief loading state covers the fetch.
- Fetch failure surfaces a user-visible message and offers retry.

**Tests:**

- *Build assertion (Vitest or a node script):* parse the Vite build output; assert no word data in the main entry chunk.
- *E2E (Playwright):* network log after generating a link shows the word list request happens *after* navigation, not during initial load.
- *E2E:* block the word-list request → user-visible error + retry button.

## Milestone 4 — UX polish

### 4.1 Material Design integration

Adopt Vuetify across all existing screens.

**Acceptance criteria:**

- No raw `<button>` / `<input>` / `<select>` in production screens — all replaced with Vuetify equivalents.
- One theme, one typography scale, one color palette applied app-wide.
- Vuetify theme honors a single source-of-truth config (light / dark per SPEC §9).

**Tests:**

- *Lint (custom ESLint rule or grep-based script in CI):* fail the build if raw `<button>` / `<input>` / `<select>` appear under `src/`.
- *E2E (Playwright):* every screen renders with the expected theme colors (sampled via `getComputedStyle` on key elements).

### 4.2 Material icons where they fit

Audit screens for icon opportunities.

**Acceptance criteria:**

- Icons present on: share, copy, QR, info (how-to-play), back, reveal, next-round, new-game, language picker, settings.
- Icon-only buttons all have an `aria-label`.
- No icon used twice for different actions.

**Tests:**

- *Component (Vitest) / E2E (Playwright):* assertion that each listed action has an icon and an accessible name.
- *Lint:* icon-only `<v-btn>` without `aria-label` fails the build (ESLint rule or component-level test).

### 4.3 No-scroll layouts at common viewports

Every screen fits without scrolling on target mobile sizes.

**Acceptance criteria:**

- Manual test matrix covers 360×640, 390×844, and 430×932 — no vertical scrolling in any normal flow.
- Name pick with 12 names uses a grid/wrap layout and fits the smallest viewport without scrolling.
- Test matrix committed.
- Soft-keyboard exception only on screens with text inputs (host setup), not on game-play screens.

**Tests:**

- *E2E (Playwright, multiple viewport sizes):* on each screen, assert `document.documentElement.scrollHeight <= window.innerHeight`.
- *E2E:* name-pick at 360×640 with 12 names — no scroll.

### 4.4 Round transition animation

Animated round-number change between rounds.

**Acceptance criteria:**

- Tapping *Next round* plays an animation showing the new round number prominently for ~1 second before player flow resumes.
- Animation is skipped or shortened when `prefers-reduced-motion: reduce` is set.
- Animation cannot be missed at arm's length.

**Tests:**

- *Component (Vitest, fake timers):* tap next round → animation overlay visible for the configured duration → resolves to round N+1 screen.
- *E2E (Playwright with `prefers-reduced-motion: reduce`):* overlay duration is shortened or absent.

### 4.5 How-to-play popup

`?` icon → modal with a brief explanation.

**Acceptance criteria:**

- `?` icon visible on every screen.
- Tapping opens a Vuetify dialog with a localized explanation.
- Dialog dismissable by close button, backdrop tap, and Escape key.
- Content translated to both `de` and `en`.

**Tests:**

- *Component (Vitest):* dialog opens, dismisses via each of the three paths.
- *E2E (Playwright):* `?` icon present and functional on every route; content matches active locale.

### 4.6 Favicon + app icons

Generate favicon and the PWA icon set from the source vector at [src/content/favicon.svg](src/content/favicon.svg).

**Acceptance criteria:**

- All raster icons are derived from [src/content/favicon.svg](src/content/favicon.svg) (single source of truth — do not hand-author per-size artwork).
- Favicon (`favicon.ico` + 32×32 + 16×16) committed and visible in browser tab.
- PWA icon set committed: at minimum 192×192, 512×512, and a 512×512 maskable variant.
- All sizes referenced from the PWA manifest (delivered in 5.1).

**Tests:**

- *Build assertion (Vitest or script):* required icon files exist in `dist/`.
- *E2E (Playwright):* `<link rel="icon">` resolves to a 200 response.

## Milestone 5 — PWA & deployment

### 5.1 Web app manifest

Manifest with name, icons (from 4.6), theme color, display, start URL.

**Acceptance criteria:**

- Manifest includes `name`, `short_name`, `icons` (with maskable), `theme_color`, `background_color`, `display: standalone`, `start_url`.
- Lighthouse PWA audit reports installable.
- Chrome on Android offers *Add to Home Screen*.
- iOS Safari accepts the manifest icon when added to home screen.

**Tests:**

- *Unit (Vitest):* manifest validates against a JSON schema (or `web-app-manifest` validator).
- *E2E (Playwright):* fetch `/manifest.webmanifest`, assert required fields present and icon URLs return 200.
- *Manual:* Lighthouse PWA audit on a built artifact; documented in the test matrix.

### 5.2 Service worker — fresh-first caching

Implement the SPEC §7.2 caching strategy: NetworkFirst for app shell, version-keyed cache for word lists, auto-update on visibility, immediate `skipWaiting` + `clientsClaim`.

**Acceptance criteria:**

- `vite-plugin-pwa` configured with `registerType: 'autoUpdate'`, `skipWaiting: true`, `clientsClaim: true`.
- App shell registered as NetworkFirst (no `CacheFirst` on HTML/JS/CSS).
- Word-list runtime caching key includes the build `version` (separate cache per version).
- `visibilitychange → visible` triggers `registration.update()`.
- After first load with network, going offline still allows opening the URL and playing a full round with the cached word list.
- When a new version is deployed, online clients pick up the new SW within one visibility cycle; offline clients stay on the cached version but the version-mismatch guard (0.4) blocks cross-version play.

**Tests:**

- *Unit (Vitest):* pwa plugin config object asserts the expected strategy / flags.
- *E2E (Playwright, Chromium with service workers):*
  - First load online → reload offline → game still playable end-to-end.
  - Modify served HTML on the test server → reload online → new content served (not the cached version).
  - Simulate a version mismatch (URL `version` differs from served-build version) → boot guard from 0.4 blocks play.
- *Manual:* deploy a known-bad version locally, open on a second device with cached old version, confirm guard fires.

### 5.3 robots.txt

Disallow indexing per SPEC §2.

**Acceptance criteria:**

- `public/robots.txt` ships in `dist/` with `User-agent: *` / `Disallow: /`.
- File reachable at the deployed URL's root.

**Tests:**

- *Build assertion (Vitest or script):* `dist/robots.txt` exists with expected contents.
- *E2E (Playwright):* `GET /robots.txt` against the dev server returns the expected body.

### 5.4 GH Pages deploy (user-driven, not agent)

Hand the build artifact to GH Pages.

**Acceptance criteria:**

- Build artifact deployed to the configured GH Pages target with correct base path.
- Manifest and service worker scopes resolve correctly under the repo subpath.
- Public URL reachable and PWA-installable from a real mobile device.
- Desync + version-mismatch smoke tests pass against the deployed build.

**Tests:**

- *Manual (user):* the smoke tests below run against the deployed URL.
- No automated agent tests for this story — deploy is the user's responsibility.

## Cross-cutting checks (not standalone stories)

Verify at every milestone, especially after changes to RNG, URL codec, or word selection:

- **Desync smoke test** (SPEC §8): two devices on the same URL always agree on imposter + word for every round.
- **Version-mismatch smoke test** (SPEC §8): hand-craft a URL with a wrong `version` and confirm the boot guard blocks play on every targeted browser.
- **Cache-freshness test** (SPEC §7.2): redeploy mid-session and verify that already-loaded clients either pick up the new version or are blocked by the guard — never silently desync.
- **URL size** stays under share-target limits with worst-case names.
- **Browser smoke test**: Android Chrome + iOS Safari.

## Out of scope (per SPEC §2 + §12)

Not part of any story above:

- Backend, persistence, history, stats, scoring.
- In-app voting or imposter guess submission (IRL only).
- Spectator role.
- Languages beyond de / en.
- Host-uploaded custom word lists.
