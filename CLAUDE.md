# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Source of truth

- [SPEC.md](SPEC.md) — product spec, v1.0. Source of truth for product decisions.
- [PLAN.md](PLAN.md) — implementation plan. Each story has explicit **Acceptance criteria** and **Tests** sections. Source of truth for *what to build next* and *how to know it's done*.

If the spec and code disagree, the spec wins — but if something is ambiguous, **ask the user rather than guess**. SPEC.md is a hand-written living doc; treat dropped notes (e.g. "Please make the table whole if you read this...") as messages, not entries.

## How to work — the loop

For any coding task, follow this loop. Don't shortcut it.

1. **Pick a story.** Go to PLAN.md and choose the next unfinished story. Honor milestone order; don't skip ahead. If the user names a specific story, pick that one. State which story you picked in your first message back to the user.
2. **Confirm scope.** Read the story's scope + acceptance criteria + tests. If anything is ambiguous, ask before writing code. Don't widen scope — adjacent improvements go in their own story, not this one.
3. **Implement.** Build only what the story describes. Write the tests listed in the **Tests** section as part of the implementation — not after, not "later". Tests are part of the story, not an optional follow-up.
4. **QA before reporting done.** This is non-negotiable:
   - Run the full test suite (`npm run test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`). All must pass.
   - Walk through each acceptance criterion explicitly and confirm it's met. If a criterion can only be verified by hand on a real device (e.g. Lighthouse audit, iOS Add-to-Home-Screen), say so explicitly and tell the user what to check.
   - If something in the AC list can't be met, **say so out loud** — don't claim done.
5. **Report.** End-of-task summary: which story, what changed, AC checklist results, what (if anything) is left for the user to verify manually. Keep it to a few lines.

Never report a story complete without running tests. Tests passing is the minimum bar; AC verification is the actual bar.

## Hard architectural constraints

These come from the spec and shape almost every implementation decision. Don't propose designs that violate them without flagging the conflict.

- **No backend.** Static site only, deployed to GitHub Pages. All game state lives in the host's browser and in the URL.
- **State transport is the URL.** The generated link encodes player names, settings, a `seed`, and an app+data `version`. The URL has a length limit (~2 KB) and must fit ≤12 players' data — keep encoding compact.
- **Determinism across browsers is critical.** Every player's device independently derives roles and words from `(seed, round)`. RNG calls must happen in the same order on every device; avoid platform-dependent floating point. Desync is the highest-impact bug class.
- **`version` is the desync safety net.** The build-time content hash goes in every generated URL. On boot, every device compares the URL's version to its built-in version. On mismatch: refuse to play (PLAN §0.4). Never silently proceed across versions.
- **PWA must not go stale.** Service worker uses NetworkFirst for the app shell, version-keyed cache for word lists, `skipWaiting + clientsClaim`, and an `update()` call on every visibility change (SPEC §7.2). Aggressive caching that hides updates is forbidden.
- **Player identity = self-claimed firstname.** Host enters unique firstnames (enforced at entry); each player taps their own name on their device. Cross-device duplicate prevention is *not* attempted — it's an IRL concern.
- **Voting and reveal logistics are mostly out-of-app.** Accusation / voting happens IRL by hand gesture. The app only needs *Reveal imposter*. No scoring, no history, no persistence.
- **Round counter must be unmistakable.** Persistently visible in a corner; round transitions animated (and respect `prefers-reduced-motion`).

## Target environment

- Modern mobile browsers (Android Chrome, iOS Safari). Desktop is not the target but should not break.
- German and English UI (i18n required from the start, not retrofitted).
- Big touch targets, mobile-first layout, no scrolling on common viewports.

## Tech stack

Decided in SPEC §7.2:

- **Framework:** Vue 3 + Vite + TypeScript.
- **UI:** Vuetify + Material Design Icons.
- **i18n:** `vue-i18n`.
- **PWA:** `vite-plugin-pwa` (Workbox).
- **Tests:** Vitest (unit + component), Playwright (E2E on Chromium + WebKit).
- **QR:** small client-side QR lib, picked during story 2.4.

## Content

Word lists are static JSON files shipped with the site, LLM-generated, target ~few thousand entries per language. Schema: `{ word, hint, difficulty }`. Adding content = editing the JSON files. Load lazily — don't bloat the initial bundle.

## Deployment

GitHub Pages. **The user deploys, not the agent.** Don't run deploy commands or push to `gh-pages`. Build output must be static files suitable for GH Pages, with Vite `base` set to the repo subpath.

## When SPEC.md and code disagree

SPEC.md is a living doc the user fills out by hand. If something is ambiguous or contradicts existing code, ask rather than guess.
