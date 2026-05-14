import { test, expect } from '@playwright/test';

// Story 4.1 — every screen renders with the expected Vuetify theme colors,
// sampled via getComputedStyle on a primary-coloured element.
// Light: primary #1976d2 → rgb(25, 118, 210). Dark: primary #2196f3 → rgb(33, 150, 243).

const LIGHT_PRIMARY = 'rgb(25, 118, 210)';
const DARK_PRIMARY = 'rgb(33, 150, 243)';

test.describe('Vuetify theme (story 4.1)', () => {
  test.use({ colorScheme: 'light' });

  test('host setup applies light theme primary', async ({ page }) => {
    await page.goto('/imposter-word-game/');
    const generate = page.getByTestId('generate');
    await expect(generate).toBeVisible();
    const bg = await generate.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(LIGHT_PRIMARY);
  });

  test('player view applies light theme primary on share button', async ({ page }) => {
    await page.goto('/imposter-word-game/');
    const names = ['Anna', 'Björn', 'Carl', 'Dora'];
    for (let i = 0; i < names.length; i++) {
      await page.getByTestId(`name-input-${i}`).locator('input').fill(names[i]);
    }
    await page.getByTestId('generate').click();
    await expect(page.getByTestId('player-view')).toBeVisible();
    const copy = page.getByTestId('copy-link').first();
    const bg = await copy.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(LIGHT_PRIMARY);
  });
});

test.describe('Vuetify theme — dark mode (story 4.1)', () => {
  test.use({ colorScheme: 'dark' });

  test('host setup applies dark theme primary when prefers-color-scheme is dark', async ({ page }) => {
    await page.goto('/imposter-word-game/');
    const generate = page.getByTestId('generate');
    await expect(generate).toBeVisible();
    const bg = await generate.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(DARK_PRIMARY);
  });
});
