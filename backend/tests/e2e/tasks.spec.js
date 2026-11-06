import { test, expect } from '@playwright/test';

test.describe('Task Management E2E Suite', () => {
  const testEmail = 'e2e-tester@example.com';
  const testPassword = 'testPassword';
  const taskTitle = `E2E Task ${Date.now()}`;
  const taskDescription = 'Automated end-to-end task integration test description.';
  const taskDueDate = '2026-12-31';

  test('should create, view, select, and delete tasks cleanly', async ({ page }) => {
    // 1. Log in with the static test user account
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
      page.click('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")'),
    ]);
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

    // 2. Open the task manager panel
    const taskTriggerBtn = page.locator('button.settings-task-trigger');
    await expect(taskTriggerBtn).toBeVisible();
    await taskTriggerBtn.click();

    // 3. Fill out the task menu: Name (Title), Description, and Calendar Due Date
    const titleInput = page.locator('#new-task-title');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(taskTitle);

    const descriptionInput = page.locator('#new-task-description');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill(taskDescription);
    }

    const dueDateInput = page.locator('#new-task-due-date');
    if (await dueDateInput.isVisible()) {
      await dueDateInput.fill(taskDueDate);
    }

    // 4. Hit the add task button to add it to the task list
    const submitTaskBtn = page.locator('button.task-manager-add-button');
    const [createRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/tasks') && (res.status() === 200 || res.status() === 201)),
      submitTaskBtn.click(),
    ]);
    expect(createRes.ok()).toBeTruthy();

    // 5. Select the add a task button again to close the task menu
    await taskTriggerBtn.click();

    // 6. Select the task in the task list view
    const taskItem = page.locator(`text=${taskTitle}`).first();
    await expect(taskItem).toBeVisible();
    await taskItem.click();

    // 7. Handle native browser confirmation dialog triggered by handleDeleteTask
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    // Strictly scope the delete button to the specific container enclosing *this exact unique task title*
    const exactTaskSpan = page.locator(`text="${taskTitle}"`).first();
    const taskCard = exactTaskSpan.locator('xpath=ancestor::div[contains(@class, "task") or contains(@class, "card") or self::li][1]');
    const deleteBtn = taskCard.locator('button:has-text("Delete"), button.delete, button.task-delete, [aria-label*="Delete"]').first();
    
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    const [deleteRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/tasks/') && res.request().method() === 'DELETE'),
      deleteBtn.click(),
    ]);
    expect(deleteRes.ok()).toBeTruthy();

    // 8. Verify task is successfully removed from the UI
    await expect(page.locator(`text=${taskTitle}`).first()).not.toBeVisible({ timeout: 5000 });
  });
});