// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './backend/tests/e2e', // Directory where the end-to-end tests live
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173', // Update to match your local frontend port
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start the server before running tests
  webServer: {
    command: 'npm --prefix frontend run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});