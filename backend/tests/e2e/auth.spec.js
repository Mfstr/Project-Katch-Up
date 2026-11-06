import { test, expect } from '@playwright/test';

test.describe('Authentication Journey E2E Suite', () => {
  const testEmail = 'alex@example.com';
  const testPassword = 'password123';

  test.beforeEach(async ({ page }) => {
    // Navigate using relative path, relying on baseURL in playwright.config.js
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should successfully log in with valid credentials and redirect to dashboard', async ({ page }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    const submitBtn = page.locator('button[type="submit"]');
    
    const [loginRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
      submitBtn.click(),
    ]);
    
    expect(loginRes.ok()).toBeTruthy();
    await page.waitForURL(/\/dashboard$/, { timeout: 10000 });
    
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(authToken).toBeTruthy();
  });

  test('should display error when logging in with incorrect password', async ({ page }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(testEmail);
    await passwordInput.fill('wrongPassword123');

    const submitBtn = page.locator('button[type="submit"]');
    
    const [loginRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() >= 400),
      submitBtn.click(),
    ]);

    expect(loginRes.status()).toBeGreaterThanOrEqual(400);

    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('should successfully navigate and render the registration view', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('#email');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(submitBtn).toHaveText('Create Account');
  });
});