import { test, expect, type Page } from '@playwright/test';

// PLAN 4.3 â€” every screen fits without vertical scrolling on the target viewport matrix.
//
// Soft-keyboard exception (per AC): host setup is allowed to overflow when an input is focused;
// we test it only in its unfocused initial state, not while a name field is active.

const VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
] as const;

async function assertNoVerticalScroll(page: Page, label: string) {
  // Defocus any active element so the soft-keyboard exception doesn't bias the measurement.
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === 'function') el.blur();
  });
  // Give the layout a tick to settle after focus/animation churn.
  await page.waitForTimeout(150);
  const { scrollHeight, innerHeight } = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(scrollHeight, `${label}: ${scrollHeight}px content vs ${innerHeight}px viewport`)
    .toBeLessThanOrEqual(innerHeight);
}

async function fillNames(page: Page, names: string[]) {
  // Add rows as needed until we have enough.
  for (let i = 4; i < names.length; i++) {
    await page.getByTestId('add-player').click();
  }
  for (let i = 0; i < names.length; i++) {
    await page.getByTestId(`name-input-${i}`).locator('input').fill(names[i]);
  }
}

async function generateAndPick(page: Page, names: string[]) {
  await fillNames(page, names);
  await page.getByTestId('generate').click();
  await expect(page.getByTestId('player-view')).toBeVisible();
  await page.getByTestId(`pick-name-0`).click();
  await expect(page.getByTestId('stage-pre-reveal')).toBeVisible();
}

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('host setup fits without scrolling (4 names, no keyboard)', async ({ page }) => {
      await page.goto('/imposter-word-game/');
      await expect(page.getByTestId('host-setup')).toBeVisible();
      await assertNoVerticalScroll(page, `host-setup ${vp.name}`);
    });

    test('name pick fits without scrolling (4 names)', async ({ page }) => {
      await page.goto('/imposter-word-game/');
      await fillNames(page, ['Anna', 'BjÃ¶rn', 'Carl', 'Dora']);
      await page.getByTestId('generate').click();
      await expect(page.getByTestId('pick-card')).toBeVisible();
      await assertNoVerticalScroll(page, `name-pick-4 ${vp.name}`);
    });

    test('in-game pre-reveal fits without scrolling', async ({ page }) => {
      await page.goto('/imposter-word-game/');
      await generateAndPick(page, ['Anna', 'BjÃ¶rn', 'Carl', 'Dora']);
      await assertNoVerticalScroll(page, `pre-reveal ${vp.name}`);
    });

    test('in-game reveal fits without scrolling', async ({ page }) => {
      await page.goto('/imposter-word-game/');
      await generateAndPick(page, ['Anna', 'BjÃ¶rn', 'Carl', 'Dora']);
      await page.getByTestId('show-role').click();
      await expect(page.getByTestId('stage-reveal')).toBeVisible();
      await assertNoVerticalScroll(page, `reveal ${vp.name}`);
    });

    test('in-game play (after hide) fits without scrolling', async ({ page }) => {
      await page.goto('/imposter-word-game/');
      await generateAndPick(page, ['Anna', 'BjÃ¶rn', 'Carl', 'Dora']);
      await page.getByTestId('show-role').click();
      await page.getByTestId('hide-role').click();
      await expect(page.getByTestId('stage-play')).toBeVisible();
      await assertNoVerticalScroll(page, `play ${vp.name}`);
    });
  });
}

test.describe('viewport 360x640 â€” 12 names pick screen', () => {
  // Explicit AC: 12-name pick must fit the smallest viewport without scrolling.
  test.use({ viewport: { width: 360, height: 640 } });

  test('name pick with 12 names fits at 360Ã—640', async ({ page }) => {
    await page.goto('/imposter-word-game/');
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    await fillNames(page, names);
    await page.getByTestId('generate').click();
    await expect(page.getByTestId('pick-card')).toBeVisible();
    await assertNoVerticalScroll(page, 'name-pick-12 360x640');
  });
});
