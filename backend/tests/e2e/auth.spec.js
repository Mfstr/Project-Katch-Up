import { test, expect } from '@playwright/test';

test.describe('Authentication Journey E2E Suite', () => {
  const testEmail = 'e2e-tester@example.com';
  const testPassword = 'testPassword';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should successfully log in with valid credentials and redirect to dashboard', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], #email');
    const passwordInput = page.locator('input[type="password"], #password');

    await expect(emailInput).toBeVisible();
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    const submitBtn = page.locator('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login"), button.auth-submit').first();
    
    const [loginRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
      submitBtn.click(),
    ]);
    
    expect(loginRes.ok()).toBeTruthy();
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
    
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(authToken).toBeTruthy();
  });

  test('should display error when logging in with incorrect password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], #email');
    const passwordInput = page.locator('input[type="password"], #password');

    await emailInput.fill(testEmail);
    await passwordInput.fill('wrongPassword123');

    const submitBtn = page.locator('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login"), button.auth-submit').first();
    
    const [loginRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() >= 400),
      submitBtn.click(),
    ]);

    expect(loginRes.status()).toBeGreaterThanOrEqual(400);

    // Verify error message container appears in the UI
    const errorAlert = page.locator('[role="alert"], .smart-focus-error, .auth-error, .error-message, .error').first();
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });
});