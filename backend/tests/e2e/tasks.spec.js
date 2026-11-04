import { test, expect } from '@playwright/test';

test.describe('Task Management E2E Flow', () => {
  const testEmail = 'e2e-tester@example.com';
  const testPassword = 'testPassword';
  const taskTitle = `E2E Test Task - ${Date.now()}`;

  test('should allow a user to open task manager, add a task, view it, and delete it', async ({ page }) => {
    // 1. Log in with an existing dedicated test user account
    await page.goto('/login'); // Adjust URL if your login route is different (e.g., '/' or '/signin')
    
    // If your app logs in directly on the home page or a login page, adjust accordingly:
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")');
    }

    // Verify successful redirection to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);

    // 2. Open the task manager panel via the settings trigger button
    await page.click('.settings-task-trigger');

    // Wait for the panel and form to become visible
    const taskInput = page.locator('#new-task-title');
    await expect(taskInput).toBeVisible();

    // 3. Fill out the task details and submit while waiting for the API response
    await taskInput.fill(taskTitle);
    
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/tasks') && (res.status() === 201 || res.status() === 200)),
      page.click('.task-manager-add-button'),
    ]);

    expect(response.ok()).toBeTruthy();

    // 4. Close the task manager panel
    await page.click('.task-manager-close');

    // 5. Verify the task appears in the dashboard task list
    const taskCardTitle = page.locator('.task-card-title', { hasText: taskTitle });
    await expect(taskCardTitle).toBeVisible();

    // 6. Delete the task using the dashboard's delete button
    const taskListItem = page.locator('.task-list-item', { has: taskCardTitle });
    const deleteButton = taskListItem.locator('.task-delete-button');
    await deleteButton.click();

    // 7. Verify the task is successfully removed from the DOM
    await expect(taskCardTitle).not.toBeVisible();
  });
});