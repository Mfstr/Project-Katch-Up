// @ts-check
import { test, expect } from '@playwright/test';

test.describe('App E2E Smoke Test', () => {
  test('should load the home page title', async ({ page }) => {
    // Navigate to your local development URL
    await page.goto('/');

    // Check that the page title contains a key term matching your app
    await expect(page).toHaveTitle(/Project Katch-Up|Katch-Up/i);
  });
});