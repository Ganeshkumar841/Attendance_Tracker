const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const widths = [320, 375, 414, 768, 1024, 1280, 1440, 1920];

test('AttendX shell loads and exposes the sign-in screen', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/AttendX/i);
  await expect(page.locator('#screen-login')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();
  expect(errors, 'browser runtime errors').toEqual([]);
});

test('login screen has no horizontal page overflow at supported widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('#screen-login')).toBeVisible({ timeout: 20_000 });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(dimensions.content, `horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`)
      .toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});

test('initial sign-in state has no axe violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#screen-login')).toBeVisible({ timeout: 20_000 });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map(({ id, impact, description, nodes }) => ({
    id,
    impact,
    description,
    affected: nodes.map(node => node.target)
  }))).toEqual([]);
});

test('unknown paths fall back to the application shell without a browser error', async ({ page }) => {
  const response = await page.goto('/qa-unknown-route-smoke');
  expect(response, 'navigation should return an HTTP response').not.toBeNull();
  expect(response.status()).toBeLessThan(500);
  await expect(page.locator('#screen-login')).toBeVisible({ timeout: 20_000 });
});

test('sign-up tab is reachable without submitting credentials', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#screen-login')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^sign up$/i }).click();
  await expect(page.locator('#auth-card-title')).toContainText(/create an account/i);
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
});
