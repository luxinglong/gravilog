const { test, expect } = require('@playwright/test');

test('loads the editor shell without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/index.html');
  await expect(page).toHaveTitle('Gravilog');
  await expect(page.locator('#doc')).toBeVisible();
  await expect(page.locator('#mountGate')).toBeVisible();
  expect(errors).toEqual([]);
});
