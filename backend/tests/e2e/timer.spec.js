import { test, expect } from '@playwright/test';

test.describe('Smart Pomodoro Timer Full Cycle E2E Flow', () => {
  const testEmail = 'e2e-tester@example.com';
  const testPassword = 'testPassword';
  const taskTitle = `E2E Pomodoro Task ${Date.now()}`;

  test('should execute full pomodoro cycle: add task, close menu, select task, click start session, and run intervals', async ({ page }) => {
    // 1. Log in with the static test user account
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
      page.click('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")'),
    ]);
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

    // 1.5. If a timer is already running on load, click pause or reset
    const stopOrPauseBtn = page.locator('.pomodoro-pause-button, button:has-text("Pause"), button:has-text("Reset")');
    if (await stopOrPauseBtn.isVisible()) {
      await stopOrPauseBtn.click();
    }

    // 2. Open the task manager panel
    const taskTriggerBtn = page.locator('button.settings-task-trigger');
    await expect(taskTriggerBtn).toBeVisible();
    await taskTriggerBtn.click();

    // 3. Add a new task
    const taskInput = page.locator('#new-task-title');
    await expect(taskInput).toBeVisible();
    await taskInput.fill(taskTitle);
    
    const addTaskBtn = page.locator('button.task-manager-add-button');
    await addTaskBtn.click();
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();

    // 4. Close the task menu before selecting the task
    await taskTriggerBtn.click();

    // 5. Select the newly created task for the Pomodoro timer session from the main view
    const taskSelector = page.locator('.pomodoro-task-select, select[name="taskId"], .task-dropdown');
    if (await taskSelector.isVisible()) {
      await taskSelector.selectOption({ label: taskTitle });
    } else {
      await page.locator(`text=${taskTitle}`).first().click();
    }

    // 6. Click the Start Session / Start Timer button to initialize the session
    const startSessionBtn = page.locator('button.pomodoro-start-session, button:has-text("Start Session"), button:has-text("Begin")');
    if (await startSessionBtn.isVisible()) {
      await startSessionBtn.click();
    }

    // Helper function to run a session phase for a few seconds, then stop/complete
    const runPhase = async (phaseName) => {
      const startButton = page.locator('button.timer-start, .pomodoro-start-button, button:has-text("Start")');
      if (await startButton.isVisible()) {
        await startButton.click();
      }

      // Let it run for a brief moment to verify active state
      await page.waitForTimeout(2000);

      // Using strict class-based selectors to avoid matching tabs (e.g. 'Completed' tab)
      const stopButton = page.locator('button.timer-stop, .pomodoro-stop-button, button.pomodoro-complete-button');
      if (await stopButton.isVisible()) {
        const [res] = await Promise.all([
          page.waitForResponse(res => (res.url().includes('/api/timer/complete') || res.url().includes('/api/timer/reset')) && res.status() === 200),
          stopButton.click(),
        ]);
        expect(res.ok()).toBeTruthy();
      }
      await page.waitForTimeout(1000);
    };

    // Spy on HTML5 Audio for notification chimes
    await page.evaluate(() => {
      window.__audioPlayed = false;
      const originalPlay = HTMLAudioElement.prototype.play;
      HTMLAudioElement.prototype.play = function () {
        window.__audioPlayed = true;
        return originalPlay.apply(this, arguments);
      };
    });

    // Cycle 1: 25 min Study -> 5 min Break
    await runPhase('Study 1');
    await runPhase('Break 1');

    // Cycle 2: 25 min Study -> 5 min Break
    await runPhase('Study 2');
    await runPhase('Break 2');

    // Cycle 3: 25 min Study -> 5 min Break
    await runPhase('Study 3');
    await runPhase('Break 3');

    // Cycle 4: 25 min Study -> 5 min Break
    await runPhase('Study 4');
    await runPhase('Break 4');

    // Final Cycle: 25 min Study -> 15 min Long Break
    await runPhase('Study Final');
    await runPhase('Long Break');

    // Verify notification chime was triggered during transitions
    const audioPlayed = await page.evaluate(() => window.__audioPlayed);
    expect(audioPlayed).toBeTruthy();
  });
});