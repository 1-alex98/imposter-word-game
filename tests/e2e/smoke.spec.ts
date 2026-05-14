import { test, expect } from '@playwright/test';

test('host setup page renders', async ({ page }) => {
  await page.goto('/imposter-word-game/');
  await expect(page.getByTestId('host-setup')).toBeVisible();
});

test('host can generate a link, lands on player view', async ({ page }) => {
  await page.goto('/imposter-word-game/');
  const names = ['Anna', 'Björn', 'Carl', 'Dora'];
  for (let i = 0; i < names.length; i++) {
    await page.getByTestId(`name-input-${i}`).locator('input').fill(names[i]);
  }
  await page.getByTestId('generate').click();
  await expect(page.getByTestId('player-view')).toBeVisible();
  await expect(page).toHaveURL(/\?g=/);
});

test('copy-link button copies the generated URL', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permission only stable on Chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/imposter-word-game/');

  const names = ['Anna', 'Björn', 'Carl', 'Dora'];
  for (let i = 0; i < names.length; i++) {
    await page.getByTestId(`name-input-${i}`).locator('input').fill(names[i]);
  }
  await page.getByTestId('generate').click();
  await expect(page.getByTestId('share-controls')).toBeVisible();

  const url = page.url();
  await page.getByTestId('copy-link').click();
  await expect(page.getByTestId('copy-success')).toBeVisible();
  const fromClipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(fromClipboard).toBe(url);
});

test('language selection round-trips through URL and applies before player view', async ({
  page,
}) => {
  await page.goto('/imposter-word-game/');

  // Select German via the language picker — Vuetify v-select uses a list overlay.
  await page.getByTestId('lang-select').click();
  await page.getByRole('option', { name: 'Deutsch' }).click();

  const names = ['Anna', 'Björn', 'Carl', 'Dora'];
  for (let i = 0; i < names.length; i++) {
    await page.getByTestId(`name-input-${i}`).locator('input').fill(names[i]);
  }
  await page.getByTestId('generate').click();

  await expect(page.getByTestId('player-view')).toBeVisible();
  // German pick-name label confirms locale is in German on the player flow.
  await expect(page.getByText('Tippe deinen Namen')).toBeVisible();

  // Reload via the URL — locale must still be German.
  const url = page.url();
  await page.context().clearCookies();
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(url);
  await expect(page.getByText('Tippe deinen Namen')).toBeVisible();
});

test('mid-game QR action is round-1 only', async ({ page }) => {
  await page.goto('/imposter-word-game/');
  const names = ['Anna', 'Björn', 'Carl', 'Dora'];
  for (let i = 0; i < names.length; i++) {
    await page.getByTestId(`name-input-${i}`).locator('input').fill(names[i]);
  }
  await page.getByTestId('generate').click();
  await page.getByTestId('pick-name-0').click();

  // Round 1 — the action is visible.
  await expect(page.getByTestId('show-qr')).toBeVisible();

  // Drive through reveal → next round to reach round 2.
  await page.getByTestId('show-role').click();
  await page.getByTestId('hide-role').click();
  await page.getByTestId('reveal-imposter').click();
  // Within 60s of the round starting, the reveal is gated by a confirmation dialog.
  await page.getByTestId('reveal-confirm-yes').click();
  await page.getByTestId('next-round').click();

  await expect(page.getByTestId('show-qr')).toHaveCount(0);
});

test('version mismatch is blocking', async ({ page }) => {
  // Hand-craft a URL whose decoded version does not match the build.
  const bad = {
    v: 'totally-bogus-version',
    n: ['A', 'B', 'C', 'D'],
    l: 'en',
    d: 'medium',
    h: 1,
    s: 1,
  };
  const b64 = Buffer.from(JSON.stringify(bad), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await page.goto(`/imposter-word-game/play?g=${b64}`);
  await expect(page.getByTestId('version-mismatch')).toBeVisible();
  await expect(page.getByTestId('player-view')).toHaveCount(0);
});
