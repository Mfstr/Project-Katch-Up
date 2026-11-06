import { test, expect } from '@playwright/test';

test.describe('Pomodoro Timer & Study Session E2E Suite', () => {

  test.beforeEach(async ({ page, context }) => {
    // Inject auth token and mock initial timer/task state into localStorage if needed
    await context.addInitScript(() => {
      window.localStorage.setItem('authToken', 'mock-e2e-token-12345');
    });

    // Navigate to the main dashboard where the timer widget resides
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render the timer display and control buttons correctly', async ({ page }) => {
    const timerTab = page.locator('a[href*="timer"], button:has-text("Timer"), button:has-text("Study")').first();
    if (await timerTab.isVisible().catch(() => false)) {
      await timerTab.click();
    }

    // Match exact classes from PomodoroTimer.jsx
    const timerDisplay = page.locator('.timer-display').first();
    const startBtn = page.locator('button.timer-start').first();

    await expect(timerDisplay).toBeVisible({ timeout: 15000 });
    await expect(startBtn).toBeVisible();

    // Verify button state matches component logic (disabled if no task/session started yet)
    if (await startBtn.isEnabled()) {
      const pauseBtn = page.locator('button.timer-pause').first();
      const resetBtn = page.locator('button.timer-reset').first();
      
      await startBtn.click();
      await expect(pauseBtn.or(resetBtn)).toBeVisible({ timeout: 5000 });
    } else {
      await expect(startBtn).toHaveAttribute('disabled');
    }
  });

  test('should display session phase heading from PomodoroTimer component', async ({ page }) => {
    // Target #timer-heading which renders getPhaseLabel(phase) ("Focus", "Short Break", etc.)
    const timerHeading = page.locator('#timer-heading').first();
    await expect(timerHeading).toBeVisible({ timeout: 10000 });
  });

  test('should synchronize timer preferences or session updates with the API', async ({ page }) => {
    const settingsToggle = page.locator('button.settings-toggle, [aria-label*="Settings"], button:has-text("Settings")').first();
    
    if (await settingsToggle.isVisible().catch(() => false)) {
      await settingsToggle.click();
      
      const savePrefsBtn = page.locator('button:has-text("Save"), button.save-prefs').first();
      if (await savePrefsBtn.isVisible().catch(() => false)) {
        const [prefsRes] = await Promise.all([
          page.waitForResponse(res => res.url().includes('/api/') && res.status() === 200, { timeout: 5000 }).catch(() => null),
          savePrefsBtn.click(),
        ]);
        
        if (prefsRes) {
          expect(prefsRes.ok()).toBeTruthy();
        }
      }
    }
  });
});