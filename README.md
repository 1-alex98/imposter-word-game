# Imposter Game

Static, no-backend imposter party game. Hosted on GitHub Pages.

## Scripts

- `npm run dev` — local dev server.
- `npm run build` — type-check + production build into `dist/`.
- `npm run preview` — serve the production build locally.
- `npm run test` — run Vitest unit + component tests.
- `npm run test:e2e` — run Playwright tests against the production build (auto-starts `vite preview`).
- `npm run typecheck` — `vue-tsc --noEmit`.
- `npm run lint` — ESLint with zero-warning policy.

## Deploy

GitHub Pages, served under the repo subpath (`/imposter-word-game/`). **Deploy is user-run, not agent-run.**

1. `npm run build`
2. Publish `dist/` to the `gh-pages` branch (e.g. with `gh-pages -d dist` or any preferred tool).

Vite `base` is set to `/imposter-word-game/`; manifest and service-worker scopes resolve under that prefix.

See [SPEC.md](SPEC.md) and [PLAN.md](PLAN.md) for design and roadmap.
